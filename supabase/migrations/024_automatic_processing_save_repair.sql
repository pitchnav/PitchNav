-- Repair the automatic Motion Lab save path ("Could not save this analysis").
--
-- Root causes found by inspection of the storage/RLS policies against the
-- actual code path in MotionAnalysisStudio.saveAnalysisToDashboard():
--
-- 1. capturePhaseScreenshots() uploads six phase PNGs to the
--    'analysis-assets' bucket using the signed-in user's own browser
--    session. That bucket has only ever granted INSERT/UPDATE to admins
--    (see 003_storage_policies.sql, 015_motion_lab_rls_repair.sql). Athletes
--    running the automatic self-service save (added later, in
--    023_automatic_processing_and_rolling_calendar.sql) were never granted
--    a matching own-folder policy, so every self-service save fails RLS on
--    the very first phase upload, all six phases come back empty, and
--    saveAnalysisToDashboard() throws.
-- 2. enforce_motion_analysis_interval_trigger (012_membership_review_limits.sql)
--    hard-blocks any motion_analyses insert within 14 days of the athlete's
--    last non-exempt analysis, with no awareness of staff/admin processing.
--    The application layer already intends to bypass the cooldown for
--    initialVideo.staffProcessing, but the database trigger still rejects
--    the insert, so an admin retrying a stuck order for an athlete who has
--    any other recent analysis gets the same failure.
-- 3. There is no policy letting an athlete update the status of their own
--    order, so the post-save "status -> in_analysis" update always fails
--    silently for self-service submissions (the order never leaves its
--    prior status). A narrow security-definer function is added instead of
--    a blanket "owners can update their own order" policy, so a customer
--    still cannot rewrite payment or other order fields from the browser.

-- ── analysis-assets: athletes may write to their own folder ──────────────
-- Folder structure used by the app: analysis-assets/{user_id}/motion-lab/...
-- This mirrors the existing own-folder pattern already used for pitch-videos.

drop policy if exists "Athletes can upload their own analysis assets" on storage.objects;
create policy "Athletes can upload their own analysis assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'analysis-assets'
  and auth.uid()::text = (string_to_array(name, '/'))[1]
);

drop policy if exists "Athletes can update their own analysis assets" on storage.objects;
create policy "Athletes can update their own analysis assets"
on storage.objects for update to authenticated
using (bucket_id = 'analysis-assets' and auth.uid()::text = (string_to_array(name, '/'))[1])
with check (bucket_id = 'analysis-assets' and auth.uid()::text = (string_to_array(name, '/'))[1]);

drop policy if exists "Athletes can view their own analysis assets" on storage.objects;
create policy "Athletes can view their own analysis assets"
on storage.objects for select to authenticated
using (bucket_id = 'analysis-assets' and auth.uid()::text = (string_to_array(name, '/'))[1]);

-- ── Staff processing must bypass the 14-day membership cooldown ──────────

create or replace function public.enforce_motion_analysis_interval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if exists (
    select 1 from public.motion_analyses
    where user_id = new.user_id
      and created_at >= now() - interval '14 days'
      and id <> new.id
      and cooldown_exempt = false
  ) then
    raise exception 'Membership allows one analysis every two weeks. Please wait until your next eligible date.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ── Safe, narrow self-service order-status transition ────────────────────
-- Lets an athlete (or admin) advance their own order to 'in_analysis' once
-- automatic processing has produced a saved analysis, without granting a
-- blanket UPDATE policy on public.orders that a customer could otherwise
-- use to rewrite payment or status fields directly from the browser.

create or replace function public.mark_order_in_analysis(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'in_analysis',
      submitted_at = coalesce(submitted_at, now()),
      delivery_estimate_text = 'Motion Lab processing complete. Staff verification will be completed within one business day.'
  where id = target_order_id
    and (user_id = auth.uid() or public.is_admin())
    and status in ('submitted', 'video_quality_review');

  -- Not finding a row is expected once the order has already advanced past
  -- these two statuses (e.g. a concurrent retry); only raise when the order
  -- does not exist or does not belong to the caller at all.
  if not found and not exists (
    select 1 from public.orders
    where id = target_order_id
      and (user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Order not found or access denied';
  end if;
end;
$$;

revoke all on function public.mark_order_in_analysis(uuid) from public;
grant execute on function public.mark_order_in_analysis(uuid) to authenticated;

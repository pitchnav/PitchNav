-- Customer intake may create an unpaid order. Payment, refund and staff fields
-- are written by trusted roles after the corresponding event.
begin;

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders" on public.orders for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.athlete_profiles a
    where a.id = athlete_profile_id and a.user_id = auth.uid()
  )
  and status in ('intake_started', 'awaiting_videos', 'awaiting_payment')
  and payment_confirmed_at is null and refunded_at is null and refund_reason is null
  and stripe_checkout_session_id is null and stripe_payment_intent_id is null
  and amount_paid_cents is null and currency = 'usd'
  and submitted_at is null and completed_at is null
  and analyst_id is null and internal_notes is null and not is_demo
  and follow_up_available_at is null and follow_up_completed_at is null
);

-- Preserve staff order creation and the normal service-role webhook path.
drop policy if exists "Admin can insert orders" on public.orders;
create policy "Admin can insert orders" on public.orders for insert to authenticated
with check (public.is_admin());

create or replace function public.order_accepts_paid_video(owner_id uuid, order_segment text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.user_id = owner_id and o.id::text = order_segment
      and o.payment_confirmed_at is not null and o.refunded_at is null
      and o.status not in ('cancelled', 'refunded')
  );
$$;
revoke all on function public.order_accepts_paid_video(uuid, text) from public;
grant execute on function public.order_accepts_paid_video(uuid, text) to authenticated, service_role;

-- Migration 013 already invokes this on each new video submission.
create or replace function public.require_paid_video_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.order_accepts_paid_video(new.user_id, new.order_id::text) then
    raise exception 'An active paid order is required to save a video.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop policy if exists "Users can update own video submissions" on public.video_submissions;
create policy "Users can update own video submissions" on public.video_submissions for update to authenticated
using (user_id = auth.uid() and public.order_accepts_paid_video(user_id, order_id::text))
with check (user_id = auth.uid() and public.order_accepts_paid_video(user_id, order_id::text));
-- The separate staff management policy from 002 still permits review and corrections.

drop policy if exists "Athletes can upload paid order videos" on storage.objects;
create policy "Athletes can upload paid order videos" on storage.objects for insert to authenticated
with check (
  bucket_id = 'pitch-videos'
  and split_part(name, '/', 1) = auth.uid()::text
  and (
    split_part(name, '/', 2) = 'motion-lab'
    or public.order_accepts_paid_video(auth.uid(), split_part(name, '/', 2))
  )
);
commit;

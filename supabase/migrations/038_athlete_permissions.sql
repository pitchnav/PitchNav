-- Apply atomically. Bucket creation in 003 used ON CONFLICT DO NOTHING.
begin;
update storage.buckets set public = false where id in ('pitch-videos','analysis-assets','radar-screenshots');
-- Preserve the existing size cap and image types; the intake accepts short radar video evidence too.
update storage.buckets set allowed_mime_types = (
  select array_agg(distinct mime) from unnest(coalesce(allowed_mime_types,
    array['image/jpeg','image/png','image/webp','image/heic']) || array['video/mp4','video/quicktime']) as mime
) where id = 'radar-screenshots';

-- Existing athletes and accounts have not authorized either new optional use.
alter table public.athlete_profiles add column if not exists consent_ai_draft boolean not null default false;
-- Earlier publicity wording did not describe public distribution with this specificity.
-- Leave historical flags intact and require a fresh decision before using the current release.
alter table public.athlete_profiles add column if not exists public_permission_version smallint not null default 0;
alter table public.profiles add column if not exists retest_email_opt_in boolean not null default false;
grant update (retest_email_opt_in) on public.profiles to authenticated;

create or replace function public.athlete_intake_eligible(p public.athlete_profiles)
returns boolean language sql stable set search_path = '' as $$
  select p.terms_agreed and p.privacy_agreed
    and p.date_of_birth <= ((now() at time zone 'UTC')::date - interval '13 years')::date
    and (p.date_of_birth <= ((now() at time zone 'UTC')::date - interval '18 years')::date or (
      p.guardian_consented and p.guardian_consented_at is not null
      and coalesce(length(trim(p.guardian_name)), 0) > 0
      and coalesce(p.guardian_email, '') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ));
$$;

create or replace function public.validate_athlete_intake()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.athlete_intake_eligible(new) is not true then
    raise exception 'Complete the age, guardian and required agreement fields before continuing.';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_athlete_intake on public.athlete_profiles;
create trigger validate_athlete_intake before insert or update of date_of_birth, guardian_name,
  guardian_email, guardian_consented, guardian_consented_at, terms_agreed, privacy_agreed, consent_ai_draft,
  public_permission_version, consent_anonymous_clips, consent_athlete_name, consent_testimonial, consent_before_after on public.athlete_profiles
  for each row execute function public.validate_athlete_intake();

-- Only disclose an ID on the signed-in account. Passing no ID selects the most recent eligible profile.
create or replace function public.eligible_athlete_id(target_id uuid default null)
returns uuid language sql stable security invoker set search_path = '' as $$
  select p.id from public.athlete_profiles p
  where p.user_id = (select auth.uid()) and (target_id is null or p.id = target_id)
    and public.athlete_intake_eligible(p)
  order by p.updated_at desc, p.id limit 1;
$$;
revoke all on function public.eligible_athlete_id(uuid) from public;
grant execute on function public.eligible_athlete_id(uuid) to authenticated;

-- The existing permissive owner/role policies still apply. Check data sent outside the wizard too.
drop policy if exists "Athlete intake before saving screens" on public.movement_screen_sessions;
create policy "Athlete intake before saving screens" on public.movement_screen_sessions as restrictive for insert to authenticated
  with check (public.is_admin() or (athlete_profile_id is not null and athlete_profile_id = public.eligible_athlete_id(athlete_profile_id)));
drop policy if exists "Athlete intake before saving motion" on public.motion_analyses;
create policy "Athlete intake before saving motion" on public.motion_analyses as restrictive for insert to authenticated
  with check (public.is_admin() or (athlete_profile_id is not null and athlete_profile_id = public.eligible_athlete_id(athlete_profile_id)));
drop policy if exists "Athlete intake before saving pitch sessions" on public.pitch_data_sessions;
create policy "Athlete intake before saving pitch sessions" on public.pitch_data_sessions as restrictive for insert to authenticated
  with check (public.is_admin() or (athlete_profile_id is not null and athlete_profile_id = public.eligible_athlete_id(athlete_profile_id)));

create or replace function public.eligible_upload_order(target_order text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.orders o where o.id::text = target_order and o.user_id = (select auth.uid())
    and o.payment_confirmed_at is not null and o.refunded_at is null and o.status not in ('cancelled','refunded')
    and o.athlete_profile_id = public.eligible_athlete_id(o.athlete_profile_id));
$$;
revoke all on function public.eligible_upload_order(text) from public;
grant execute on function public.eligible_upload_order(text) to authenticated;

drop policy if exists "Athlete intake before uploading athlete files" on storage.objects;
create policy "Athlete intake before uploading athlete files" on storage.objects as restrictive for insert to authenticated
  with check (public.is_admin() or case
    when bucket_id = 'pitch-videos' and split_part(name, '/', 2) <> 'motion-lab'
      then exists (select 1 from public.orders o where o.id::text = split_part(name, '/', 2)
        and o.user_id = (select auth.uid()) and o.athlete_profile_id = public.eligible_athlete_id(o.athlete_profile_id))
    when bucket_id = 'radar-screenshots' then exists (select 1 from public.athlete_profiles p
      where p.id::text = split_part(name, '/', 2) and p.user_id = (select auth.uid()) and public.athlete_intake_eligible(p))
    when bucket_id in ('pitch-videos','analysis-assets') then public.eligible_athlete_id() is not null
    else true end);
drop policy if exists "Athlete intake before recording an upload" on public.video_submissions;
create policy "Athlete intake before recording an upload" on public.video_submissions as restrictive for insert to authenticated
  with check (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id
    and o.user_id = (select auth.uid()) and o.athlete_profile_id = public.eligible_athlete_id(o.athlete_profile_id)));

-- The athlete can submit only their own eligible order with a saved side-view submission.
-- Existing customers must not be able to overwrite billing or staff-owned status fields.
create or replace function public.submit_uploaded_order(target_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.eligible_upload_order(target_order::text) or not exists (
    select 1 from public.video_submissions v where v.order_id = target_order and v.user_id = auth.uid() and v.angle = 'open_side'
  ) then raise exception 'This order is not eligible for submission.'; end if;
  update public.orders set status = 'submitted', submitted_at = coalesce(submitted_at, now())
    where id = target_order and user_id = auth.uid() and refunded_at is null and status in (
      'awaiting_videos', 'awaiting_payment', 'intake_started', 'additional_video_requested'
    );
end;
$$;
revoke all on function public.submit_uploaded_order(uuid) from public;
grant execute on function public.submit_uploaded_order(uuid) to authenticated;

create or replace function public.request_account_deletion(requested_scope text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null or requested_scope is null or requested_scope not in ('videos','all') then
    raise exception 'Invalid deletion request.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || requested_scope, 0));
  if not exists (select 1 from public.deletion_requests
    where user_id = owner_id and request_type = requested_scope and processed_at is null) then
    insert into public.deletion_requests(user_id, request_type) values (owner_id, requested_scope);
  end if;
end;
$$;
revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;

drop policy if exists "Users can create own deletion requests" on public.deletion_requests;
create policy "Users can create own deletion requests" on public.deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and request_type in ('videos','all') and processed_at is null);

drop policy if exists "Athlete intake before adding velocity evidence" on public.velocity_evidence;
create policy "Athlete intake before adding velocity evidence" on public.velocity_evidence as restrictive for insert to authenticated
  with check (public.is_admin() or athlete_profile_id = public.eligible_athlete_id(athlete_profile_id));

drop policy if exists "Athletes can remove own radar evidence" on storage.objects;
create policy "Athletes can remove own radar evidence" on storage.objects for delete to authenticated using (
  bucket_id = 'radar-screenshots' and split_part(name, '/', 1) = (select auth.uid())::text
);
commit;

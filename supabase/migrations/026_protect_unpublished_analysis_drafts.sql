-- Keep staff-review drafts private until a coach explicitly publishes them.

-- ── Motion analysis publication boundary ────────────────────────────────

drop policy if exists "Athletes view own motion analyses" on public.motion_analyses;
drop policy if exists "Athletes view published motion analyses" on public.motion_analyses;

create policy "Athletes view published motion analyses"
  on public.motion_analyses
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and status = 'published'
    and published_at is not null
  );

drop policy if exists "Athletes create own motion analyses" on public.motion_analyses;

create policy "Athletes create own motion analyses"
  on public.motion_analyses
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = any (array['athlete_draft'::text, 'submitted_for_review'::text])
    and published_at is null
    and reviewed_by is null
    and reviewed_at is null
    and ai_draft_status is null
  );

-- Athletes submit a complete snapshot. Staff or service-role processing owns
-- every later analysis change, including publication.
drop policy if exists "Athletes update own drafts" on public.motion_analyses;

-- ── Training plan publication boundary ─────────────────────────────────

drop policy if exists "Athletes view own plans" on public.training_plans;
drop policy if exists "Athletes view published plans" on public.training_plans;

create policy "Athletes view published plans"
  on public.training_plans
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and published_at is not null
  );

-- This helper lets the insert policy validate an owned unpublished analysis
-- without granting the caller direct SELECT access to that draft.
create or replace function public.owns_motion_analysis(target_analysis_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.motion_analyses analysis
    where analysis.id = target_analysis_id
      and (analysis.user_id = auth.uid() or public.is_admin())
  );
$$;

revoke all on function public.owns_motion_analysis(uuid) from public;
grant execute on function public.owns_motion_analysis(uuid) to authenticated;

drop policy if exists "Athletes create own plans" on public.training_plans;

create policy "Athletes create own plans"
  on public.training_plans
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and published_at is null
    and public.owns_motion_analysis(motion_analysis_id)
  );

-- Published progress is written through update_training_plan_progress().
-- Staff or service-role processing owns every direct plan update.
drop policy if exists "Athletes update own plans" on public.training_plans;
drop policy if exists "Athletes update own unpublished plans" on public.training_plans;

-- ── Safe submission metadata ────────────────────────────────────────────

create or replace function public.get_motion_analysis_submission_state(
  target_order_id uuid
)
returns table (
  analysis_id uuid,
  plan_exists boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    analysis.id as analysis_id,
    exists (
      select 1
      from public.training_plans plan
      where plan.motion_analysis_id = analysis.id
    ) as plan_exists
  from public.motion_analyses analysis
  where analysis.order_id = target_order_id
    and (analysis.user_id = auth.uid() or public.is_admin())
  limit 1;
$$;

revoke all on function public.get_motion_analysis_submission_state(uuid) from public;
grant execute on function public.get_motion_analysis_submission_state(uuid) to authenticated;

create or replace function public.get_recent_motion_analysis_for_cooldown(
  target_user_id uuid,
  cutoff timestamptz
)
returns table (
  analysis_id uuid,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select analysis.id as analysis_id, analysis.created_at
  from public.motion_analyses analysis
  where analysis.user_id = target_user_id
    and (target_user_id = auth.uid() or public.is_admin())
    and analysis.cooldown_exempt = false
    and analysis.created_at >= cutoff
  order by analysis.created_at desc
  limit 1;
$$;

revoke all on function public.get_recent_motion_analysis_for_cooldown(uuid, timestamptz) from public;
grant execute on function public.get_recent_motion_analysis_for_cooldown(uuid, timestamptz) to authenticated;

-- Pitch Nav detailed feedback report and athlete-created calendar plan access.
alter table public.motion_analyses
  add column if not exists category_scores jsonb not null default '[]'::jsonb,
  add column if not exists phase_snapshots jsonb not null default '[]'::jsonb;

grant select, insert, update on public.motion_analyses to authenticated;
grant select, insert, update on public.training_plans to authenticated;

drop policy if exists "Athletes create own plans" on public.training_plans;
create policy "Athletes create own plans"
on public.training_plans for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.motion_analyses analysis
    where analysis.id = motion_analysis_id and analysis.user_id = auth.uid()
  )
);

drop policy if exists "Athletes update own unpublished plans" on public.training_plans;
create policy "Athletes update own unpublished plans"
on public.training_plans for update to authenticated
using (user_id = auth.uid() and published_at is null)
with check (user_id = auth.uid() and published_at is null);

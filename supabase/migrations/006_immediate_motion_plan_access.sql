-- Allow athletes to create and update the immediate training plan generated from
-- their own Motion Lab analysis. Coach/admin publishing remains separately protected.
grant select, insert, update on public.motion_analyses to authenticated;
grant select, insert, update on public.training_plans to authenticated;

drop policy if exists "Athletes create own plans" on public.training_plans;
create policy "Athletes create own plans"
on public.training_plans for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.motion_analyses analysis
    where analysis.id = motion_analysis_id and analysis.user_id = auth.uid()
  )
);

drop policy if exists "Athletes update own unpublished plans" on public.training_plans;
create policy "Athletes update own unpublished plans"
on public.training_plans for update
to authenticated
using (user_id = auth.uid() and published_at is null)
with check (user_id = auth.uid() and published_at is null);

-- Repair Motion Lab write permissions for athlete submissions and staff processing.

grant select, insert, update on public.motion_analyses to authenticated;
grant select, insert, update on public.training_plans to authenticated;

drop policy if exists "Athletes create own plans" on public.training_plans;
create policy "Athletes create own plans"
on public.training_plans for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.motion_analyses analysis
    where analysis.id = motion_analysis_id
      and analysis.user_id = auth.uid()
  )
);

drop policy if exists "Athletes update own plans" on public.training_plans;
create policy "Athletes update own plans"
on public.training_plans for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Staff Motion Lab processing writes generated files under the athlete's folder.
drop policy if exists "Admins can upload athlete pitch videos" on storage.objects;
create policy "Admins can upload athlete pitch videos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pitch-videos'
  and public.is_admin()
);

drop policy if exists "Admins can update athlete pitch videos" on storage.objects;
create policy "Admins can update athlete pitch videos"
on storage.objects for update to authenticated
using (bucket_id = 'pitch-videos' and public.is_admin())
with check (bucket_id = 'pitch-videos' and public.is_admin());

-- Keep the analysis-assets rule explicit for INSERT as some older projects
-- created the original ALL policy without an effective WITH CHECK clause.
drop policy if exists "Admins can insert analysis assets" on storage.objects;
create policy "Admins can insert analysis assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'analysis-assets' and public.is_admin());

drop policy if exists "Admins can update analysis assets" on storage.objects;
create policy "Admins can update analysis assets"
on storage.objects for update to authenticated
using (bucket_id = 'analysis-assets' and public.is_admin())
with check (bucket_id = 'analysis-assets' and public.is_admin());

-- Server-only AI review access. The service role still bypasses RLS, but it
-- also needs PostgreSQL table privileges when tables were created manually.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.motion_analyses to service_role;
grant select on table public.athlete_profiles to service_role;
grant select on table public.profiles to service_role;
grant select on table public.video_submissions to service_role;
grant select, insert, update, delete on table public.training_plans to service_role;


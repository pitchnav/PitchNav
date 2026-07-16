-- Server-only permissions for publishing a staff-verified report.
grant usage on schema public to service_role;
grant select, update on table public.motion_analyses to service_role;
grant select, update on table public.training_plans to service_role;
grant select, update on table public.analysis_reports to service_role;
grant select, update on table public.orders to service_role;
grant insert, select on table public.order_status_history to service_role;
grant select on table public.profiles to service_role;


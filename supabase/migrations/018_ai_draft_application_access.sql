-- Server-only permissions required to apply a staff-verified AI draft.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.analysis_reports to service_role;
grant select, insert, update, delete on table public.scorecard_categories to service_role;
grant select, insert, update, delete on table public.position_screenshots to service_role;
grant select, insert, update on table public.orders to service_role;
grant select, insert on table public.order_status_history to service_role;
grant select, update on table public.motion_analyses to service_role;

-- Grants service_role access to tables touched by two admin server routes
-- that were missing them, discovered live in production:
--
-- 1. /api/admin/ai-mechanics now looks up the drill catalog (added
--    2026-07-24 for cause-specific drill selection) via the admin/
--    service-role client. `drills` had never been granted to service_role
--    in any prior migration, so every "Generate AI coaching draft" call
--    failed with "permission denied for table drills" and — because the
--    route threw the raw Supabase error object instead of an Error
--    instance — that real message was swallowed into a generic
--    "Could not generate AI mechanics draft." with no way to diagnose it.
--    (The generic-message bug itself is fixed in application code, not here.)
--
-- 2. /api/admin/reset-test-order deletes a test order's video_submissions
--    rows directly, and deletes analysis_reports rows, which cascades to
--    assigned_drills. video_submissions only had SELECT granted to
--    service_role (017, 020); assigned_drills had no grant at all.

grant select on table public.drills to service_role;
grant delete on table public.video_submissions to service_role;
grant select, insert, update, delete on table public.assigned_drills to service_role;

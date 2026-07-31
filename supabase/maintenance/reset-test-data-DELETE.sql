-- STEP 2 OF 2 — DESTRUCTIVE. THIS PERMANENTLY DELETES DATA.
--
-- Run the PREVIEW script first and read its output. Once this runs, the
-- athlete records, orders, videos, analyses, reports and training plans are
-- gone and cannot be recovered from inside the app.
--
-- WHAT IS KEPT
--   - Any account with admin rights (so you do not lose your own login).
--   - Your drill library.
--   - Everything about how the product works. This only clears data.
--
-- WHAT IS REMOVED
--   - Every non-admin athlete account and profile.
--   - Every order, video submission, motion analysis, movement screen,
--     training plan and report attached to them.
--
-- BEFORE YOU RUN THIS
--   Take a backup. In Supabase: Database → Backups. If anything on the
--   preview list turns out to have been a real paying customer, a backup is
--   the only way to get it back.
--
-- Everything runs inside one transaction. If any statement fails, nothing is
-- deleted and you can re-run after fixing the problem.

begin;

-- Work out which accounts are being cleared, once, and reuse it throughout.
create temporary table _doomed_users on commit drop as
select id from public.profiles where coalesce(is_admin, false) = false;

-- Safety brake: refuse to run if this would somehow remove every account,
-- which would mean no admin was detected and you would be locked out.
do $$
begin
  if (select count(*) from public.profiles where is_admin = true) = 0 then
    raise exception 'Refusing to run: no admin account found. Set is_admin on your own profile first, or you will lose access.';
  end if;
end $$;

-- Child records first, so nothing is orphaned if a cascade is missing.
delete from public.position_screenshots
  where report_id in (
    select ar.id from public.analysis_reports ar
    join public.orders o on o.id = ar.order_id
    where o.user_id in (select id from _doomed_users)
  );

delete from public.order_status_history
  where order_id in (select id from public.orders where user_id in (select id from _doomed_users));

delete from public.analysis_reports
  where order_id in (select id from public.orders where user_id in (select id from _doomed_users));

delete from public.training_plans where user_id in (select id from _doomed_users);
delete from public.motion_analyses where user_id in (select id from _doomed_users);

delete from public.video_submissions
  where order_id in (select id from public.orders where user_id in (select id from _doomed_users));

delete from public.orders where user_id in (select id from _doomed_users);
delete from public.athlete_profiles where user_id in (select id from _doomed_users);

-- Movement screens only exist once migration 030 has been applied.
do $$
begin
  if to_regclass('public.movement_screen_sessions') is not null then
    delete from public.movement_screen_sessions
      where user_id in (select id from _doomed_users);
  end if;
end $$;

-- Finally the accounts themselves. Deleting the auth user cascades to the
-- matching profile row.
delete from auth.users where id in (select id from _doomed_users);

commit;

-- Confirm the result. Expect only your admin account to remain, and zeros
-- across the board.
select 'remaining profiles' as check, count(*) from public.profiles
union all select 'remaining orders', count(*) from public.orders
union all select 'remaining athlete_profiles', count(*) from public.athlete_profiles
union all select 'remaining motion_analyses', count(*) from public.motion_analyses;

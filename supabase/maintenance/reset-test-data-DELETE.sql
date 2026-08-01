-- STEP 2 OF 2 — DESTRUCTIVE. THIS PERMANENTLY DELETES DATA.
--
-- Full reset for a clean start. Run the PREVIEW script first.
--
-- WHAT IS KEPT
--   - Admin accounts, so you keep your own login and dashboard access.
--   - The drill library.
--   - Scorecard categories and admin settings.
--   - All product configuration. This clears data only.
--
-- WHAT IS REMOVED
--   - ALL athlete data, including any attached to your own admin account.
--     Keeping the login but leaving its old test orders behind would not be
--     the clean slate this is for.
--   - Every non-admin account.
--
-- BEFORE YOU RUN THIS
--   Take a backup: Supabase → Database → Backups. Nothing here is
--   recoverable from inside the app afterwards.
--
-- Everything runs in one transaction. If any statement fails, nothing is
-- deleted and you can safely re-run once the problem is fixed.

begin;

-- Safety brake: refuse to proceed if no admin exists, which would delete
-- every account and lock you out of your own product.
do $$
begin
  if (select count(*) from public.profiles where is_admin = true) = 0 then
    raise exception 'Refusing to run: no admin account found. Set is_admin on your own profile first, or you will lose access.';
  end if;
end $$;

-- Clear every athlete-data table that exists, regardless of which account it
-- belongs to. Skipping tables that are not present keeps this safe to run on
-- a database where some migrations have not been applied.
do $$
declare
  data_tables text[] := array[
    'orders',
    'athlete_profiles',
    'video_submissions',
    'motion_analyses',
    'training_plans',
    'analysis_reports',
    'position_screenshots',
    'order_status_history',
    'movement_screen_sessions',
    'velocity_evidence',
    'velocity_history',
    'assigned_drills',
    'analysis_questions',
    'automatic_velocity_jobs',
    'messages',
    'deletion_requests',
    'email_log'
  ];
  present_tables text[] := '{}';
  table_name text;
begin
  foreach table_name in array data_tables loop
    if to_regclass('public.' || table_name) is not null then
      present_tables := present_tables || ('public.' || table_name);
    end if;
  end loop;

  if array_length(present_tables, 1) > 0 then
    -- CASCADE covers any child table not listed above; RESTART IDENTITY
    -- resets sequences so the fresh start really starts fresh.
    execute 'truncate table ' || array_to_string(present_tables, ', ') || ' restart identity cascade';
  end if;
end $$;

-- Remove every non-admin account. Deleting the auth user cascades to its
-- profile row.
delete from auth.users
where id in (select id from public.profiles where coalesce(is_admin, false) = false);

commit;

-- Confirm. Expect only your admin profile to remain and zeros everywhere else.
select 'remaining profiles (should be your admins only)' as check, count(*) from public.profiles
union all select 'remaining orders', count(*) from public.orders
union all select 'remaining athlete_profiles', count(*) from public.athlete_profiles
union all select 'remaining motion_analyses', count(*) from public.motion_analyses
union all select 'drills kept (should be unchanged)', count(*) from public.drills;

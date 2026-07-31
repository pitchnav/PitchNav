-- STEP 1 OF 2 — PREVIEW ONLY. THIS DELETES NOTHING.
--
-- Run this first. It shows exactly which accounts and orders the cleanup in
-- step 2 would remove, and which it would keep. Read the output before you
-- run anything destructive.
--
-- Anything with admin rights is preserved. Wiping every profile would delete
-- your own login and lock you out of your own admin dashboard.

-- Accounts that would be KEPT (admin access preserved).
select
  'KEEP — admin account' as action,
  p.id,
  p.email,
  p.full_name
from public.profiles p
where p.is_admin = true

union all

-- Accounts that would be DELETED, with everything attached to them.
select
  'DELETE — athlete account' as action,
  p.id,
  p.email,
  p.full_name
from public.profiles p
where coalesce(p.is_admin, false) = false

order by action, email;

-- Orders that would be deleted, including what was paid.
-- Check this list carefully for any real customer payment.
select
  o.id,
  o.status,
  o.amount_paid_cents / 100.0 as amount_paid_dollars,
  o.payment_confirmed_at,
  o.stripe_checkout_session_id,
  ap.athlete_full_name,
  ap.athlete_email,
  p.is_admin as belongs_to_admin_account
from public.orders o
left join public.athlete_profiles ap on ap.id = o.athlete_profile_id
left join public.profiles p on p.id = o.user_id
order by o.created_at;

-- Row counts that would be removed.
select 'orders' as table_name, count(*) from public.orders
union all select 'athlete_profiles', count(*) from public.athlete_profiles
union all select 'video_submissions', count(*) from public.video_submissions
union all select 'motion_analyses', count(*) from public.motion_analyses
union all select 'training_plans', count(*) from public.training_plans
union all select 'analysis_reports', count(*) from public.analysis_reports
union all select 'non-admin profiles', count(*) from public.profiles where coalesce(is_admin, false) = false;

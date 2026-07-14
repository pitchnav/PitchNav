-- =============================================================
-- PitchFrame Row-Level Security Policies
-- Run after 001_initial_schema.sql
-- =============================================================

-- Enable RLS on all tables
alter table public.profiles               enable row level security;
alter table public.athlete_profiles       enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_status_history   enable row level security;
alter table public.video_submissions      enable row level security;
alter table public.analysis_reports       enable row level security;
alter table public.scorecard_categories   enable row level security;
alter table public.position_screenshots   enable row level security;
alter table public.drills                 enable row level security;
alter table public.assigned_drills        enable row level security;
alter table public.messages               enable row level security;
alter table public.email_log              enable row level security;
alter table public.deletion_requests      enable row level security;
alter table public.admin_settings         enable row level security;
alter table public.velocity_history       enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ── profiles ─────────────────────────────────────────────────

create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Service role can insert (for handle_new_user trigger)
create policy "Admin can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- ── athlete_profiles ─────────────────────────────────────────

create policy "Users can view own athlete profiles"
  on public.athlete_profiles for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert own athlete profiles"
  on public.athlete_profiles for insert
  with check (user_id = auth.uid());

create policy "Users can update own athlete profiles"
  on public.athlete_profiles for update
  using (user_id = auth.uid() or public.is_admin());

create policy "Admin can manage all athlete profiles"
  on public.athlete_profiles for all
  using (public.is_admin());

-- ── orders ────────────────────────────────────────────────────

create policy "Users can view own orders"
  on public.orders for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert own orders"
  on public.orders for insert
  with check (user_id = auth.uid());

-- Only service role (webhook) or admin can update orders
create policy "Admin can update orders"
  on public.orders for update
  using (public.is_admin());

create policy "Admin can view all orders"
  on public.orders for select
  using (public.is_admin());

-- ── order_status_history ─────────────────────────────────────

create policy "Users can view status history for own orders"
  on public.order_status_history for select
  using (
    order_id in (select id from public.orders where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Admin can insert status history"
  on public.order_status_history for insert
  with check (public.is_admin());

-- ── video_submissions ────────────────────────────────────────

create policy "Users can view own video submissions"
  on public.video_submissions for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert own video submissions"
  on public.video_submissions for insert
  with check (user_id = auth.uid());

create policy "Users can update own video submissions"
  on public.video_submissions for update
  using (user_id = auth.uid() or public.is_admin());

create policy "Admin can manage all video submissions"
  on public.video_submissions for all
  using (public.is_admin());

-- ── analysis_reports ─────────────────────────────────────────

create policy "Users can view own analysis reports (published only)"
  on public.analysis_reports for select
  using (
    (
      order_id in (select id from public.orders where user_id = auth.uid())
      and published_at is not null
    )
    or public.is_admin()
  );

create policy "Admin can manage all analysis reports"
  on public.analysis_reports for all
  using (public.is_admin());

-- ── scorecard_categories ─────────────────────────────────────

create policy "Users can view scorecard for own published reports"
  on public.scorecard_categories for select
  using (
    report_id in (
      select ar.id from public.analysis_reports ar
      join public.orders o on o.id = ar.order_id
      where o.user_id = auth.uid() and ar.published_at is not null
    )
    or public.is_admin()
  );

create policy "Admin can manage scorecards"
  on public.scorecard_categories for all
  using (public.is_admin());

-- ── position_screenshots ─────────────────────────────────────

create policy "Users can view screenshots for own published reports"
  on public.position_screenshots for select
  using (
    report_id in (
      select ar.id from public.analysis_reports ar
      join public.orders o on o.id = ar.order_id
      where o.user_id = auth.uid() and ar.published_at is not null
    )
    or public.is_admin()
  );

create policy "Admin can manage position screenshots"
  on public.position_screenshots for all
  using (public.is_admin());

-- ── drills ────────────────────────────────────────────────────

-- All authenticated users can view active drills
create policy "Authenticated users can view active drills"
  on public.drills for select
  using (is_active = true or public.is_admin());

create policy "Admin can manage drills"
  on public.drills for all
  using (public.is_admin());

-- ── assigned_drills ──────────────────────────────────────────

create policy "Users can view assigned drills for own published reports"
  on public.assigned_drills for select
  using (
    report_id in (
      select ar.id from public.analysis_reports ar
      join public.orders o on o.id = ar.order_id
      where o.user_id = auth.uid() and ar.published_at is not null
    )
    or public.is_admin()
  );

create policy "Admin can manage assigned drills"
  on public.assigned_drills for all
  using (public.is_admin());

-- ── messages ──────────────────────────────────────────────────

create policy "Users can view messages for own orders"
  on public.messages for select
  using (
    order_id in (select id from public.orders where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Users can insert messages for own orders"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and order_id in (select id from public.orders where user_id = auth.uid())
  );

create policy "Admin can manage all messages"
  on public.messages for all
  using (public.is_admin());

-- ── email_log ─────────────────────────────────────────────────

create policy "Users can view own email log"
  on public.email_log for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Admin can manage email log"
  on public.email_log for all
  using (public.is_admin());

-- ── deletion_requests ─────────────────────────────────────────

create policy "Users can view own deletion requests"
  on public.deletion_requests for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users can create own deletion requests"
  on public.deletion_requests for insert
  with check (user_id = auth.uid());

create policy "Admin can manage deletion requests"
  on public.deletion_requests for all
  using (public.is_admin());

-- ── admin_settings ────────────────────────────────────────────

create policy "Anyone can read admin settings"
  on public.admin_settings for select
  using (true);

create policy "Admin can modify settings"
  on public.admin_settings for all
  using (public.is_admin());

-- ── velocity_history ─────────────────────────────────────────

create policy "Users can view own velocity history"
  on public.velocity_history for select
  using (
    athlete_id in (select id from public.athlete_profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Admin can manage velocity history"
  on public.velocity_history for all
  using (public.is_admin());

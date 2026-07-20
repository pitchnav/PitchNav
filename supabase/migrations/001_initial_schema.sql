-- =============================================================
-- Pitch Nav Initial Database Schema
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────

create type playing_level as enum (
  'middle_school', 'high_school', 'travel', 'college', 'adult_recreational'
);

create type throwing_hand as enum ('right', 'left');

create type velocity_source as enum (
  'pocket_radar', 'stalker', 'rapsodo', 'trackman',
  'stadium_radar', 'coach_provided', 'estimated', 'other'
);

create type order_status as enum (
  'intake_started', 'awaiting_videos', 'awaiting_payment', 'submitted',
  'video_quality_review', 'in_analysis', 'additional_video_requested',
  'report_being_prepared', 'complete', 'follow_up_available',
  'cancelled', 'refunded'
);

create type communication_preference as enum ('email', 'phone', 'text');

create type video_angle as enum ('open_side', 'rear', 'front', 'radar');

create type drill_category as enum (
  'direction', 'rhythm', 'lower_half_sequencing', 'lead_leg_stability',
  'trunk_rotation', 'arm_timing', 'deceleration', 'command',
  'mobility', 'strength_power'
);

create type pitch_position as enum (
  'peak_leg_lift', 'hand_separation', 'lead_foot_contact',
  'max_external_rotation', 'ball_release', 'finish_deceleration'
);

-- ── Profiles (extends Supabase auth.users) ────────────────────

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Athlete Profiles ──────────────────────────────────────────

create table public.athlete_profiles (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,

  -- Contact
  athlete_full_name     text not null,
  athlete_email         text not null,
  phone_number          text,
  date_of_birth         date not null,
  city                  text,
  state                 text,
  communication_pref    communication_preference default 'email',

  -- Guardian (required if under 18)
  guardian_name         text,
  guardian_email        text,
  guardian_consented    boolean not null default false,
  guardian_consented_at timestamptz,

  -- Physical
  height_feet           int,
  height_inches         int,
  weight_lbs            int,
  throwing_hand         throwing_hand,
  primary_position      text,
  school_org            text,
  graduation_year       int,
  playing_level         playing_level,

  -- Velocity
  current_avg_velocity  int,
  current_max_velocity  int,
  goal_velocity         int,
  velocity_source       velocity_source,
  velocity_measured_at  date,
  bullpen_intensity     text,
  pitches_per_week      int,

  -- Pitching profile
  fastball_type         text,
  secondary_pitches     text[],
  years_pitching        int,
  current_coach         text,
  throwing_program      text,
  strength_program      text,
  main_goal             text,
  mechanical_concern    text,
  previous_feedback     text,
  upcoming_deadline     text,

  -- Health screening
  current_pain          boolean,
  recent_pain_30_days   boolean,
  returned_from_injury  boolean,
  medically_cleared     boolean,
  health_notes          text,
  health_flagged        boolean not null default false,

  -- Consent tracking
  terms_agreed          boolean not null default false,
  terms_agreed_at       timestamptz,
  privacy_agreed        boolean not null default false,
  privacy_agreed_at     timestamptz,

  -- Optional consent for marketing / educational use
  consent_anonymous_clips   boolean default false,
  consent_athlete_name      boolean default false,
  consent_testimonial       boolean default false,
  consent_before_after      boolean default false,

  -- Demo flag
  is_demo               boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Orders ────────────────────────────────────────────────────

create table public.orders (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete restrict,
  athlete_profile_id    uuid not null references public.athlete_profiles(id) on delete restrict,

  status                order_status not null default 'intake_started',
  analyst_id            uuid references public.profiles(id),

  -- Payment
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text unique,
  amount_paid_cents           int,
  currency                    text default 'usd',
  payment_confirmed_at        timestamptz,
  refunded_at                 timestamptz,
  refund_reason               text,

  -- Analyst notes (internal, admin-only)
  internal_notes        text,

  -- Delivery wording shown to athlete
  delivery_estimate_text text,

  -- Follow-up
  follow_up_available_at  timestamptz,
  follow_up_completed_at  timestamptz,

  -- Idempotency: prevent duplicate orders from page refreshes
  idempotency_key       text unique,

  -- Demo flag
  is_demo               boolean not null default false,

  submitted_at          timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Order Status History ──────────────────────────────────────

create table public.order_status_history (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  old_status  order_status,
  new_status  order_status not null,
  changed_by  uuid references public.profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

-- ── Video Submissions ─────────────────────────────────────────

create table public.video_submissions (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,

  angle           video_angle not null,
  storage_path    text not null,       -- Supabase storage path (private bucket)
  file_name       text not null,
  file_size_bytes bigint,
  mime_type       text,
  duration_secs   int,
  resolution      text,
  frame_rate      int,
  orientation     text,

  -- Quality review
  quality_approved        boolean,
  quality_reviewed_by     uuid references public.profiles(id),
  quality_reviewed_at     timestamptz,
  quality_rejection_reason text,
  replacement_requested_at timestamptz,

  -- User checklist confirmation
  checklist_confirmed     boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Analysis Reports ──────────────────────────────────────────

create table public.analysis_reports (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null unique references public.orders(id) on delete cascade,
  analyst_id      uuid references public.profiles(id),

  -- Delivery score (sum of six categories, each 1-5)
  delivery_score  int check (delivery_score >= 0 and delivery_score <= 30),

  -- Athlete-facing summary
  three_strengths         text[],
  three_priorities        text[],
  main_focus              text,
  secondary_focuses       text[],
  reviewer_velocity_notes text,
  four_week_plan          text,
  follow_up_recommendation text,

  -- Voice-over video (Supabase storage path)
  voiceover_storage_path  text,
  voiceover_url           text,          -- public or signed URL cache

  -- PDF report (Supabase storage path)
  pdf_storage_path        text,
  pdf_url                 text,

  -- Velocity verification
  verified_velocity       int,
  verified_velocity_source text,

  -- Demo flag
  is_demo                 boolean not null default false,

  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Scorecard Categories ─────────────────────────────────────

create table public.scorecard_categories (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid not null references public.analysis_reports(id) on delete cascade,
  category    text not null,   -- direction, lower_half_sequencing, etc.
  score       int not null check (score >= 1 and score <= 5),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── Position Screenshots ─────────────────────────────────────

create table public.position_screenshots (
  id                  uuid primary key default uuid_generate_v4(),
  report_id           uuid not null references public.analysis_reports(id) on delete cascade,
  position            pitch_position not null,
  storage_path        text,         -- annotated screenshot in Supabase storage
  image_url           text,
  reviewer_notes      text,
  strengths           text,
  development_opportunity text,
  coaching_cue        text,
  estimated_angle     text,         -- 2D angle estimate (labeled as estimate)
  quality_note        text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

-- ── Drill Library ─────────────────────────────────────────────

create table public.drills (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  category            drill_category not null,
  description         text not null,
  what_it_trains      text,
  athlete_type        text,
  sets                int,
  reps                text,
  coaching_cues       text[],
  common_mistakes     text[],
  demo_video_url      text,
  contraindications   text,
  is_active           boolean not null default true,
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Assigned Drills ───────────────────────────────────────────

create table public.assigned_drills (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid not null references public.analysis_reports(id) on delete cascade,
  drill_id    uuid not null references public.drills(id) on delete restrict,
  sort_order  int not null default 0,
  custom_note text,
  created_at  timestamptz not null default now()
);

-- ── Messages (reviewer ↔ athlete) ─────────────────────────────

create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  is_admin    boolean not null default false,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ── Email Log ─────────────────────────────────────────────────

create table public.email_log (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete set null,
  order_id        uuid references public.orders(id) on delete set null,
  resend_id       text,
  template        text not null,
  to_email        text not null,
  subject         text not null,
  sent_at         timestamptz not null default now(),
  error           text
);

-- ── Data Deletion Requests ────────────────────────────────────

create table public.deletion_requests (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  request_type    text not null,    -- 'account', 'videos', 'all'
  notes           text,
  processed_at    timestamptz,
  processed_by    uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- ── Admin Settings ────────────────────────────────────────────

create table public.admin_settings (
  key         text primary key,
  value       text,
  description text,
  updated_at  timestamptz not null default now()
);

-- Seed default settings
insert into public.admin_settings (key, value, description) values
  ('business_name', 'Pitch Nav', 'Business display name'),
  ('contact_email', 'support@pitchnav.com', 'Public support email'),
  ('delivery_estimate_text', 'Your analysis will be delivered within 5–7 business days.', 'Shown to athletes in their dashboard'),
  ('max_weekly_orders', '20', 'Max orders accepted per week (0 = unlimited)'),
  ('video_retention_days', '365', 'How long raw videos are retained after report delivery'),
  ('follow_up_price_cents', '2900', 'Follow-up analysis price in cents'),
  ('instagram_url', '', 'Instagram profile URL'),
  ('twitter_url', '', 'Twitter/X profile URL'),
  ('youtube_url', '', 'YouTube channel URL'),
  ('analysis_available', 'true', 'Whether new submissions are currently accepted')
;

-- ── Velocity History ──────────────────────────────────────────

create table public.velocity_history (
  id              uuid primary key default uuid_generate_v4(),
  athlete_id      uuid not null references public.athlete_profiles(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  velocity_mph    int not null,
  source          velocity_source,
  measured_at     date not null,
  notes           text,
  is_athlete_provided boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────

create index idx_orders_user_id         on public.orders(user_id);
create index idx_orders_status          on public.orders(status);
create index idx_orders_athlete_profile on public.orders(athlete_profile_id);
create index idx_video_submissions_order on public.video_submissions(order_id);
create index idx_analysis_reports_order on public.analysis_reports(order_id);
create index idx_messages_order         on public.messages(order_id);
create index idx_email_log_user         on public.email_log(user_id);
create index idx_status_history_order   on public.order_status_history(order_id);

-- ── Updated-at Trigger ────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger trg_athlete_profiles_updated_at
  before update on public.athlete_profiles
  for each row execute procedure public.handle_updated_at();

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute procedure public.handle_updated_at();

create trigger trg_video_submissions_updated_at
  before update on public.video_submissions
  for each row execute procedure public.handle_updated_at();

create trigger trg_analysis_reports_updated_at
  before update on public.analysis_reports
  for each row execute procedure public.handle_updated_at();

create trigger trg_drills_updated_at
  before update on public.drills
  for each row execute procedure public.handle_updated_at();

-- ── New User Profile Hook ─────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Automatic video-estimated velocity pipeline.
-- Results remain estimates and are never published without staff verification.

create table if not exists public.automatic_velocity_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  video_submission_id uuid not null references public.video_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  athlete_profile_id uuid references public.athlete_profiles(id) on delete set null,
  motion_analysis_id uuid references public.motion_analyses(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued','processing','completed','unavailable','failed')),
  worker_job_id text,
  attempts int not null default 0 check (attempts >= 0),
  detected_playback_fps numeric(8,3),
  declared_capture_fps int,
  effective_capture_fps numeric(8,3),
  width int,
  height int,
  duration_secs numeric(10,3),
  trim_start_secs numeric(10,3),
  trim_end_secs numeric(10,3),
  calibration_detected boolean not null default false,
  calibration_method text,
  calibration_scale_px_per_foot numeric(12,5),
  ball_track_frames int not null default 0,
  estimate_low_mph numeric(6,2),
  estimate_high_mph numeric(6,2),
  estimate_center_mph numeric(6,2),
  confidence text check (confidence in ('High','Moderate','Low','Unavailable')),
  rejection_reason text,
  diagnostics jsonb not null default '{}'::jsonb,
  staff_approved boolean not null default false,
  staff_approved_by uuid references public.profiles(id) on delete set null,
  staff_approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_submission_id)
);

create index if not exists idx_automatic_velocity_jobs_order
  on public.automatic_velocity_jobs(order_id, created_at desc);
create index if not exists idx_automatic_velocity_jobs_status
  on public.automatic_velocity_jobs(status, created_at);
create index if not exists idx_automatic_velocity_jobs_user
  on public.automatic_velocity_jobs(user_id, created_at desc);

alter table public.automatic_velocity_jobs enable row level security;

drop policy if exists "Athletes view own automatic velocity jobs" on public.automatic_velocity_jobs;
create policy "Athletes view own automatic velocity jobs"
on public.automatic_velocity_jobs for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage automatic velocity jobs" on public.automatic_velocity_jobs;
create policy "Admins manage automatic velocity jobs"
on public.automatic_velocity_jobs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to authenticated, service_role;
grant select on table public.automatic_velocity_jobs to authenticated;
grant select, insert, update, delete on table public.automatic_velocity_jobs to service_role;
grant select on table public.orders to service_role;
grant select on table public.video_submissions to service_role;
grant select on table public.athlete_profiles to service_role;
grant select, insert, update on table public.motion_analyses to service_role;

drop trigger if exists trg_automatic_velocity_jobs_updated_at on public.automatic_velocity_jobs;
create trigger trg_automatic_velocity_jobs_updated_at
before update on public.automatic_velocity_jobs
for each row execute procedure public.handle_updated_at();

comment on table public.automatic_velocity_jobs is
  'Server-generated video velocity estimates. Staff approval is required before athlete publication.';


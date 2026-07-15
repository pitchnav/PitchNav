-- Pitch Nav persistent Motion Lab, coach feedback, and training plans
create table if not exists public.motion_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  athlete_profile_id uuid references public.athlete_profiles(id) on delete set null,
  title text not null default 'Motion Lab Analysis',
  status text not null default 'athlete_draft' check (status in ('athlete_draft','submitted_for_review','coach_review','published')),
  source_video_storage_path text,
  rendered_video_storage_path text,
  capture_fps int check (capture_fps in (60,120,240)),
  calibration_passed boolean not null default false,
  velocity_estimate_low numeric(5,1),
  velocity_estimate_high numeric(5,1),
  velocity_confidence text check (velocity_confidence in ('Low','Moderate','High')),
  velocity_assumptions text,
  mechanics_metrics jsonb not null default '{}'::jsonb,
  clip_summary jsonb not null default '{}'::jsonb,
  delivery_score int check (delivery_score between 0 and 30),
  strengths text[] not null default '{}',
  development_priorities text[] not null default '{}',
  coach_feedback text,
  private_coach_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  motion_analysis_id uuid not null references public.motion_analyses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_weeks int not null check (duration_weeks in (4,8)),
  title text not null,
  weeks jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  follow_up_date date,
  coach_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (motion_analysis_id)
);

create index if not exists idx_motion_analyses_user on public.motion_analyses(user_id, created_at desc);
create index if not exists idx_motion_analyses_status on public.motion_analyses(status);
create index if not exists idx_training_plans_user on public.training_plans(user_id);

alter table public.motion_analyses enable row level security;
alter table public.training_plans enable row level security;

create policy "Athletes view own motion analyses" on public.motion_analyses for select using (user_id = auth.uid() or public.is_admin());
create policy "Athletes create own motion analyses" on public.motion_analyses for insert with check (user_id = auth.uid());
create policy "Athletes update own drafts" on public.motion_analyses for update using (user_id = auth.uid() and status in ('athlete_draft','submitted_for_review')) with check (user_id = auth.uid());
create policy "Admins manage motion analyses" on public.motion_analyses for all using (public.is_admin()) with check (public.is_admin());
create policy "Athletes view own plans" on public.training_plans for select using (user_id = auth.uid() or public.is_admin());
create policy "Admins manage plans" on public.training_plans for all using (public.is_admin()) with check (public.is_admin());

create trigger trg_motion_analyses_updated_at before update on public.motion_analyses for each row execute procedure public.handle_updated_at();
create trigger trg_training_plans_updated_at before update on public.training_plans for each row execute procedure public.handle_updated_at();

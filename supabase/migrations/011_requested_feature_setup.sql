-- Athlete questions attached to an individual Motion Lab analysis.
create table if not exists public.analysis_questions (
  id uuid primary key default gen_random_uuid(),
  motion_analysis_id uuid not null references public.motion_analyses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 600),
  analyst_reply text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_analysis_questions_analysis on public.analysis_questions(motion_analysis_id, created_at);
alter table public.analysis_questions enable row level security;
grant select, insert on public.analysis_questions to authenticated;
drop policy if exists "Athletes view own analysis questions" on public.analysis_questions;
create policy "Athletes view own analysis questions" on public.analysis_questions for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Athletes ask analysis questions" on public.analysis_questions;
create policy "Athletes ask analysis questions" on public.analysis_questions for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.motion_analyses a where a.id = motion_analysis_id and a.user_id = auth.uid())
);
drop policy if exists "Admins answer analysis questions" on public.analysis_questions;
create policy "Admins answer analysis questions" on public.analysis_questions for update using (public.is_admin()) with check (public.is_admin());
create table if not exists public.velocity_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  athlete_profile_id uuid not null references public.athlete_profiles(id) on delete cascade,
  storage_path text not null,
  evidence_type text not null check (evidence_type in ('radar_screenshot','radar_video')),
  reported_velocity int,
  reported_source velocity_source,
  verification_label text not null default 'athlete_reported' check (verification_label in ('radar_verified','coach_reported','athlete_reported','video_estimate')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_velocity_evidence_athlete on public.velocity_evidence(athlete_profile_id, created_at desc);
alter table public.velocity_evidence enable row level security;
grant select, insert on public.velocity_evidence to authenticated;
drop policy if exists "Athletes manage own velocity evidence" on public.velocity_evidence;
create policy "Athletes manage own velocity evidence" on public.velocity_evidence for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Athletes upload own velocity evidence" on public.velocity_evidence;
create policy "Athletes upload own velocity evidence" on public.velocity_evidence for insert with check (user_id = auth.uid());
drop policy if exists "Admins verify velocity evidence" on public.velocity_evidence;
create policy "Admins verify velocity evidence" on public.velocity_evidence for update using (public.is_admin()) with check (public.is_admin());
alter table public.training_plans add column if not exists reminder_sent_at timestamptz;

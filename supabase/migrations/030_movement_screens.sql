-- Movement screens: measured physical capacity, separate from the pitch video.
--
-- The mechanics assessment can see WHAT breaks in a delivery but not WHY.
-- Naming a physical cause ("thoracic mobility limitation") from high-speed
-- pitching footage alone is inference, and that inference currently drives the
-- athlete's entire strength and mobility program. These screens replace that
-- guess with a measured number that can be re-measured at each two-week check.
--
-- Each screen is a slow, held position filmed in a plane facing the camera --
-- the one case where single-camera 2D pose estimation is genuinely reliable.
-- Reliability tier is stored per result so a moderate-confidence proxy is
-- never later presented as a hard clinical number.
--
-- These are training-capacity measurements, not a medical examination.

create table if not exists public.movement_screen_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  athlete_profile_id uuid references public.athlete_profiles(id) on delete set null,
  -- Optional link to the delivery analysis this session was captured to explain.
  motion_analysis_id uuid references public.motion_analyses(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','complete')),
  -- One entry per screen per side. Shape is documented in
  -- src/lib/movement-screens.ts (screen_id, side, value, unit, confidence,
  -- classification, reliability, storage_path, problem).
  results jsonb not null default '[]'::jsonb,
  -- Derived roll-up: limitations found, notable asymmetries, unmeasured screens.
  summary jsonb not null default '{}'::jsonb,
  athlete_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_movement_screen_sessions_user
  on public.movement_screen_sessions (user_id, created_at desc);

create index if not exists idx_movement_screen_sessions_analysis
  on public.movement_screen_sessions (motion_analysis_id);

drop trigger if exists trg_movement_screen_sessions_updated_at on public.movement_screen_sessions;
create trigger trg_movement_screen_sessions_updated_at
  before update on public.movement_screen_sessions
  for each row execute function public.handle_updated_at();

alter table public.movement_screen_sessions enable row level security;

-- Athletes may read only their own screens; staff may read all.
drop policy if exists "Athletes view own movement screens" on public.movement_screen_sessions;
create policy "Athletes view own movement screens"
  on public.movement_screen_sessions for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Athletes create own movement screens" on public.movement_screen_sessions;
create policy "Athletes create own movement screens"
  on public.movement_screen_sessions for insert
  with check (user_id = auth.uid());

-- An athlete may keep editing a session while capturing it, but a completed
-- session is a measurement of record and stops being athlete-editable.
drop policy if exists "Athletes update own in-progress movement screens" on public.movement_screen_sessions;
create policy "Athletes update own in-progress movement screens"
  on public.movement_screen_sessions for update
  using (user_id = auth.uid() and status = 'in_progress')
  with check (user_id = auth.uid());

drop policy if exists "Admins manage movement screens" on public.movement_screen_sessions;
create policy "Admins manage movement screens"
  on public.movement_screen_sessions for all
  using (public.is_admin())
  with check (public.is_admin());

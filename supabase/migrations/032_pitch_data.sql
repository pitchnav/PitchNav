-- Pitch data: ball-flight numbers the athlete brings in from a real device.
--
-- Why this exists: decision D-010 removed video-estimated velocity because
-- single-camera error (+/-3-5 mph) is the difference between 88 and 93 to a
-- college coach. That decision stands. This table is the opposite approach --
-- it stores numbers that came off a measuring device the athlete already has
-- access to (TrackMan, Rapsodo) or typed in by hand, and it records WHICH of
-- those it was on every single row's parent session.
--
-- The source is therefore not decoration. A number from a TrackMan unit and a
-- number an athlete typed from memory are different kinds of evidence, and the
-- reviewer has to be able to tell them apart without asking. `source` is NOT
-- NULL and constrained for exactly that reason -- there is no "unknown origin"
-- state, because a number with no known origin should never have been stored.
--
-- Nothing here is derived, inferred or estimated by Pitch Nav. Phone-based
-- tracking (the D-012 velocity track) is unbuilt and blocked on a validation
-- shoot; when it exists it will be a new source value, not a silent backfill
-- of these columns.

create table if not exists public.pitch_data_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  athlete_profile_id uuid references public.athlete_profiles(id) on delete set null,

  -- Where the numbers came from. Constrained, not free text: the athlete-facing
  -- and reviewer-facing source labels are derived from this, so a typo here
  -- would silently mislabel evidence.
  source text not null check (source in ('trackman', 'rapsodo', 'manual')),

  -- The date the pitches were actually thrown, which is not the upload date.
  -- Nullable because a hand-entered pitch may genuinely not have a known date,
  -- and inventing one would be worse than leaving it empty.
  session_date date,

  -- Original upload filename, kept so an athlete can tell two uploads apart.
  file_name text,

  -- Name matched out of the CSV's Pitcher column. A TrackMan export routinely
  -- contains a whole bullpen, so the file alone does not identify the athlete.
  pitcher_name text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pitch_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pitch_data_sessions(id) on delete cascade,

  -- Denormalised from the parent session so row-level security can be enforced
  -- on this table directly, without a subquery on every read.
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- TaggedPitchType in TrackMan exports. Free text because tagging is manual
  -- and inconsistent in the wild ("Fastball", "FF", "Four-Seam"); normalising
  -- is the application's job, and guessing in SQL would lose information.
  pitch_type text,

  -- Every measurement is nullable. A real export has gaps -- a pitch the unit
  -- did not fully track still happened, and dropping the row would quietly
  -- change the athlete's averages.
  rel_speed_mph numeric(5,2),
  spin_rate_rpm numeric(7,2),
  spin_axis_deg numeric(6,2),
  induced_vert_break_in numeric(6,2),
  horz_break_in numeric(6,2),
  rel_height_ft numeric(5,2),
  rel_side_ft numeric(5,2),
  extension_ft numeric(5,2),

  -- Position within the uploaded file, so the original order survives.
  pitch_no integer,

  created_at timestamptz not null default now()
);

create index if not exists idx_pitch_data_sessions_user
  on public.pitch_data_sessions (user_id, session_date desc nulls last, created_at desc);

create index if not exists idx_pitch_data_sessions_athlete
  on public.pitch_data_sessions (athlete_profile_id);

create index if not exists idx_pitch_records_session
  on public.pitch_records (session_id);

create index if not exists idx_pitch_records_user
  on public.pitch_records (user_id);

drop trigger if exists trg_pitch_data_sessions_updated_at on public.pitch_data_sessions;
create trigger trg_pitch_data_sessions_updated_at
  before update on public.pitch_data_sessions
  for each row execute function public.handle_updated_at();

-- ── Row-level security ──────────────────────────────────────────────────────

alter table public.pitch_data_sessions enable row level security;
alter table public.pitch_records enable row level security;

drop policy if exists "Athletes view own pitch sessions" on public.pitch_data_sessions;
create policy "Athletes view own pitch sessions"
  on public.pitch_data_sessions for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Athletes create own pitch sessions" on public.pitch_data_sessions;
create policy "Athletes create own pitch sessions"
  on public.pitch_data_sessions for insert
  with check (user_id = auth.uid());

-- An athlete may delete their own upload (wrong file, wrong pitcher matched).
-- Deliberately no athlete UPDATE policy: a stored measurement is a record of
-- what a device reported. Correcting it means deleting and re-entering, which
-- leaves no silently edited number behind.
drop policy if exists "Athletes delete own pitch sessions" on public.pitch_data_sessions;
create policy "Athletes delete own pitch sessions"
  on public.pitch_data_sessions for delete
  using (user_id = auth.uid());

drop policy if exists "Admins manage pitch sessions" on public.pitch_data_sessions;
create policy "Admins manage pitch sessions"
  on public.pitch_data_sessions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Athletes view own pitch records" on public.pitch_records;
create policy "Athletes view own pitch records"
  on public.pitch_records for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Athletes create own pitch records" on public.pitch_records;
create policy "Athletes create own pitch records"
  on public.pitch_records for insert
  with check (user_id = auth.uid());

drop policy if exists "Athletes delete own pitch records" on public.pitch_records;
create policy "Athletes delete own pitch records"
  on public.pitch_records for delete
  using (user_id = auth.uid());

drop policy if exists "Admins manage pitch records" on public.pitch_records;
create policy "Admins manage pitch records"
  on public.pitch_records for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Table privileges ───────────────────────────────────────────────────────
-- RLS and table GRANTs are separate mechanisms and Postgres checks privileges
-- BEFORE policies. This repository has needed five prior repair migrations for
-- exactly this omission, so the grants are explicit here rather than relying on
-- Supabase defaults.

grant usage on schema public to authenticated, service_role;

grant select, insert, delete on table public.pitch_data_sessions to authenticated;
grant select, insert, delete on table public.pitch_records to authenticated;

grant select, insert, update, delete on table public.pitch_data_sessions to service_role;
grant select, insert, update, delete on table public.pitch_records to service_role;

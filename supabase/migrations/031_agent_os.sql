-- Agentic OS foundation: run history and findings.
--
-- This is the shared substrate every later agent writes into, so it stores
-- no analytics-specific columns. Findings are recomputed on each run rather
-- than resolved in place: a condition that clears simply stops appearing,
-- which avoids a resolution column nothing currently maintains.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'ok' check (status in ('ok','failed')),
  error text,
  findings_count int not null default 0
);

create index if not exists idx_agent_runs_agent_started
  on public.agent_runs (agent, started_at desc);

create table if not exists public.agent_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent text not null,
  severity text not null check (severity in ('info','attention','urgent')),
  title text not null,
  detail text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_findings_run
  on public.agent_findings (run_id);

alter table public.agent_runs enable row level security;
alter table public.agent_findings enable row level security;

-- Staff-only. Athletes never see agent output; the service role writes it.
drop policy if exists "Admins read agent runs" on public.agent_runs;
create policy "Admins read agent runs"
  on public.agent_runs for select
  using (public.is_admin());

drop policy if exists "Admins read agent findings" on public.agent_findings;
create policy "Admins read agent findings"
  on public.agent_findings for select
  using (public.is_admin());

-- Service role table privileges: RLS bypass and table GRANTs are separate
-- mechanisms. The service_role must be granted explicit privileges to write
-- these tables when called from server routes, independent of its RLS-bypass
-- capabilities.
grant usage on schema public to authenticated, service_role;
grant select, insert, update on table public.agent_runs to service_role;
grant insert on table public.agent_findings to service_role;

-- Authenticated role table privileges: Postgres evaluates table-level privileges
-- before RLS policies. The /admin/os screen reads via the authenticated client,
-- and the admin-only RLS policies are unreachable without an explicit SELECT
-- grant on both tables. This may be redundant with Supabase's default privileges,
-- but defensive grants are cheap and prevent permission-denied errors.
grant select on table public.agent_runs to authenticated;
grant select on table public.agent_findings to authenticated;

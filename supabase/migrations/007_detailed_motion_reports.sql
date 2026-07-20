-- Detailed automated video-review report fields.
-- These are coaching estimates and require human confirmation before being
-- represented as final expert-reviewed findings.
alter table public.motion_analyses
  add column if not exists category_scores jsonb not null default '[]'::jsonb,
  add column if not exists phase_snapshots jsonb not null default '[]'::jsonb;

grant select, insert, update on public.motion_analyses to authenticated;

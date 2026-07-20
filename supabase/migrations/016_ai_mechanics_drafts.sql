alter table public.motion_analyses
  add column if not exists biggest_opportunity jsonb,
  add column if not exists ai_draft_status text,
  add column if not exists ai_generated_at timestamptz,
  add column if not exists ai_model text;

create index if not exists idx_motion_analyses_ai_status
  on public.motion_analyses(ai_draft_status, created_at desc);

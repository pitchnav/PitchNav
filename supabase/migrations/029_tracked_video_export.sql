-- A second automatic video export: pose/landmark tracker lines drawn
-- directly over the athlete's real captured footage (same camera framing),
-- distinct from the existing rendered_video_storage_path (the normalized
-- anatomical skeleton on the fixed mound stage). Both are now produced
-- automatically during Motion Lab processing instead of requiring a staff
-- member to manually click a "Download" button mid-session first.

alter table public.motion_analyses
  add column if not exists tracked_video_storage_path text;

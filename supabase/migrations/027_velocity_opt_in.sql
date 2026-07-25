-- Customer opt-in gate for automatic velocity estimation.
--
-- Previously /api/velocity/enqueue queued a worker job for every paid
-- side-view upload unconditionally, with no record of whether the athlete
-- ever placed the required 8x8 Pitch Nav calibration marker. That contradicts
-- the product requirement that automatic velocity estimation only runs when
-- the customer explicitly opts in; every job would otherwise "queue" and
-- then report "marker not confirmed" for athletes who never intended to use
-- the marker at all.

alter table public.video_submissions
  add column if not exists velocity_opt_in boolean not null default false;

comment on column public.video_submissions.velocity_opt_in is
  'Athlete confirmed at upload time that they placed the printed 8x8 inch Pitch Nav calibration marker and wants an automatic video-estimated velocity range. When false, automatic velocity processing is skipped entirely rather than queued and reported unavailable.';

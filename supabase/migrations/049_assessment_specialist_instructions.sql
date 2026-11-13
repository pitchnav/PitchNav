begin;

alter table public.followup_voice_settings
  add column specialist_instructions text check (
    specialist_instructions is null or char_length(specialist_instructions) between 1 and 12000
  ),
  add column specialist_revision timestamptz not null default clock_timestamp();

commit;

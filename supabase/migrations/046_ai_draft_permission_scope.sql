begin;
-- Old grants covered six images and did not cover a delivery overview or intake free text.
alter table public.athlete_profiles
  add column if not exists ai_draft_permission_version smallint not null default 0,
  add column if not exists ai_draft_consented_at timestamptz;

create or replace function public.stamp_ai_draft_permission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.consent_ai_draft is not true or new.ai_draft_permission_version <> 2 then
    new.ai_draft_permission_version := 0;
    new.ai_draft_consented_at := null;
  elsif public.athlete_intake_eligible(new) is not true then
    raise exception 'Current intake and guardian permissions are required for AI drafting';
  elsif tg_op = 'INSERT' then
    new.ai_draft_consented_at := now();
  elsif old.ai_draft_permission_version is distinct from 2 or old.consent_ai_draft is not true then
    new.ai_draft_consented_at := now();
  else
    new.ai_draft_consented_at := old.ai_draft_consented_at;
  end if;
  return new;
end;
$$;
drop trigger if exists stamp_ai_draft_permission on public.athlete_profiles;
create trigger stamp_ai_draft_permission
  before insert or update of consent_ai_draft, ai_draft_permission_version, ai_draft_consented_at
  on public.athlete_profiles for each row execute function public.stamp_ai_draft_permission();
commit;

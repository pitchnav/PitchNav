-- Pitch Nav membership: owner approval and one Motion Lab submission every 14 days.
create or replace function public.enforce_motion_analysis_interval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.motion_analyses
    where user_id = new.user_id
      and created_at >= now() - interval '14 days'
      and id <> new.id
  ) then
    raise exception 'Membership allows one analysis every two weeks. Please wait until your next eligible date.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_motion_analysis_interval_trigger on public.motion_analyses;
create trigger enforce_motion_analysis_interval_trigger
before insert on public.motion_analyses
for each row execute function public.enforce_motion_analysis_interval();

alter table public.training_plans alter column duration_weeks set default 8;
insert into public.admin_settings (key, value, description)
values
  ('membership_price_cents', '2500', 'Monthly Pitch Nav membership price in cents'),
  ('analysis_interval_days', '14', 'Minimum number of days between Motion Lab submissions'),
  ('default_plan_weeks', '8', 'Default development plan length')
on conflict (key) do update set value = excluded.value, description = excluded.description;

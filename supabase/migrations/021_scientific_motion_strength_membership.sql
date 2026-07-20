-- Pitch Nav scientific motion presentation, replacement-video exemption,
-- and eight-week strength/mobility programming.

alter table public.motion_analyses
  add column if not exists cooldown_exempt boolean not null default false;

alter table public.training_plans
  add column if not exists strength_mobility_weeks jsonb not null default '[]'::jsonb;

create or replace function public.enforce_motion_analysis_interval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.motion_analyses
    where user_id = new.user_id
      and created_at >= now() - interval '14 days'
      and id <> new.id
      and cooldown_exempt = false
  ) then
    raise exception 'Membership allows one analysis every two weeks. Please wait until your next eligible date.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

insert into public.admin_settings (key, value, description)
values
  ('membership_price_cents', '4000', 'Monthly Pitch Nav membership price in cents'),
  ('default_plan_weeks', '8', 'Default pitching plus strength and mobility plan length')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description;


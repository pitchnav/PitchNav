-- Connect each paid order to its automatically generated six-phase analysis.
-- Add a rolling 14-day calendar anchor and a safe athlete progress updater.

alter table public.motion_analyses
  add column if not exists order_id uuid references public.orders(id) on delete cascade;

create index if not exists idx_motion_analyses_order_id
  on public.motion_analyses(order_id);

create unique index if not exists idx_motion_analyses_one_per_order
  on public.motion_analyses(order_id)
  where order_id is not null;

alter table public.training_plans
  add column if not exists starts_on date;

alter table public.training_plans
  add column if not exists rolling_window_days smallint not null default 14;

update public.training_plans
set starts_on = coalesce(published_at::date, created_at::date, current_date)
where starts_on is null;

alter table public.training_plans
  alter column starts_on set default current_date;

alter table public.training_plans
  alter column starts_on set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'training_plans_rolling_window_days_check'
      and conrelid = 'public.training_plans'::regclass
  ) then
    alter table public.training_plans
      add constraint training_plans_rolling_window_days_check
      check (rolling_window_days between 1 and 31);
  end if;
end $$;

create or replace function public.update_training_plan_progress(
  target_plan_id uuid,
  next_progress jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.training_plans
  set progress = coalesce(next_progress, '{}'::jsonb),
      updated_at = now()
  where id = target_plan_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Training plan not found or access denied';
  end if;
end;
$$;

revoke all on function public.update_training_plan_progress(uuid, jsonb) from public;
grant execute on function public.update_training_plan_progress(uuid, jsonb) to authenticated;

comment on column public.motion_analyses.order_id is
  'Paid order that triggered this automatically generated six-phase analysis.';
comment on column public.training_plans.starts_on is
  'Program anchor used to map the rolling daily calendar to the underlying plan.';
comment on column public.training_plans.rolling_window_days is
  'Number of future calendar days visible to the athlete; Pitch Nav currently uses 14.';

alter table public.analysis_reports
  add column if not exists mechanics_findings jsonb
  check (jsonb_typeof(mechanics_findings) = 'array'),
  add column if not exists mechanics_overview_path text;

comment on column public.analysis_reports.mechanics_findings is
  'Staff-reviewed answers and phase evidence from a motion review. NULL identifies a legacy report.';

-- Apply report, phase evidence, optional plan and review status as one revision.
create or replace function public.apply_reviewed_mechanics(
  analysis_id uuid, order_id_arg uuid, staff_id uuid, expected_revision timestamptz,
  report_data jsonb, score_rows jsonb, phase_rows jsonb, plan_data jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  source public.motion_analyses;
  report_values public.analysis_reports;
  report_id_out uuid;
begin
  select * into source from public.motion_analyses where id = analysis_id for update;
  if source.id is null or source.updated_at is distinct from expected_revision or source.published_at is not null
      or source.status = 'published' or source.ai_draft_status is distinct from 'ready_for_staff_review' then
    raise exception 'The review changed or was published. Reload the latest revision.';
  end if;
  if (source.order_id is not null and source.order_id <> order_id_arg)
      or not exists (select from public.orders where id = order_id_arg and user_id = source.user_id) then
    raise exception 'The order and analysis do not match.';
  end if;
  select * into report_values from jsonb_populate_record(null::public.analysis_reports, report_data);
  insert into public.analysis_reports as r (order_id,analyst_id,delivery_score,three_strengths,three_priorities,
      main_focus,mechanics_findings,mechanics_overview_path,secondary_focuses,reviewer_velocity_notes)
    values (order_id_arg,staff_id,report_values.delivery_score,report_values.three_strengths,report_values.three_priorities,
      report_values.main_focus,report_values.mechanics_findings,
      case when report_values.mechanics_overview_path = source.user_id::text || '/motion-lab/' || source.id::text || '/phases/delivery_overview.png'
        and source.clip_summary #>> '{delivery_overview,storage_path}' = report_values.mechanics_overview_path
        then report_values.mechanics_overview_path end,
      report_values.secondary_focuses,report_values.reviewer_velocity_notes)
    on conflict (order_id) do update set analyst_id=excluded.analyst_id, delivery_score=excluded.delivery_score,
      three_strengths=excluded.three_strengths, three_priorities=excluded.three_priorities, main_focus=excluded.main_focus,
      mechanics_findings=excluded.mechanics_findings, mechanics_overview_path=excluded.mechanics_overview_path, secondary_focuses=excluded.secondary_focuses,
      reviewer_velocity_notes=excluded.reviewer_velocity_notes where r.published_at is null
    returning id into report_id_out;
  if report_id_out is null then raise exception 'This report has already been published.'; end if;

  if report_values.mechanics_findings is not null then
    delete from public.scorecard_categories c where c.report_id=report_id_out
      and not exists (select from jsonb_array_elements(score_rows) s where s->>'category'=c.category);
  end if;
  insert into public.scorecard_categories (report_id,category,score,notes)
    select report_id_out,r.category,r.score,r.notes from jsonb_to_recordset(score_rows) as r(category text,score int,notes text)
    on conflict (report_id,category) do update set score=excluded.score,notes=excluded.notes;
  insert into public.position_screenshots (report_id,position,storage_path,reviewer_notes,strengths,development_opportunity,coaching_cue,quality_note,sort_order)
    select report_id_out,r.position,r.storage_path,r.reviewer_notes,r.strengths,r.development_opportunity,r.coaching_cue,r.quality_note,r.sort_order
    from jsonb_populate_recordset(null::public.position_screenshots,phase_rows) r
    on conflict (report_id,position) do update set storage_path=excluded.storage_path,reviewer_notes=excluded.reviewer_notes,
      strengths=excluded.strengths,development_opportunity=excluded.development_opportunity,coaching_cue=excluded.coaching_cue,
      quality_note=excluded.quality_note,sort_order=excluded.sort_order;

  if plan_data is not null then
    update public.training_plans p set title=plan_data->>'title', duration_weeks=(plan_data->>'duration_weeks')::int,
      weeks=plan_data->'weeks', strength_mobility_weeks=coalesce(plan_data->'strength_mobility_weeks',p.strength_mobility_weeks),
      rolling_window_days=(plan_data->>'rolling_window_days')::int,follow_up_date=(plan_data->>'follow_up_date')::date
      where p.motion_analysis_id=analysis_id and p.published_at is null;
    if not found then raise exception 'The training plan changed during review.'; end if;
  end if;
  update public.motion_analyses set delivery_score=report_values.delivery_score, ai_draft_status='staff_verified',
    reviewed_by=staff_id, reviewed_at=now() where id=analysis_id;
  update public.orders set status='report_being_prepared' where id=order_id_arg;
  return report_id_out;
end;
$$;
revoke all on function public.apply_reviewed_mechanics(uuid,uuid,uuid,timestamptz,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_reviewed_mechanics(uuid,uuid,uuid,timestamptz,jsonb,jsonb,jsonb,jsonb) to service_role;

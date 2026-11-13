begin;

-- Existing version 2 grants retain their original scope. A new affirmative
-- choice covers the approved assessment and assigned drills as well.
create or replace function public.stamp_ai_draft_permission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.consent_ai_draft is not true or new.ai_draft_permission_version not in (2,3) then
    new.ai_draft_permission_version := 0;
    new.ai_draft_consented_at := null;
  elsif public.athlete_intake_eligible(new) is not true then
    raise exception 'Current intake and guardian permissions are required for AI drafting';
  elsif tg_op = 'INSERT' then
    new.ai_draft_consented_at := now();
  elsif old.ai_draft_permission_version is distinct from new.ai_draft_permission_version or old.consent_ai_draft is not true then
    new.ai_draft_consented_at := now();
  else
    new.ai_draft_consented_at := old.ai_draft_consented_at;
  end if;
  return new;
end;
$$;

create table public.assessment_followup_drafts (
  analysis_id uuid not null references public.motion_analyses(id) on delete cascade,
  source_revision timestamptz not null,
  source jsonb not null,
  status text not null default 'pending' check (status in ('pending','generating','ready','failed','permission_required')),
  claim_id uuid,
  body text,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (analysis_id, source_revision),
  check ((status = 'generating') = (claim_id is not null)),
  check ((status = 'ready') = (body is not null))
);
alter table public.assessment_followup_drafts enable row level security;
revoke all on public.assessment_followup_drafts from public, anon, authenticated;
grant select (analysis_id,source_revision,status,body,updated_at,source) on public.assessment_followup_drafts to authenticated;
create policy "Staff read coaching drafts" on public.assessment_followup_drafts for select to authenticated using (public.is_admin());
grant select, insert, update, delete on public.assessment_followup_drafts to service_role;

-- Persist the selected order when applying a previously unlinked, athlete-matched review.
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
      or not exists (select from public.orders where id = order_id_arg and user_id = source.user_id
        and (source.order_id is not null or (source.athlete_profile_id is not null and athlete_profile_id=source.athlete_profile_id))) then
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
  update public.motion_analyses set order_id=order_id_arg, delivery_score=report_values.delivery_score, ai_draft_status='staff_verified',
    reviewed_by=staff_id, reviewed_at=now() where id=analysis_id;
  update public.orders set status='report_being_prepared' where id=order_id_arg;
  return report_id_out;
end;
$$;
create function public.queue_assessment_followup(target_id uuid, only_if_missing boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.motion_analyses;
  r public.analysis_reports;
  findings jsonb;
  assigned jsonb;
  weeks jsonb;
  summary_text text;
  session_text text;
  bullpen_text text;
  retest_text text;
  snapshot jsonb;
  previous public.assessment_followup_drafts;
begin
  select * into a from public.motion_analyses where id=target_id for update;
  if a.reviewed_at is null or a.reviewed_by is null or not (
    coalesce(a.ai_draft_status='staff_verified',false) or (a.status='published' and a.published_at is not null
      and exists(select from public.profiles reviewer where reviewer.id=a.reviewed_by and reviewer.is_admin))
  ) then return; end if;
  select * into previous from public.assessment_followup_drafts where analysis_id=target_id order by source_revision desc limit 1;
  if only_if_missing and previous.analysis_id is not null then return; end if;
  -- Historical inline approvals edited the Motion Lab record directly. Only
  -- consume the order report when it went through the order review path.
  if a.ai_draft_status in ('staff_verified','published') then
    select * into r from public.analysis_reports where order_id=a.order_id;
  end if;
  findings := coalesce(r.mechanics_findings, a.biggest_opportunity->'findings',
    case when jsonb_typeof(a.biggest_opportunity->'standalone_foot_strike')='object'
      then jsonb_build_array(a.biggest_opportunity->'standalone_foot_strike') end);
  summary_text := coalesce(nullif(trim(r.main_focus),''),nullif(trim(a.coach_feedback),''));
  -- Older reviews have staff-approved notes but no phase-indexed findings.
  -- Keep their actual wording and make the lack of recorded frame evidence explicit.
  if jsonb_typeof(findings) is distinct from 'array' or findings = '[]'::jsonb then
    select coalesce(jsonb_agg(jsonb_build_object(
      'flag_id',null,'topic','Reviewed priority','verdict','observed','answer',note,
      'evidence_keys','[]'::jsonb,'evidence','The staff reviewer recorded this priority without a separate phase or angle measurement.',
      'coaching_action',null
    ) order by n),'[]'::jsonb) into findings
    from unnest(coalesce(r.three_priorities,a.development_priorities,'{}')) with ordinality priorities(note,n)
    where nullif(trim(note),'') is not null;
    if findings='[]'::jsonb and (summary_text is null or
      summary_text='Your primary focus will be confirmed in the completed report.')
      and cardinality(coalesce(r.three_strengths,a.strengths,'{}'))=0 then return; end if;
    if summary_text='Your primary focus will be confirmed in the completed report.' then summary_text:=nullif(trim(a.coach_feedback),''); end if;
  end if;

  select jsonb_agg(jsonb_build_object(
    'name',d.name, 'description',coalesce(d.description,''), 'coaching_cues',coalesce(d.coaching_cues,'{}'),
    'what_it_trains',d.what_it_trains, 'common_mistakes',coalesce(d.common_mistakes,'{}'), 'contraindications',d.contraindications,
    'sets',case when nullif(trim(ad.custom_note),'') is null then d.sets end,
    'reps',case when nullif(trim(ad.custom_note),'') is null then d.reps end, 'custom_note',nullif(trim(ad.custom_note),'')
  ) order by ad.sort_order,d.name) into assigned
  from public.assigned_drills ad join public.drills d on d.id=ad.drill_id
  where ad.report_id=r.id and not exists (
    select from jsonb_array_elements(findings) f
      cross join lateral regexp_split_to_table(lower(f->>'coaching_action'),'[.!?;]+') sentence
    where strpos(sentence,lower(d.name))>0
      and substr(sentence,1,strpos(sentence,lower(d.name))-1) ~ '\m(avoid|skip|never|instead of|hold off|do not|don.t|without)\M[^,]{0,45}$'
  );

  -- The order apply transaction writes these weeks from its verified findings.
  -- A standalone plan can still be an initial automated plan, so omit it.
  if r.id is not null then
    select p.weeks into weeks from public.training_plans p where p.motion_analysis_id=a.id and p.user_id=a.user_id;
    if jsonb_typeof(weeks)='array' then
      select string_agg(concat_ws(' · ',day->>'day',day->>'focus',day->>'work'),E'\n' order by n)
        into session_text from jsonb_array_elements(case when jsonb_typeof(weeks#>'{0,days}')='array' then weeks#>'{0,days}' else '[]' end)
        with ordinality days(day,n) where lower(day->>'focus') similar to '%(drill|repeatability|development session)%';
      select concat_ws(' · ',day->>'focus',day->>'work') into bullpen_text
        from jsonb_array_elements(case when jsonb_typeof(weeks#>'{0,days}')='array' then weeks#>'{0,days}' else '[]' end) day
        where lower(day->>'focus') like '%bullpen%' limit 1;
      select concat_ws(' · ',day->>'focus',day->>'work') into retest_text
        from jsonb_array_elements(weeks) with ordinality w(week,wi)
        cross join lateral jsonb_array_elements(case when jsonb_typeof(week->'days')='array' then week->'days' else '[]' end) with ordinality d(day,di)
        where week->>'reassessment'='true' and lower(day->>'focus') like '%reassess%' order by wi,di limit 1;
    end if;
  end if;
  snapshot := jsonb_build_object(
    'summary',coalesce(summary_text,''), 'strengths',coalesce(r.three_strengths,a.strengths,'{}'),
    'approvedDrills',coalesce(assigned,'[]'), 'findings',findings
  ) || jsonb_strip_nulls(jsonb_build_object(
    'session',coalesce(nullif(trim(r.four_week_plan),''),session_text),
    'bullpenTransfer',bullpen_text,
    'retest',coalesce(nullif(trim(r.follow_up_recommendation),''),retest_text)
  ));
  -- Releasing an identical report preserves staff edits. A changed assignment
  -- or final report gets a separate immutable version when staff publishes.
  if previous.source = snapshot then return; end if;
  insert into public.assessment_followup_drafts(analysis_id,source_revision,source)
  values(a.id,case when previous.source_revision>=a.reviewed_at then greatest(clock_timestamp(),previous.source_revision+interval '1 microsecond') else a.reviewed_at end,snapshot) on conflict do nothing;
end;
$$;

create function public.queue_followup_on_approval() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.ai_draft_status='staff_verified' and old.ai_draft_status is distinct from 'staff_verified')
    or (new.status='published' and old.status is distinct from 'published') then
    perform public.queue_assessment_followup(new.id,false);
  end if;
  return null;
end;
$$;
create trigger queue_followup_on_approval after update of ai_draft_status,status on public.motion_analyses
  for each row execute function public.queue_followup_on_approval();

-- The staff order editor also permits changing the final instructions or
-- assignments after publication. Preserve the previous draft and queue the revision.
create function public.queue_published_followup_edit() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  report_id uuid;
  target_id uuid;
begin
  if tg_table_name='analysis_reports' then report_id := new.id;
  elsif tg_op='DELETE' then report_id := old.report_id;
  else report_id := new.report_id; end if;
  for target_id in
    select a.id from public.motion_analyses a join public.analysis_reports r on r.order_id=a.order_id
      where r.id=report_id and r.published_at is not null and a.status='published' and a.ai_draft_status='published'
    order by a.id
  loop
    perform public.queue_assessment_followup(target_id,false);
  end loop;
  return null;
end;
$$;
create trigger queue_followup_report_edit after update of main_focus,three_strengths,three_priorities,mechanics_findings,four_week_plan,follow_up_recommendation
  on public.analysis_reports for each row execute function public.queue_published_followup_edit();
create trigger queue_followup_assignment_edit after insert or update or delete
  on public.assigned_drills for each row execute function public.queue_published_followup_edit();

-- Verify the exact athlete (including for households with multiple pitchers)
-- at dispatch. Neither guardian/contact details nor intake data leave SQL.
create function public.assessment_followup_permitted(target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select from public.motion_analyses a left join public.orders o on o.id=a.order_id
      join public.athlete_profiles p on p.id=coalesce(a.athlete_profile_id,o.athlete_profile_id)
    where a.id=target_id and a.user_id=p.user_id and (a.order_id is null or
      (o.user_id=a.user_id and (o.athlete_profile_id is null or o.athlete_profile_id=p.id)))
      and p.consent_ai_draft and p.ai_draft_permission_version=3 and p.ai_draft_consented_at is not null
      and public.athlete_intake_eligible(p)
  );
$$;

create function public.claim_assessment_followup(target_id uuid)
returns setof public.assessment_followup_drafts language plpgsql security definer set search_path = '' as $$
declare
  d public.assessment_followup_drafts;
begin
  select * into d from public.assessment_followup_drafts where analysis_id=target_id order by source_revision desc limit 1 for update;
  if d.analysis_id is null or d.status='ready' or (d.status='generating' and d.updated_at>now()-interval '8 minutes') then return; end if;
  if not public.assessment_followup_permitted(target_id) then
    update public.assessment_followup_drafts set status='permission_required',claim_id=null,updated_at=clock_timestamp()
      where analysis_id=d.analysis_id and source_revision=d.source_revision and status<>'permission_required';
    return;
  end if;
  return query update public.assessment_followup_drafts t set status='generating',claim_id=gen_random_uuid(),updated_at=clock_timestamp()
    where t.analysis_id=d.analysis_id and t.source_revision=d.source_revision returning t.*;
end;
$$;

create function public.finish_assessment_followup(target_id uuid, source_at timestamptz, token uuid, draft_body text)
returns void language sql security definer set search_path = '' as $$
  with permission as (select public.assessment_followup_permitted(target_id) as allowed)
  update public.assessment_followup_drafts d set
    status=case when not allowed then 'permission_required' when nullif(trim(draft_body),'') is null then 'failed' else 'ready' end,
    body=case when allowed then nullif(trim(draft_body),'') end,claim_id=null,updated_at=clock_timestamp()
  from permission where d.analysis_id=target_id and d.source_revision=source_at and d.claim_id=token and d.status='generating';
$$;

create function public.edit_assessment_followup(target_id uuid,source_at timestamptz,expected_revision timestamptz,draft_body text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize with approval so edits only land on the current verified version.
  perform from public.motion_analyses where id=target_id for update;
  update public.assessment_followup_drafts d set body=trim(draft_body),updated_at=greatest(clock_timestamp(),d.updated_at+interval '1 microsecond')
  where d.analysis_id=target_id and d.source_revision=source_at and d.updated_at=expected_revision and d.status='ready'
    and not exists(select from public.assessment_followup_drafts n where n.analysis_id=target_id and n.source_revision>source_at);
  return found;
end;
$$;

-- Immediate dispatch runs after the review request. The scheduled recovery
-- sweep also covers a stopped function and a later athlete permission grant.
create function public.assessment_followups_to_resume()
returns table (analysis_id uuid) language sql stable security definer set search_path = '' as $$
  with current_drafts as (
    select distinct on (d.analysis_id) d.analysis_id,d.status,d.updated_at
    from public.assessment_followup_drafts d order by d.analysis_id,d.source_revision desc
  )
  select d.analysis_id from current_drafts d where d.status='pending'
    or (d.status='generating' and d.updated_at<=now()-interval '8 minutes')
    or (d.status='permission_required' and public.assessment_followup_permitted(d.analysis_id))
  order by d.updated_at,d.analysis_id limit 8;
$$;

revoke all on function public.queue_published_followup_edit(),public.assessment_followups_to_resume(),public.queue_followup_on_approval(),public.assessment_followup_permitted(uuid),
  public.queue_assessment_followup(uuid,boolean),public.claim_assessment_followup(uuid),
  public.finish_assessment_followup(uuid,timestamptz,uuid,text),public.edit_assessment_followup(uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.assessment_followups_to_resume(),public.queue_assessment_followup(uuid,boolean),public.claim_assessment_followup(uuid),
  public.finish_assessment_followup(uuid,timestamptz,uuid,text),public.edit_assessment_followup(uuid,timestamptz,timestamptz,text) to service_role;
commit;

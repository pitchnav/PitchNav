begin;

-- Historical ready reports include staff edits. Keep their body and leave their
-- pipeline_stage null. Jobs that still need work begin with a mechanics review.
alter table public.assessment_followup_drafts
  add column pipeline_stage text check (pipeline_stage in ('biomechanics','followup','training')),
  add column biomechanics jsonb,
  add column followup jsonb,
  add column training jsonb,
  add column stage_failures integer not null default 0 check (stage_failures >= 0);
update public.assessment_followup_drafts set pipeline_stage='biomechanics' where status<>'ready';
alter table public.assessment_followup_drafts alter column pipeline_stage set default 'biomechanics';
alter table public.assessment_followup_drafts add constraint followup_stage_artifacts check (
  case
    when pipeline_stage is null then status='ready' and biomechanics is null and followup is null and training is null
    when pipeline_stage='biomechanics' then status<>'ready' and biomechanics is null and followup is null and training is null
    when pipeline_stage='followup' then status<>'ready' and biomechanics is not null and followup is null and training is null
    when pipeline_stage='training' then biomechanics is not null and followup is not null and ((status='ready')=(training is not null))
    else false
  end
);
-- The staff-facing queue only lists progress; handoff content stays server-side.
grant select (pipeline_stage) on public.assessment_followup_drafts to authenticated;

create or replace function public.queue_assessment_followup(target_id uuid, only_if_missing boolean)
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
  phase_notes jsonb;
  scores jsonb;
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
  -- Only reviewed text, score values and phase identifiers cross the handoff.
  -- Account IDs, media URLs, storage keys and intake records stay outside it.
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'position',p.position,'reviewer_notes',nullif(trim(p.reviewer_notes),''),
    'strengths',nullif(trim(p.strengths),''),'development_opportunity',nullif(trim(p.development_opportunity),''),
    'coaching_cue',nullif(trim(p.coaching_cue),''),'estimated_angle',nullif(trim(p.estimated_angle),''),
    'quality_note',nullif(trim(p.quality_note),'')
  )) order by p.sort_order,p.position) into phase_notes
  from public.position_screenshots p where p.report_id=r.id and
    nullif(trim(concat_ws('',p.reviewer_notes,p.strengths,p.development_opportunity,p.coaching_cue,p.estimated_angle,p.quality_note)),'') is not null;
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'category',c.category,'score',c.score,'notes',nullif(trim(c.notes),'')
  )) order by c.category) into scores from public.scorecard_categories c where c.report_id=r.id;
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
      and cardinality(coalesce(r.three_strengths,a.strengths,'{}'))=0 and phase_notes is null and scores is null
      and cardinality(coalesce(r.secondary_focuses,'{}'))=0 and nullif(trim(r.reviewer_velocity_notes),'') is null then return; end if;
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
    'phaseNotes',phase_notes,'scorecard',scores,
    'priorities',nullif(coalesce(r.three_priorities,a.development_priorities),'{}'::text[]),
    'secondaryFocuses',nullif(r.secondary_focuses,'{}'::text[]),'velocityNotes',nullif(trim(r.reviewer_velocity_notes),''),
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

-- The existing published-edit trigger locates the edited row's report_id.
drop trigger queue_followup_report_edit on public.analysis_reports;
create trigger queue_followup_report_edit after update of main_focus,three_strengths,three_priorities,secondary_focuses,
  reviewer_velocity_notes,mechanics_findings,four_week_plan,follow_up_recommendation on public.analysis_reports
  for each row execute function public.queue_published_followup_edit();
create trigger queue_followup_phase_edits after insert or update of position,sort_order,reviewer_notes,strengths,
  development_opportunity,coaching_cue,estimated_angle,quality_note or delete on public.position_screenshots
  for each row execute function public.queue_published_followup_edit();
create trigger queue_followup_score_edits after insert or update of category,score,notes or delete on public.scorecard_categories
  for each row execute function public.queue_published_followup_edit();

-- Publishing and editing acquire the analysis lock first. A late worker cannot
-- attach its result to an older revision after a new one has become current.
create function public.advance_assessment_followup(target_id uuid, source_at timestamptz, token uuid,
  stage text, stage_output jsonb, draft_body text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  job public.assessment_followup_drafts;
begin
  perform from public.motion_analyses where id=target_id for update;
  select * into job from public.assessment_followup_drafts where analysis_id=target_id
    order by source_revision desc limit 1 for update;
  if job.analysis_id is null or job.source_revision is distinct from source_at or job.claim_id is distinct from token
    or job.pipeline_stage is distinct from stage or job.status<>'generating' then return false; end if;
  if not public.assessment_followup_permitted(target_id) then
    update public.assessment_followup_drafts set status='permission_required',claim_id=null,updated_at=clock_timestamp()
      where analysis_id=target_id and source_revision=source_at;
    return false;
  end if;
  if jsonb_typeof(stage_output) is distinct from 'object' or stage_output='{}'::jsonb
      or (stage='training' and (nullif(trim(draft_body),'') is null or length(trim(draft_body))>60000))
      or (stage<>'training' and draft_body is not null) then raise exception 'Invalid specialist output'; end if;
  update public.assessment_followup_drafts set
    biomechanics=case when stage='biomechanics' then stage_output else biomechanics end,
    followup=case when stage='followup' then stage_output else followup end,
    training=case when stage='training' then stage_output else training end,
    body=case when stage='training' then trim(draft_body) end,
    pipeline_stage=case when stage='biomechanics' then 'followup' else 'training' end,
    status=case when stage='training' then 'ready' else 'pending' end,
    stage_failures=0,claim_id=null,updated_at=clock_timestamp()
  where analysis_id=target_id and source_revision=source_at;
  return true;
end;
$$;

-- Old application instances may finish a single-step request while the new
-- worker is being rolled out. Discard that result and leave the stage queued.
-- A current worker sends null here to record a failed attempt at this stage.
create or replace function public.finish_assessment_followup(target_id uuid, source_at timestamptz, token uuid, draft_body text)
returns void language sql security definer set search_path = '' as $$
  with permission as (select public.assessment_followup_permitted(target_id) as allowed)
  update public.assessment_followup_drafts d set
    status=case when not allowed then 'permission_required' when nullif(trim(draft_body),'') is null then 'failed' else 'pending' end,
    stage_failures=case when allowed and nullif(trim(draft_body),'') is null then stage_failures+1 else stage_failures end,
    claim_id=null,updated_at=clock_timestamp()
  from permission where d.analysis_id=target_id and d.source_revision=source_at and d.claim_id=token and d.status='generating';
$$;

create or replace function public.assessment_followups_to_resume()
returns table (analysis_id uuid) language sql stable security definer set search_path = '' as $$
  with current_jobs as (
    select distinct on (d.analysis_id) d.analysis_id,d.status,d.updated_at,d.stage_failures
    from public.assessment_followup_drafts d order by d.analysis_id,d.source_revision desc
  )
  select j.analysis_id from current_jobs j where j.status='pending'
    or (j.status='generating' and j.updated_at<=now()-interval '8 minutes')
    or (j.status='failed' and j.stage_failures<3 and j.updated_at<=now()-interval '2 minutes')
    or (j.status='permission_required' and public.assessment_followup_permitted(j.analysis_id))
  order by j.updated_at,j.analysis_id limit 8;
$$;

revoke all on function public.advance_assessment_followup(uuid,timestamptz,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.advance_assessment_followup(uuid,timestamptz,uuid,text,jsonb,text) to service_role;
notify pgrst, 'reload schema';

commit;

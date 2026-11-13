// PostgreSQL, synthetic accounts and assessments. No provider or network connection.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const q = async (sql, args = []) => (await db.query(sql, args)).rows
const migration = async file => readFile(new URL('../migrations/' + file + '.sql', import.meta.url), 'utf8')
try {
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;`)
  for (const file of ['001_initial_schema','002_rls_policies','005_motion_lab','014_automatic_report_drafts_and_expanded_drills','016_ai_mechanics_drafts','021_scientific_motion_strength_membership','023_automatic_processing_and_rolling_calendar','044_report_mechanics_findings']) {
    await db.exec((await migration(file)).replace(/^create extension .*$/gm, ''))
  }
  // The remaining 038 policies depend on unrelated storage schemas.
  const perms = await migration('038_athlete_permissions')
  await db.exec(perms.slice(perms.indexOf('alter table public.athlete_profiles add column if not exists consent_ai_draft'), perms.indexOf('create or replace function public.validate_athlete_intake')))
  await db.exec(await migration('046_ai_draft_permission_scope'))
  await db.exec(await migration('047_assessment_followups'))
  const user = randomUUID(), athlete = randomUUID(), order = randomUUID(), analysis = randomUUID()
  await q("insert into auth.users values ($1,'coach@example.test','{}')", [user])
  await q("update profiles set is_admin=true where id=$1", [user])
  await q("insert into athlete_profiles(id,user_id,athlete_full_name,athlete_email,date_of_birth,terms_agreed,privacy_agreed,consent_ai_draft,ai_draft_permission_version) values($1,$2,'Private Name','private@example.test','1999-01-01',true,true,true,2)", [athlete,user])
  await q('insert into orders(id,user_id,athlete_profile_id) values ($1,$2,$3)', [order,user,athlete])
  // An older analysis may have an exact athlete match but no order link until apply.
  await q("insert into motion_analyses(id,user_id,athlete_profile_id,ai_draft_status) values($1,$2,$3,'ready_for_staff_review')",[analysis,user,athlete])
  await q("insert into training_plans(motion_analysis_id,user_id,duration_weeks,title) values($1,$2,8,'Verified plan')",[analysis,user])
  const finding = {flag_id:null, topic:'Sequence', answer:'Hand trails.',verdict:'observed',evidence_keys:['lead_foot_contact'],evidence:'Hand remains below elbow.',coaching_action:'Use the Pivot Throw.'}
  const report = {main_focus:'Verified report', mechanics_findings:[finding], three_strengths:['Stable landing']}
  const review = async () => {
    const [row] = await q('select updated_at::text from motion_analyses where id=$1',[analysis])
    const weeks=[{week:1,days:[{day:'Monday',focus:'Direction drill work',work:'Two existing dry reps.'},{day:'Friday',focus:'Controlled bullpen',work:'Use the assigned glove-side target.'}]},
      {week:2,reassessment:true,days:[{day:'Sunday',focus:'2-week video reassessment',work:'Compare matched foot-contact frames.'}]}]
    const plan={title:'Assigned plan',duration_weeks:8,weeks,rolling_window_days:14,follow_up_date:'2026-12-01'}
    await q("select apply_reviewed_mechanics($1,$2,$3,$4,$5,'[]','[]',$6)",[analysis,order,user,row.updated_at,JSON.stringify(report),JSON.stringify(plan)])
  }
  await review()
  assert.equal((await q("select to_regclass('public.assessment_followup_drafts')::text as name"))[0].name,'assessment_followup_drafts', 'staff approval persists a separate follow-up draft')
  const latest = async () => (await q('select *, updated_at::text as revision,source_revision::text as source_at from assessment_followup_drafts where analysis_id=$1 order by source_revision desc limit 1',[analysis]))[0]
  let draft = await latest()
  assert.equal(draft.status, 'pending')
  assert.equal(draft.source.summary, 'Verified report')
  assert.deepEqual(draft.source.findings,[finding])
  assert.match(draft.source.session,/Two existing dry reps/)
  assert.match(draft.source.bullpenTransfer,/assigned glove-side target/)
  assert.match(draft.source.retest,/matched foot-contact frames/)
  assert.ok(!JSON.stringify(draft.source).includes(user))
  assert.ok(!JSON.stringify(draft.source).includes('private@example.test'))
  const claim = async () => q('select * from claim_assessment_followup($1)',[analysis])
  assert.equal((await claim()).length,0)
  assert.equal((await latest()).status,'permission_required')
  await q('update athlete_profiles set ai_draft_permission_version=3 where id=$1',[athlete])
  await q("update athlete_profiles set date_of_birth='2012-01-01' where id=$1",[athlete])
  assert.equal((await claim()).length,0,'a minor requires current guardian permission')
  await q("update athlete_profiles set date_of_birth='1999-01-01' where id=$1",[athlete])
  const sibling=randomUUID()
  await q("insert into athlete_profiles(id,user_id,athlete_full_name,athlete_email,date_of_birth,terms_agreed,privacy_agreed) values($1,$2,'Other Pitcher','other@example.test','1998-01-01',true,true)",[sibling,user])
  await q('update orders set athlete_profile_id=$1 where id=$2',[sibling,order])
  assert.equal((await claim()).length,0,'permission on one family member cannot cover a sibling')
  await q('update orders set athlete_profile_id=$1 where id=$2',[athlete,order])
  assert.equal((await claim()).length,1)
  assert.equal((await claim()).length,0,'active lease is unique')
  await q("update assessment_followup_drafts set updated_at=now()-interval '20 minutes' where analysis_id=$1",[analysis])
  const abandoned=(await latest()).claim_id
  const [replacement]=await claim()
  assert.ok(replacement,'abandoned lease can be reclaimed')
  const finish=(token,body)=>q('select finish_assessment_followup($1,$2,$3,$4)',[analysis,draft.source_at,token,body])
  await finish(abandoned,'Stale worker')
  assert.equal((await latest()).status,'generating')
  await q('update athlete_profiles set consent_ai_draft=false where id=$1',[athlete])
  await finish(replacement.claim_id,'Revoked in flight')
  assert.equal((await latest()).body,null)
  assert.equal((await latest()).status,'permission_required')
  assert.equal((await q('select * from assessment_followups_to_resume()')).length,0)
  await q('update athlete_profiles set consent_ai_draft=true,ai_draft_permission_version=3 where id=$1',[athlete])
  assert.equal((await q('select * from assessment_followups_to_resume()')).length,1)
  await finish((await claim())[0].claim_id,null)
  assert.equal((await latest()).status,'failed')
  await finish((await claim())[0].claim_id,'Generated')
  draft=await latest()
  const edit=async rev=>q('select edit_assessment_followup($1,$2,$3,$4) as ok',[analysis,draft.source_at,rev,'Coach edit'])
  assert.equal((await edit(draft.revision))[0].ok,true)
  assert.equal((await edit(draft.revision))[0].ok,false)
  assert.equal((await claim()).length,0)
  await q("update motion_analyses set status='published',ai_draft_status='published',reviewed_at=now(),published_at=now() where id=$1",[analysis])
  await q('select queue_assessment_followup($1,true)',[analysis])
  assert.equal((await q('select count(*)::int as n from assessment_followup_drafts'))[0].n,1)
  assert.equal((await latest()).body,'Coach edit')
  await q('update analysis_reports set published_at=now() where order_id=$1',[order])
  const assignedId=randomUUID()
  const [reportRow]=await q('select id from analysis_reports where order_id=$1',[order])
  await q("insert into assigned_drills(id,report_id,drill_id,custom_note) select $1,$2,id,'One dry rep guided by staff.' from drills where name='Balanced Finish Hold' limit 1",[assignedId, reportRow.id])
  let changed=await latest()
  assert.equal(changed.status,'pending')
  assert.equal(changed.source.approvedDrills[0].name,'Balanced Finish Hold')
  assert.equal(changed.source.approvedDrills[0].sets,null)
  assert.equal(changed.source.approvedDrills[0].reps,null)
  assert.equal(changed.source.approvedDrills[0].custom_note,'One dry rep guided by staff.')
  assert.equal((await q('select body from assessment_followup_drafts where analysis_id=$1 and source_revision=$2',[analysis,draft.source_at]))[0].body,'Coach edit')
  assert.equal((await edit((await q('select updated_at::text as rev from assessment_followup_drafts where source_revision=$1',[draft.source_at]))[0].rev))[0].ok,false)
  await q('update analysis_reports set mechanics_findings=$1 where id=$2',[JSON.stringify([{...finding,coaching_action:'Skip Balanced Finish Hold. Use Pivot Throw.'}]),reportRow.id])
  changed=await latest()
  assert.deepEqual(changed.source.approvedDrills,[])
  const solo=randomUUID()
  await q("insert into motion_analyses(id,user_id,athlete_profile_id,status,cooldown_exempt) values($1,$2,$3,'coach_review',true)",[solo,user,athlete])
  await q("update motion_analyses set status='published',published_at=now(),reviewed_at=now(),reviewed_by=$1,biggest_opportunity=$2,coach_feedback='Verified solo' where id=$3",[user,JSON.stringify({standalone_foot_strike:finding}),solo])
  assert.equal((await q('select source from assessment_followup_drafts where analysis_id=$1',[solo]))[0].source.summary,'Verified solo')
  const legacy=randomUUID(), legacyOrder=randomUUID()
  await q('insert into orders(id,user_id,athlete_profile_id) values($1,$2,$3)',[legacyOrder,user,athlete])
  await q("insert into analysis_reports(order_id,main_focus) values($1,'Old unreviewed order report guess')",[legacyOrder])
  await q("insert into motion_analyses(id,user_id,athlete_profile_id,order_id,status,cooldown_exempt) values($1,$2,$3,$4,'coach_review',true)",[legacy,user,athlete,legacyOrder])
  await q("update motion_analyses set status='published',published_at=now(),reviewed_at=now(),reviewed_by=$1,coach_feedback='Back knee stays bent.',development_priorities=array['Stay tall over the back hip.'] where id=$2",[user,legacy])
  const legacySource=(await q('select source from assessment_followup_drafts where analysis_id=$1',[legacy]))[0].source
  assert.equal(legacySource.summary,'Back knee stays bent.')
  assert.equal(legacySource.findings[0].answer,'Stay tall over the back hip.')
  assert.deepEqual(legacySource.findings[0].evidence_keys,[])
  assert.equal(legacySource.findings[0].coaching_action,null)
  await db.exec('set role authenticated')
  assert.equal((await q('select analysis_id from assessment_followup_drafts')).length,0)
  await assert.rejects(claim(),/permission denied/)
  await db.exec('reset role')
  console.log('Approval snapshot, scoped permission, lease recovery, conflicting edits, staff-only storage and publication idempotence passed.')
} finally {
  await db.close()
}

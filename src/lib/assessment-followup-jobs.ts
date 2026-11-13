import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { readBiomechanics, writeAthleteFollowup, designTrainingPlan, reviewedSource, specialistFailureReason, type CoachingDrill, type CoachingFollowupSource } from '@/lib/coaching-followup'

const columns = 'analysis_id,source_revision,status,body,updated_at,source,pipeline_stage'

export async function latestAssessmentFollowup(id: string) {
  const { data, error } = await createAdminClient().from('assessment_followup_drafts')
    .select(columns).eq('analysis_id', id).order('source_revision', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error('Could not load the coaching draft.')
  return data
}

export async function generateAssessmentFollowup(id: string, backfill = false) {
  const admin = createAdminClient()
  if (backfill) {
    const { error } = await admin.rpc('queue_assessment_followup', { target_id: id, only_if_missing: true })
    if (error) throw new Error('Could not load the verified assessment.')
  }
  // Every handoff obtains a new lease and checks the current athlete's permission again.
  for (let remaining = 3; remaining > 0; remaining--) {
    const { data: claim, error } = await admin.rpc('claim_assessment_followup', { target_id: id }).maybeSingle()
    if (error) throw new Error('Could not start the assessment specialist.')
    if (!claim) return
    const lease = { target_id: id, source_at: claim.source_revision, token: claim.claim_id }
    let output: unknown
    let body: string | null = null
    try {
      const source = reviewedSource(claim.source as CoachingFollowupSource)
      switch (claim.pipeline_stage) {
        case 'biomechanics':
          output = await readBiomechanics(source)
          break
        case 'followup':
          output = await writeAthleteFollowup(source, claim.biomechanics)
          break
        case 'training': {
          const { data: drills, error: catalogError } = await admin.from('drills')
            .select('name,description,coaching_cues,sets,reps,common_mistakes,contraindications,what_it_trains')
            .eq('is_active', true).order('name')
          if (catalogError) throw new Error('Could not load the training library.')
          const catalog = (drills ?? []).map((drill: CoachingDrill) => ({
            ...drill, description: drill.description ?? '', coaching_cues: drill.coaching_cues ?? [],
          }))
          const plan = await designTrainingPlan(source, claim.biomechanics, claim.followup, catalog)
          output = plan.artifact
          body = plan.body
          break
        }
        default: throw new Error('The assessment has an unknown stage.')
      }
    } catch (reason) {
      const stage = ['biomechanics','followup','training'].includes(claim.pipeline_stage) ? claim.pipeline_stage : 'unknown'
      console.warn('Assessment specialist failed', {stage, reason: specialistFailureReason(reason)})
      const { error: releaseError } = await admin.rpc('finish_assessment_followup', { ...lease, draft_body: null })
      if (releaseError) throw new Error('Could not release the assessment specialist.')
      return
    }
    const { data: advanced, error: saveError } = await admin.rpc('advance_assessment_followup', {
      ...lease, stage: claim.pipeline_stage, stage_output: output, draft_body: body,
    })
    if (saveError) throw new Error('Could not save the assessment handoff.')
    if (!advanced || body !== null) return
  }
}

export function scheduleAssessmentFollowup(id: string) {
  after(async () => {
    try {
      await generateAssessmentFollowup(id)
    } catch {
      // The review is already committed; a staff retry can reclaim an interrupted job.
      console.error('Assessment follow-up processing was interrupted.')
    }
  })
}


export async function resumeAssessmentFollowups() {
  const { data, error } = await createAdminClient().rpc('assessment_followups_to_resume')
  if (error) throw new Error('Could not read the coaching queue.')
  const results = await Promise.allSettled((data ?? []).map((row: { analysis_id: string }) => generateAssessmentFollowup(row.analysis_id)))
  return { checked: results.length, interrupted: results.filter(result => result.status === 'rejected').length }
}

export function scheduleAssessmentFollowupRecovery() {
  after(async () => {
    try {
      await resumeAssessmentFollowups()
    } catch {
      console.error('Could not resume pending assessment follow-ups.')
    }
  })
}

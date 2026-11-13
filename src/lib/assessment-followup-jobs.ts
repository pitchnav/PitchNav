import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateCoachingFollowup, selectFollowUpDrillCandidates, type CoachingFollowupSource } from '@/lib/coaching-followup'

const columns = 'analysis_id,source_revision,status,body,updated_at,source'

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
  const { data: claim, error } = await admin.rpc('claim_assessment_followup', { target_id: id }).maybeSingle()
  if (error) throw new Error('Could not start the coaching draft.')
  if (!claim) return

  let body: string | null = null
  try {
    const source = claim.source as CoachingFollowupSource
    // A claim is granted only while the exact athlete's current permission is valid.
    // The provider receives reviewed text. Account/guardian fields stay in the database.
    if (!source.approvedDrills.length && source.findings.some(f => f.verdict === 'observed' && f.coaching_action)) {
      const { data: catalog, error: catalogError } = await admin.from('drills')
        .select('name,description,coaching_cues,sets,reps,common_mistakes,contraindications,what_it_trains').eq('is_active', true)
      if (catalogError) throw new Error('Could not read the drills.')
      source.suggestedDrills = selectFollowUpDrillCandidates(source.findings, (catalog ?? []).map((row: {
        name: string; description: string | null; coaching_cues: string[] | null; common_mistakes: string[] | null
        sets: number | null; reps: string | null; contraindications: string | null; what_it_trains: string | null
      }) => ({ ...row, description: row.description ?? '', coaching_cues: row.coaching_cues ?? [], common_mistakes: row.common_mistakes ?? [] })), source.approvedDrills)
    }
    body = await generateCoachingFollowup(source)
  } catch {
    // Provider or source errors are retryable from the staff queue.
  }
  const { error: saveError } = await admin.rpc('finish_assessment_followup', {
    target_id: id, source_at: claim.source_revision, token: claim.claim_id, draft_body: body,
  })
  if (saveError) throw new Error('Could not finish the coaching draft.')
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

import { scheduleAssessmentFollowupRecovery } from '@/lib/assessment-followup-jobs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

const pageSize = 20
const noStore = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to PitchNav.' }, { status: 401, headers: noStore })
  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStore })
  const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return NextResponse.json({ error: 'Choose a valid page.' }, { status: 400, headers: noStore })
  }
  const child = 'assessment_followup_drafts'
  const { data, error } = await db.from('motion_analyses')
    .select('id,title,athlete_profiles(athlete_full_name),assessment_followup_drafts!inner(status,source_revision,pipeline_stage)')
    .not('reviewed_at','is',null).not('reviewed_by','is',null)
    .or('ai_draft_status.eq.staff_verified,and(status.eq.published,published_at.not.is.null)')
    .order('reviewed_at', {ascending:false}).order('id')
    .order('source_revision',{referencedTable:child,ascending:false}).limit(1,{referencedTable:child})
    .range((page - 1) * pageSize, page * pageSize)
  if (error) return NextResponse.json({ error: 'Could not load saved follow-ups.' }, { status: 500, headers: noStore })
  scheduleAssessmentFollowupRecovery()
  const rows = data ?? []
  const items = rows.slice(0, pageSize).map(row => {
    const draft = row.assessment_followup_drafts[0]
    const athlete = Array.isArray(row.athlete_profiles) ? row.athlete_profiles[0] : row.athlete_profiles
    return { analysisId: row.id, label: athlete?.athlete_full_name || row.title || 'Pitching assessment',
      reviewedAt: draft.source_revision, status: draft.status, pipelineStage: draft.pipeline_stage }
  })
  return NextResponse.json({ items, page, hasNext: rows.length > pageSize }, { headers: noStore })
}

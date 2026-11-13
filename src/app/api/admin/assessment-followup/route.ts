import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { generateAssessmentFollowup, latestAssessmentFollowup } from '@/lib/assessment-followup-jobs'

export const runtime = 'nodejs'
export const maxDuration = 300

const requestId = z.string().uuid()
const writeRequest = z.object({
  analysisId: requestId, sourceRevision: z.string().datetime({ offset: true }), revision: z.string().datetime({ offset: true }),
  body: z.string().trim().min(1).max(60000),
}).strict()

async function staffAccess() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })
  const { data: staff } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!staff?.is_admin) return NextResponse.json({ error: 'Staff access is required.' }, { status: 403 })
}

export async function GET(request: Request) {
  const denied = await staffAccess()
  if (denied) return denied
  const id = requestId.safeParse(new URL(request.url).searchParams.get('analysisId'))
  if (!id.success) return NextResponse.json({ error: 'Select an assessment.' }, { status: 400 })
  try {
    return NextResponse.json({ draft: await latestAssessmentFollowup(id.data) })
  } catch {
    return NextResponse.json({ error: 'Could not load the coaching draft.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const denied = await staffAccess()
  if (denied) return denied
  const parsed = z.object({ analysisId: requestId }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Select an assessment.' }, { status: 400 })
  try {
    await generateAssessmentFollowup(parsed.data.analysisId, true)
    const draft = await latestAssessmentFollowup(parsed.data.analysisId)
    if (!draft) return NextResponse.json({ error: 'This assessment needs reviewed coaching notes or mechanics findings.' }, { status: 409 })
    return NextResponse.json({ draft })
  } catch {
    return NextResponse.json({ error: 'Could not prepare this coaching draft. Retry from the review queue.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const denied = await staffAccess()
  if (denied) return denied
  const parsed = writeRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a draft up to 60,000 characters and use the latest saved revision.' }, { status: 400 })
  const { analysisId, sourceRevision, revision, body } = parsed.data
  const { data, error } = await createAdminClient().rpc('edit_assessment_followup', {
    target_id: analysisId, source_at: sourceRevision, expected_revision: revision, draft_body: body,
  })
  if (error) return NextResponse.json({ error: 'Could not save the coaching draft.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'A newer revision is available. Copy your edits and reopen the assessment.' }, { status: 409 })
  try {
    return NextResponse.json({ draft: await latestAssessmentFollowup(analysisId) })
  } catch {
    return NextResponse.json({ error: 'Draft saved. Refresh to reload it.' }, { status: 500 })
  }
}

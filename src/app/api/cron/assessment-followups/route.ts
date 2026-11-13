import { NextResponse } from 'next/server'
import { resumeAssessmentFollowups } from '@/lib/assessment-followup-jobs'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await resumeAssessmentFollowups()
    return NextResponse.json(result, { status: result.interrupted ? 503 : 200 })
  } catch {
    return NextResponse.json({ error: 'Could not load the coaching queue.' }, { status: 500 })
  }
}

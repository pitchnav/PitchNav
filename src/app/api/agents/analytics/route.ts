import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { buildAnalyticsFindings } from '@/lib/agents/analytics'
import type { AnalysisRow, OrderRow, SubmissionRow } from '@/lib/agents/types'

export const runtime = 'nodejs'

// The admin client is untyped (service-role client built from an untyped
// require()), so raw query results come back as `any`. These shapes describe
// exactly the columns each select() asks for, letting the map() callbacks
// below get real parameter types instead of implicit `any`.
type OrderQueryRow = {
  id: string
  status: string
  payment_confirmed_at: string | null
  athlete_profiles: { athlete_full_name: string | null } | { athlete_full_name: string | null }[] | null
  analysis_reports: { published_at: string | null } | { published_at: string | null }[] | null
}

type AnalysisQueryRow = {
  id: string
  order_id: string | null
  phase_snapshots: unknown
  published_at: string | null
}

type SubmissionQueryRow = {
  id: string
  order_id: string
  quality_approved: boolean | null
  quality_reviewed_at: string | null
  created_at: string
}

/**
 * Two callers: the Vercel cron (bearer secret) and an admin pressing "Run
 * now" in the browser. A failed run still records an agent_runs row so the
 * screen shows the failure instead of silently displaying stale findings.
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: run, error: runError } = await admin
    .from('agent_runs')
    .insert({ agent: 'analytics' })
    .select('id')
    .single()
  if (runError || !run) {
    return NextResponse.json({ error: `Could not start the run: ${runError?.message}` }, { status: 500 })
  }

  try {
    // athlete_profiles has no first_name/last_name column -- the real column
    // is athlete_full_name, used directly as the athlete's display name.
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id,status,payment_confirmed_at,athlete_profiles(athlete_full_name),analysis_reports(published_at)')
      .not('payment_confirmed_at', 'is', null)
      .limit(500)
    if (ordersError) throw new Error(`orders: ${ordersError.message}`)

    const { data: analyses, error: analysesError } = await admin
      .from('motion_analyses')
      .select('id,order_id,phase_snapshots,published_at')
      .limit(500)
    if (analysesError) throw new Error(`motion_analyses: ${analysesError.message}`)

    const { data: submissions, error: submissionsError } = await admin
      .from('video_submissions')
      .select('id,order_id,quality_approved,quality_reviewed_at,created_at')
      .limit(500)
    if (submissionsError) throw new Error(`video_submissions: ${submissionsError.message}`)

    const orderRows: OrderRow[] = ((orders ?? []) as OrderQueryRow[]).map((order) => {
      const profile = Array.isArray(order.athlete_profiles) ? order.athlete_profiles[0] : order.athlete_profiles
      const report = Array.isArray(order.analysis_reports) ? order.analysis_reports[0] : order.analysis_reports
      return {
        id: order.id,
        status: order.status,
        payment_confirmed_at: order.payment_confirmed_at,
        report_published_at: report?.published_at ?? null,
        athlete_name: profile?.athlete_full_name ?? null,
      }
    })

    const analysisRows: AnalysisRow[] = ((analyses ?? []) as AnalysisQueryRow[]).map((analysis) => ({
      id: analysis.id,
      order_id: analysis.order_id ?? null,
      phase_snapshot_count: Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots.length : 0,
      published_at: analysis.published_at,
    }))

    // A rejected submission counts as replaced when a newer submission exists
    // for the same order.
    const submissionQueryRows = (submissions ?? []) as SubmissionQueryRow[]
    const newestByOrder = new Map<string, string>()
    for (const submission of submissionQueryRows) {
      const current = newestByOrder.get(submission.order_id)
      if (!current || submission.created_at > current) newestByOrder.set(submission.order_id, submission.created_at)
    }
    const submissionRows: SubmissionRow[] = submissionQueryRows.map((submission) => ({
      id: submission.id,
      order_id: submission.order_id,
      quality_approved: submission.quality_approved,
      quality_reviewed_at: submission.quality_reviewed_at,
      replaced: newestByOrder.get(submission.order_id) !== submission.created_at,
    }))

    const findings = buildAnalyticsFindings({
      now: new Date(),
      orders: orderRows,
      analyses: analysisRows,
      submissions: submissionRows,
    })

    if (findings.length > 0) {
      const { error: insertError } = await admin
        .from('agent_findings')
        .insert(findings.map((finding) => ({ ...finding, run_id: run.id })))
      if (insertError) throw new Error(`agent_findings: ${insertError.message}`)
    }

    await admin
      .from('agent_runs')
      .update({ finished_at: new Date().toISOString(), status: 'ok', findings_count: findings.length })
      .eq('id', run.id)

    return NextResponse.json({ runId: run.id, findings: findings.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown failure'
    await admin
      .from('agent_runs')
      .update({ finished_at: new Date().toISOString(), status: 'failed', error: message })
      .eq('id', run.id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

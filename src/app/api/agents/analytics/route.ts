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
  refunded_at: string | null
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
    .insert({ agent: 'analytics', status: 'running' })
    .select('id')
    .single()
  if (runError || !run) {
    return NextResponse.json({ error: `Could not start the run: ${runError?.message}` }, { status: 500 })
  }

  try {
    // athlete_profiles has no first_name/last_name column -- the real column
    // is athlete_full_name, used directly as the athlete's display name.
    //
    // Every query below is capped with limit(500). Without an explicit
    // order, PostgREST row order past the limit is unspecified, so
    // truncation could silently drop arbitrary rows. Each query below is
    // ordered so that IF truncation ever kicks in, it drops the rows that do
    // the least damage to this agent's own rules -- see the comment on each
    // query, because that reasoning is not the same for all three.
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id,status,payment_confirmed_at,refunded_at,athlete_profiles(athlete_full_name),analysis_reports(published_at)')
      .not('payment_confirmed_at', 'is', null)
      .order('payment_confirmed_at', { ascending: true })
      .limit(500)
    if (ordersError) throw new Error(`orders: ${ordersError.message}`)

    // Rule 1's severity only grows with age, so oldest-first means truncation
    // (if it ever happens) drops the newest, least-urgent orders.
    const { data: analyses, error: analysesError } = await admin
      .from('motion_analyses')
      .select('id,order_id,phase_snapshots,published_at')
      .is('published_at', null)
      .order('created_at', { ascending: true })
      .limit(500)
    if (analysesError) throw new Error(`motion_analyses: ${analysesError.message}`)

    // Rule 2 (missing phase images) is urgent regardless of age, and published
    // analyses are irrelevant to it anyway, so filtering them out at the query
    // moves the 500-row cap far from ever binding on the rows that matter.

    // Newest-first, unlike the other two queries. "replaced" is computed
    // against the newest submission per order, so truncating the newest rows
    // would remove the very replacements rule 3 depends on, reporting
    // long-since-replaced videos as "no replacement" -- a false positive in
    // the rule this cap exists to protect. A missed finding from truncating
    // old rows is far less damaging than that false positive, so this query
    // is ordered the opposite way from the other two on purpose.
    const { data: submissions, error: submissionsError } = await admin
      .from('video_submissions')
      .select('id,order_id,quality_approved,quality_reviewed_at,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (submissionsError) throw new Error(`video_submissions: ${submissionsError.message}`)

    const submissionQueryRows = (submissions ?? []) as SubmissionQueryRow[]
    const ordersWithVideo = new Set(submissionQueryRows.map((submission) => submission.order_id))

    const orderRows: OrderRow[] = ((orders ?? []) as OrderQueryRow[]).map((order) => {
      const profile = Array.isArray(order.athlete_profiles) ? order.athlete_profiles[0] : order.athlete_profiles
      const report = Array.isArray(order.analysis_reports) ? order.analysis_reports[0] : order.analysis_reports
      return {
        id: order.id,
        status: order.status,
        payment_confirmed_at: order.payment_confirmed_at,
        refunded_at: order.refunded_at,
        report_published_at: report?.published_at ?? null,
        athlete_name: profile?.athlete_full_name ?? null,
        has_video: ordersWithVideo.has(order.id),
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

    // The row was inserted as 'running' before any work happened, so an
    // in-flight run (or one killed by a timeout that never reaches the catch
    // block) reads as still running rather than a false "OK". Checked and
    // handled the same way as every other write in this route, so a failure
    // here is recorded rather than silently leaving the row stuck.
    const { error: finishError } = await admin
      .from('agent_runs')
      .update({ finished_at: new Date().toISOString(), status: 'ok', findings_count: findings.length })
      .eq('id', run.id)
    if (finishError) throw new Error(`Could not mark the run finished: ${finishError.message}`)

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

// GET exists solely for Vercel Cron, which invokes via GET and cannot send a
// POST body or a CSRF token. POST accepts either the bearer secret or an
// authenticated admin session because it is also the "Run now" button's
// method. GET must NOT fall back to the admin cookie check: a safe-looking
// GET is reachable via a top-level navigation with no CSRF protection, so
// letting it run a state-mutating action off an admin's ambient cookies would
// make the run triggerable by a plain link/redirect. Bearer-secret-only closes
// that off while still letting the cron schedule work.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'A valid cron secret is required for GET.' }, { status: 403 })
  }
  return POST(request)
}

import type { AnalyticsInput, Finding, Severity } from './types'

const DAY_MS = 86_400_000
const ANALYTICS = 'analytics'

function daysWaiting(now: Date, since: string): number {
  return (now.getTime() - new Date(since).getTime()) / DAY_MS
}

function waitSeverity(days: number): Severity {
  if (days >= 3) return 'urgent'
  if (days >= 1) return 'attention'
  return 'info'
}

function describeWait(days: number): string {
  if (days < 1) return 'less than a day'
  const whole = Math.floor(days)
  return whole === 1 ? '1 day' : `${whole} days`
}

/**
 * Turns rows into findings. Deliberately deterministic: every number here is
 * counted, not estimated, so the screen can never show an invented figure.
 */
export function buildAnalyticsFindings(input: AnalyticsInput): Finding[] {
  const findings: Finding[] = []

  for (const order of input.orders) {
    if (!order.payment_confirmed_at) continue
    if (order.report_published_at) continue
    const days = daysWaiting(input.now, order.payment_confirmed_at)
    findings.push({
      agent: ANALYTICS,
      severity: waitSeverity(days),
      title: 'Paid order with no published report',
      detail: `${order.athlete_name ?? 'An athlete'} paid and has been waiting ${describeWait(days)} for a report.`,
      entity_type: 'order',
      entity_id: order.id,
    })
  }

  for (const analysis of input.analyses) {
    if (analysis.published_at) continue
    if (analysis.phase_snapshot_count >= 6) continue
    findings.push({
      agent: ANALYTICS,
      severity: 'urgent',
      title: 'Analysis is missing phase images',
      detail: `Only ${analysis.phase_snapshot_count} of 6 phase images saved, so the AI coaching draft cannot be generated yet.`,
      entity_type: 'order',
      entity_id: analysis.order_id,
    })
  }

  for (const submission of input.submissions) {
    if (submission.quality_approved !== false) continue
    if (submission.replaced) continue
    if (!submission.quality_reviewed_at) continue
    if (daysWaiting(input.now, submission.quality_reviewed_at) < 3) continue
    findings.push({
      agent: ANALYTICS,
      severity: 'attention',
      title: 'Rejected video with no replacement',
      detail: 'A video was rejected for quality and no replacement has been uploaded since.',
      entity_type: 'order',
      entity_id: submission.order_id,
    })
  }

  // Screen order matters more than table order: urgent items must surface first
  // regardless of which rule produced them.
  const rank: Record<Severity, number> = { urgent: 0, attention: 1, info: 2 }
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity])
}

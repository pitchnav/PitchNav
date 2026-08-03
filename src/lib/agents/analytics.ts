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

  return findings
}

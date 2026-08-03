import { buildAnalyticsFindings } from './analytics'
import type { AnalyticsInput } from './types'

const NOW = new Date('2026-08-03T12:00:00Z')

function input(over: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return { now: NOW, orders: [], analyses: [], submissions: [], ...over }
}

describe('paid but unpublished orders', () => {
  it('says nothing when a paid order was published', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'complete',
        payment_confirmed_at: '2026-08-01T12:00:00Z',
        report_published_at: '2026-08-02T12:00:00Z',
        athlete_name: 'Pipeline Test',
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('flags a paid order with no published report', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'in_analysis',
        payment_confirmed_at: '2026-08-01T12:00:00Z',
        report_published_at: null,
        athlete_name: 'Pipeline Test',
      }],
    }))
    expect(findings).toHaveLength(1)
    expect(findings[0].entity_id).toBe('o1')
    expect(findings[0].detail).toContain('Pipeline Test')
  })

  it('ignores an order that was never paid', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'awaiting_payment',
        payment_confirmed_at: null, report_published_at: null, athlete_name: 'X',
      }],
    }))
    expect(findings).toHaveLength(0)
  })
})

describe('waiting-time severity', () => {
  function waited(hours: number) {
    const paid = new Date(NOW.getTime() - hours * 3600_000).toISOString()
    return buildAnalyticsFindings(input({
      orders: [{ id: 'o1', status: 'in_analysis', payment_confirmed_at: paid, report_published_at: null, athlete_name: 'A' }],
    }))[0]
  }

  it('is info under one day', () => {
    expect(waited(23).severity).toBe('info')
  })

  it('is attention at exactly one day', () => {
    expect(waited(24).severity).toBe('attention')
  })

  it('is urgent at exactly three days', () => {
    expect(waited(72).severity).toBe('urgent')
  })
})

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
        refunded_at: null,
        report_published_at: '2026-08-02T12:00:00Z',
        athlete_name: 'Pipeline Test',
        has_video: true,
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('flags a paid order with no published report', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'in_analysis',
        payment_confirmed_at: '2026-08-01T12:00:00Z',
        refunded_at: null,
        report_published_at: null,
        athlete_name: 'Pipeline Test',
        has_video: true,
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
        payment_confirmed_at: null, refunded_at: null, report_published_at: null, athlete_name: 'X',
        has_video: false,
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('says nothing for a refunded order even though payment_confirmed_at is still set', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'refunded',
        payment_confirmed_at: '2026-07-01T12:00:00Z',
        refunded_at: '2026-07-05T12:00:00Z',
        report_published_at: null,
        athlete_name: 'Refunded Athlete',
        has_video: true,
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('says nothing for a cancelled order even though payment_confirmed_at is still set', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'cancelled',
        payment_confirmed_at: '2026-07-01T12:00:00Z',
        refunded_at: null,
        report_published_at: null,
        athlete_name: 'Cancelled Athlete',
        has_video: true,
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('says nothing when refunded_at is set even if status was not updated to refunded', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'in_analysis',
        payment_confirmed_at: '2026-07-01T12:00:00Z',
        refunded_at: '2026-07-05T12:00:00Z',
        report_published_at: null,
        athlete_name: 'Reset Test Order',
        has_video: true,
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('says nothing for a paid order with no video uploaded yet', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'awaiting_videos',
        payment_confirmed_at: '2026-07-01T12:00:00Z',
        refunded_at: null,
        report_published_at: null,
        athlete_name: 'Slow Filmer',
        has_video: false,
      }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('flags the same order once the video is in', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'in_analysis',
        payment_confirmed_at: '2026-07-01T12:00:00Z',
        refunded_at: null,
        report_published_at: null,
        athlete_name: 'Slow Filmer',
        has_video: true,
      }],
    }))
    expect(findings).toHaveLength(1)
    expect(findings[0].entity_id).toBe('o1')
  })
})

describe('waiting-time severity', () => {
  function waited(hours: number) {
    const paid = new Date(NOW.getTime() - hours * 3600_000).toISOString()
    return buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'in_analysis', payment_confirmed_at: paid, refunded_at: null,
        report_published_at: null, athlete_name: 'A', has_video: true,
      }],
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

describe('analyses missing phase images', () => {
  it('flags an analysis with fewer than six phase snapshots', () => {
    const findings = buildAnalyticsFindings(input({
      analyses: [{ id: 'a1', order_id: 'o1', phase_snapshot_count: 4, published_at: null }],
    }))
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('urgent')
    expect(findings[0].entity_id).toBe('o1')
  })

  it('says nothing at exactly six', () => {
    const findings = buildAnalyticsFindings(input({
      analyses: [{ id: 'a1', order_id: 'o1', phase_snapshot_count: 6, published_at: null }],
    }))
    expect(findings).toHaveLength(0)
  })

  it('ignores an already published analysis', () => {
    const findings = buildAnalyticsFindings(input({
      analyses: [{ id: 'a1', order_id: 'o1', phase_snapshot_count: 2, published_at: '2026-08-01T12:00:00Z' }],
    }))
    expect(findings).toHaveLength(0)
  })
})

describe('rejected videos with no replacement', () => {
  function rejected(daysAgo: number, replaced: boolean) {
    const reviewed = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString()
    return buildAnalyticsFindings(input({
      submissions: [{ id: 's1', order_id: 'o1', quality_approved: false, quality_reviewed_at: reviewed, replaced }],
    }))
  }

  it('flags a rejection older than three days with nothing new', () => {
    const findings = rejected(4, false)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('attention')
  })

  it('says nothing when a replacement arrived', () => {
    expect(rejected(4, true)).toHaveLength(0)
  })

  it('says nothing within three days', () => {
    expect(rejected(2, false)).toHaveLength(0)
  })

  it('ignores approved videos', () => {
    const findings = buildAnalyticsFindings(input({
      submissions: [{ id: 's1', order_id: 'o1', quality_approved: true, quality_reviewed_at: '2026-07-01T12:00:00Z', replaced: false }],
    }))
    expect(findings).toHaveLength(0)
  })
})

describe('findings ordering', () => {
  it('puts urgent findings before attention and info', () => {
    const findings = buildAnalyticsFindings(input({
      orders: [{
        id: 'o1', status: 'in_analysis',
        payment_confirmed_at: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
        refunded_at: null,
        report_published_at: null, athlete_name: 'A', has_video: true,
      }],
      analyses: [{ id: 'a1', order_id: 'o2', phase_snapshot_count: 1, published_at: null }],
    }))
    expect(findings.map((f) => f.severity)).toEqual(['urgent', 'attention'])
  })
})

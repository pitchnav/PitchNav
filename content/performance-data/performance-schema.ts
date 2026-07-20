/**
 * Performance tracking schema for content/performance-data/performance-tracker.csv
 * and content/performance-data/dashboard.html.
 *
 * One row = one published video (one hook variant, one date, one
 * organic-or-paid instance). Raw fields are what you type in after checking
 * Instagram Insights / Ads Manager. Calculated fields are derived — don't
 * type them in by hand, let the dashboard or a spreadsheet formula compute
 * them so they can't drift out of sync with the raw numbers.
 */

export interface PerformanceRow {
  videoName: string
  /** Matches testVariation in the campaign JSON, e.g. "hook-variant-1-mechanical-problem". */
  hookVariant: string
  /** ISO date, e.g. "2026-08-04". */
  postDate: string
  distribution: 'organic' | 'paid'
  durationSeconds: number
  reach: number
  nonFollowerReach: number
  threeSecondViews: number
  averageWatchTimeSeconds: number
  /** 0-1, e.g. 0.42 for 42%. If Instagram reports it as a percent, divide by 100 before entering. */
  completionRate: number
  replays: number
  saves: number
  shares: number
  comments: number
  profileVisits: number
  websiteClicks: number
  analysisStarts: number
  subscriptions: number
  adSpendUsd: number
}

export interface CalculatedFields {
  /** three-second views / reach — how well the hook stopped the scroll. */
  hookRetentionRate: number
  /** already tracked directly, but re-exposed here since it's a required "calculated field" per the spec. */
  completionRate: number
  /** website clicks / reach. */
  clickThroughRate: number
  /** subscriptions / analysis starts. */
  conversionRate: number
  /** ad spend / subscriptions. Only meaningful for paid rows with spend > 0. */
  costPerCustomerUsd: number | null
  costPerClickUsd: number | null
  costPerSubscriptionUsd: number | null
}

export function computeCalculatedFields(row: PerformanceRow): CalculatedFields {
  const hookRetentionRate = row.reach > 0 ? row.threeSecondViews / row.reach : 0
  const clickThroughRate = row.reach > 0 ? row.websiteClicks / row.reach : 0
  const conversionRate = row.analysisStarts > 0 ? row.subscriptions / row.analysisStarts : 0
  const hasSpend = row.distribution === 'paid' && row.adSpendUsd > 0

  return {
    hookRetentionRate,
    completionRate: row.completionRate,
    clickThroughRate,
    conversionRate,
    costPerCustomerUsd: hasSpend && row.subscriptions > 0 ? row.adSpendUsd / row.subscriptions : null,
    costPerClickUsd: hasSpend && row.websiteClicks > 0 ? row.adSpendUsd / row.websiteClicks : null,
    costPerSubscriptionUsd: hasSpend && row.subscriptions > 0 ? row.adSpendUsd / row.subscriptions : null,
  }
}

/** Compares hook variants by their calculated fields — used by dashboard.html. */
export function rankByHookRetention(rows: PerformanceRow[]): (PerformanceRow & CalculatedFields)[] {
  return rows
    .map((row) => ({ ...row, ...computeCalculatedFields(row) }))
    .sort((a, b) => b.hookRetentionRate - a.hookRetentionRate)
}

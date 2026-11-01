/** Approved launch catalog. Integer USD cents; independent of legacy Stripe subscriptions. */
export type ProgramPlan = 'metrics' | 'complete'
export type Billing = 'monthly' | 'annual'
export const STANDALONE_ASSESSMENT_CENTS = 5999
export const ASSESSMENT_CENTS = 4999
export const INDIVIDUAL_PLANS = {
  throwing: { name: 'Throwing Development', monthly: 2499, firstMonth: 1999, annual: 23999, assessment: ASSESSMENT_CENTS },
  complete: { name: 'Complete Development', monthly: 3999, firstMonth: 3499, annual: 37999, assessment: ASSESSMENT_CENTS },
  metrics: { name: 'Pitch Tracking', monthly: 2499, firstMonth: 1999, annual: 23999, assessment: 0 },
} as const
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

/** Approved launch catalog. Integer USD cents; independent of legacy Stripe subscriptions. */
export type ProgramPlan = 'metrics' | 'complete'
export type Billing = 'monthly' | 'annual'
export const STANDALONE_ASSESSMENT_CENTS = 2000
export const ASSESSMENT_CENTS = 4999
export const INDIVIDUAL_PLANS = {
  throwing: { name: 'Throwing Development', monthly: 2500, firstMonth: 2500, annual: 23999, assessment: 0 },
  complete: { name: 'Complete Development', monthly: 4500, firstMonth: 4500, annual: 37999, assessment: 0 },
  metrics: { name: 'Pitch Tracking', monthly: 2499, firstMonth: 1999, annual: 23999, assessment: 0 },
} as const
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

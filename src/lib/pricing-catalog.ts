/** Approved launch catalog. Integer USD cents; independent of legacy Stripe subscriptions. */
export type ProgramPlan = 'metrics' | 'complete'
export type Billing = 'monthly' | 'annual'
export const STANDALONE_ASSESSMENT_CENTS = 2000
export const ASSESSMENT_CENTS = 4999
export const FIRST_MONTH_DISCOUNT_CENTS = 500
export const ANNUAL_DISCOUNT_PERCENT = 25

export function subscriptionRates(monthly: number) {
  return {
    monthly,
    firstMonth: monthly - FIRST_MONTH_DISCOUNT_CENTS,
    annual: monthly * 12 * (100 - ANNUAL_DISCOUNT_PERCENT) / 100,
  }
}

export const INDIVIDUAL_PLANS = {
  throwing: { name: 'Throwing Development', ...subscriptionRates(2500), assessment: 0 },
  complete: { name: 'Complete Development', ...subscriptionRates(4500), assessment: 0 },
  metrics: { name: 'Pitch Tracking', ...subscriptionRates(2499), assessment: 0 },
} as const
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

/** Approved launch catalog. Integer USD cents; independent of legacy Stripe subscriptions. */
export type ProgramPlan = 'metrics' | 'complete'
export type Billing = 'monthly' | 'annual'
export const ASSESSMENT_CENTS = 4999
export const INDIVIDUAL_PLANS = {
  throwing: { name: 'Throwing Development', monthly: 2499, firstMonth: 1999, annual: 23999, assessment: ASSESSMENT_CENTS },
  complete: { name: 'Complete Development', monthly: 3999, firstMonth: 3499, annual: 37999, assessment: ASSESSMENT_CENTS },
  metrics: { name: 'Pitch Metrics', monthly: 2499, firstMonth: 1999, annual: 23999, assessment: 0 },
} as const
export const PROGRAM_TIERS = [
  { label: 'Players 1–9', seats: 9, metrics: { monthly: 2499, annual: 23999 }, complete: { monthly: 3999, annual: 37999 } },
  { label: 'Players 10–24', seats: 15, metrics: { monthly: 2199, annual: 20999 }, complete: { monthly: 3499, annual: 32999 } },
  { label: 'Players 25–49', seats: 25, metrics: { monthly: 1899, annual: 17999 }, complete: { monthly: 2999, annual: 27999 } },
  { label: 'Players 50+', seats: 451, metrics: { monthly: 1699, annual: 15999 }, complete: { monthly: 2699, annual: 24999 } },
] as const
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}
export function quoteProgram(players: number, plan: ProgramPlan, billing: Billing) {
  if (!Number.isInteger(players) || players < 1 || players > 500) throw new Error('Enter 1–500 players as a whole number.')
  if (plan !== 'metrics' && plan !== 'complete') throw new Error('Choose Pitch Metrics or Complete Development.')
  if (billing !== 'monthly' && billing !== 'annual') throw new Error('Choose monthly or annual billing.')
  let remaining = players, monthly = 0, annual = 0
  const breakdown = PROGRAM_TIERS.map(tier => {
    const seats = Math.min(remaining, tier.seats)
    remaining -= seats
    monthly += seats * tier[plan].monthly
    annual += seats * tier[plan].annual
    return { label: tier.label, seats, ...tier[plan] }
  }).filter(tier => tier.seats > 0)
  const firstMonth = monthly - players * 500
  const assessment = plan === 'complete' ? players * ASSESSMENT_CENTS : 0
  const subscription = billing === 'annual' ? annual : firstMonth
  const recurring = billing === 'annual' ? annual : monthly
  const monthlyFirstYear = firstMonth + monthly * 11
  return { players, plan, billing, breakdown, monthly, annual, firstMonth, assessment, subscription, recurring,
    dueNow: subscription + assessment,
    firstYear: (billing === 'annual' ? annual : monthlyFirstYear) + assessment,
    annualSavings: monthlyFirstYear - annual }
}

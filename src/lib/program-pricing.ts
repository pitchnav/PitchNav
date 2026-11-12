import 'server-only'
import { ASSESSMENT_CENTS, FIRST_MONTH_DISCOUNT_CENTS, subscriptionRates, type ProgramPlan, type Billing } from './pricing-catalog'
export { money, INDIVIDUAL_PLANS, type ProgramPlan, type Billing } from './pricing-catalog'

export const PROGRAM_TIERS = [
  { label: 'Players 1–9', seats: 9, metrics: subscriptionRates(2499), complete: subscriptionRates(3999) },
  { label: 'Players 10–24', seats: 15, metrics: subscriptionRates(2199), complete: subscriptionRates(3499) },
  { label: 'Players 25–49', seats: 25, metrics: subscriptionRates(1899), complete: subscriptionRates(2999) },
  { label: 'Players 50+', seats: 451, metrics: subscriptionRates(1699), complete: subscriptionRates(2699) },
] as const
export function quoteProgram(players: number, plan: ProgramPlan, billing: Billing) {
  if (!Number.isInteger(players) || players < 1 || players > 500) throw new Error('Enter 1–500 players as a whole number.')
  if (plan !== 'metrics' && plan !== 'complete') throw new Error('Choose Pitch Tracking or Complete Development.')
  if (billing !== 'monthly' && billing !== 'annual') throw new Error('Choose monthly or annual billing.')
  let remaining = players, monthly = 0, annual = 0
  const breakdown = PROGRAM_TIERS.map(tier => {
    const seats = Math.min(remaining, tier.seats)
    remaining -= seats
    monthly += seats * tier[plan].monthly
    annual += seats * tier[plan].annual
    return { label: tier.label, seats, ...tier[plan] }
  }).filter(tier => tier.seats > 0)
  const firstMonth = monthly - players * FIRST_MONTH_DISCOUNT_CENTS
  const assessment = plan === 'complete' ? players * ASSESSMENT_CENTS : 0
  const subscription = billing === 'annual' ? annual : firstMonth
  const recurring = billing === 'annual' ? annual : monthly
  const monthlyFirstYear = firstMonth + monthly * 11
  return { players, plan, billing, breakdown, monthly, annual, firstMonth, assessment, subscription, recurring,
    dueNow: subscription + assessment,
    firstYear: (billing === 'annual' ? annual : monthlyFirstYear) + assessment,
    annualSavings: monthlyFirstYear - annual }
}

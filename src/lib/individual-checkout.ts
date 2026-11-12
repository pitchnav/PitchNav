import { INDIVIDUAL_PLANS, STANDALONE_ASSESSMENT_CENTS, type Billing } from './pricing-catalog'

export type IndividualProduct = keyof typeof INDIVIDUAL_PLANS | 'assessment'
export type CheckoutBilling = Billing | 'one-time'

export function checkoutPath(plan: IndividualProduct, billing: CheckoutBilling = 'monthly') {
  return `/checkout/individual?plan=${plan}&billing=${plan === 'assessment' ? 'one-time' : billing}`
}

export function getCheckoutOption(plan: string | undefined, billing: string | undefined) {
  if (plan === 'assessment' && billing === 'one-time') {
    return { plan, billing, name: 'Standalone Pitching Assessment', initialTotal: STANDALONE_ASSESSMENT_CENTS,
      assessment: 0, recurring: 0, environmentKey: 'STRIPE_CHECKOUT_V2_ASSESSMENT_URL' }
  }
  if ((plan !== 'throwing' && plan !== 'complete' && plan !== 'metrics') ||
      (billing !== 'monthly' && billing !== 'annual')) return null
  const price = INDIVIDUAL_PLANS[plan]
  return { plan, billing, name: price.name,
    initialTotal: (billing === 'annual' ? price.annual : price.firstMonth) + price.assessment,
    assessment: price.assessment, recurring: billing === 'annual' ? price.annual : price.monthly,
    environmentKey: `STRIPE_CHECKOUT_${plan === 'metrics' && billing === 'monthly' ? '' : 'V3_'}${plan.toUpperCase()}_${billing.toUpperCase()}_URL` }
}

// Server-owned configuration only. Never accept a destination from query params.
export function configuredCheckoutUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com' || url.port ||
        url.username || url.password || url.pathname === '/') return null
    return url.toString()
  } catch { return null }
}

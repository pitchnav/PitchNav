import Stripe from 'stripe'

// Singleton server-side Stripe client. The placeholder allows a production
// build without local secrets; payment calls remain blocked until configured.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
export const isStripeConfigured = Boolean(stripeSecretKey)
export const stripe = new Stripe(stripeSecretKey || 'sk_test_missing_configuration', {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export type MembershipTier = 'throwing' | 'performance'

export const STRIPE_THROWING_PRICE_ID = process.env.STRIPE_THROWING_PRICE_ID
export const STRIPE_PERFORMANCE_PRICE_ID =
  process.env.STRIPE_PERFORMANCE_PRICE_ID ?? process.env.STRIPE_PRICE_ID
export const STRIPE_PRODUCT_ID = process.env.STRIPE_PRODUCT_ID!
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

const MEMBERSHIPS = {
  throwing: {
    priceId: STRIPE_THROWING_PRICE_ID,
    amountCents: 2500,
    label: 'Pitch Nav Throwing Development',
  },
  performance: {
    priceId: STRIPE_PERFORMANCE_PRICE_ID,
    amountCents: 4000,
    label: 'Pitch Nav Complete Performance',
  },
} as const

export async function createCheckoutSession({
  orderId,
  userId,
  membershipTier,
  successUrl,
  cancelUrl,
  previousSessionId,
}: {
  orderId: string
  userId: string
  membershipTier: MembershipTier
  successUrl: string
  cancelUrl: string
  previousSessionId: string | null
}) {
  if (!isStripeConfigured) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  const membership = MEMBERSHIPS[membershipTier]
  if (!membership.priceId) {
    throw new Error(
      membershipTier === 'throwing'
        ? 'STRIPE_THROWING_PRICE_ID is not configured'
        : 'STRIPE_PERFORMANCE_PRICE_ID is not configured'
    )
  }

  const price = await stripe.prices.retrieve(membership.priceId)
  if (!price.active || price.currency !== 'usd' || price.unit_amount !== membership.amountCents ||
      price.billing_scheme !== 'per_unit' || price.transform_quantity ||
      price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== 'licensed') {
    throw new Error('Configured membership price does not match the monthly offer')
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: membership.priceId,
        quantity: 1,
      },
    ],
    metadata: {
      order_id: orderId,
      user_id: userId,
      membership_tier: membershipTier,
      membership_label: membership.label,
      expected_amount_cents: String(membership.amountCents),
      renewal_terms_version: '2026-11-11-monthly',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        order_id: orderId,
        user_id: userId,
        membership_tier: membershipTier,
      },
    },
  }, { idempotencyKey: `order:${orderId}:${membershipTier}:${previousSessionId ?? 'initial'}` })

  return session
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!isStripeConfigured || !STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook configuration is missing')
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  )
}

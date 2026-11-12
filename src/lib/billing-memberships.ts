import type Stripe from 'stripe'
import { isStripeConfigured, stripe } from '@/lib/stripe'

export const billingOrderFields = 'id,stripe_checkout_session_id,stripe_payment_intent_id'
export const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export interface BillingOrder {
  id: string
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
}

function expectedLiveMode() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
  if (!isStripeConfigured || !/^(sk|rk)_(test|live)_/.test(key)) throw new Error('Billing unavailable')
  const live = /^(sk|rk)_live_/.test(key)
  const production = (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production'
  if (live !== production) throw new Error('Billing mode mismatch')
  return live
}

export async function linkedSubscription(order: BillingOrder, userId: string): Promise<Stripe.Subscription | null> {
  // The original webhook stores the subscription ID in the payment-intent column.
  const live = expectedLiveMode()
  let subscription: Stripe.Subscription
  if (order.stripe_payment_intent_id?.startsWith('sub_')) {
    subscription = await stripe.subscriptions.retrieve(order.stripe_payment_intent_id)
  } else if (order.stripe_checkout_session_id) {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id, { expand: ['subscription'] })
    if (session.livemode !== live || session.metadata?.user_id !== userId || session.metadata?.order_id !== order.id) {
      throw new Error('Unverified checkout')
    }
    if (session.status !== 'complete' || session.mode !== 'subscription' || !session.subscription) return null
    subscription = typeof session.subscription === 'string' ? await stripe.subscriptions.retrieve(session.subscription) : session.subscription
  } else {
    return null
  }
  if (subscription.livemode !== live || subscription.metadata.user_id !== userId || subscription.metadata.order_id !== order.id) {
    throw new Error('Unverified subscription')
  }
  return subscription
}

export function subscriptionState(subscription: Stripe.Subscription) {
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') return 'ended'
  if (subscription.cancel_at_period_end || (subscription.cancel_at && subscription.cancel_at <= subscription.current_period_end)) return 'scheduled'
  if (subscription.status === 'incomplete') return 'pending'
  return 'renewing'
}

export async function stopRenewal(subscription: Stripe.Subscription, expectedPeriodEnd: number) {
  const state = subscriptionState(subscription)
  if (state === 'ended' || state === 'scheduled') return 'confirmed'
  if (state !== 'renewing' || subscription.current_period_end !== expectedPeriodEnd) return 'changed'
  const updated = await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true, proration_behavior: 'none',
  })
  if (subscriptionState(updated) !== 'scheduled' && subscriptionState(updated) !== 'ended') throw new Error('Cancellation was not confirmed')
  return 'confirmed'
}

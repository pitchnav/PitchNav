import { type NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPaymentConfirmationEmail } from '@/lib/resend'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

async function confirmLegacyOrder(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id
  const userId = session.metadata?.user_id
  // Hosted individual links have a separate fulfillment contract.
  if (!orderId || !userId || session.mode !== 'subscription' || session.payment_status !== 'paid') return
  const tier = session.metadata?.membership_tier
  const price = tier === 'throwing' ? 2500 : tier === 'performance' ? 4000 : null
  if (!price || session.currency !== 'usd' || session.amount_subtotal !== price || session.amount_total == null) {
    throw new Error('Paid legacy session does not match its advertised membership')
  }
  const supabase = createAdminClient()
  const { data: order, error } = await supabase.from('orders')
    .select('id, status, refunded_at, payment_confirmed_at, stripe_checkout_session_id, athlete_profiles(athlete_full_name, athlete_email)')
    .eq('id', orderId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Could not read order')
  if (!order || order.payment_confirmed_at || order.refunded_at || ['cancelled', 'refunded'].includes(order.status)) return
  // Older checkout versions could leave the stored session empty. They still
  // supply the signed owner, order and tier metadata checked above.
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) {
    throw new Error('Paid session does not match the saved checkout')
  }
  let update = supabase.from('orders').update({
    status: 'awaiting_videos',
    payment_confirmed_at: new Date().toISOString(),
    stripe_checkout_session_id: session.id,
    // Preserve the legacy subscription reconciliation key in this column.
    stripe_payment_intent_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    amount_paid_cents: session.amount_total,
  }).eq('id', orderId).eq('user_id', userId).is('payment_confirmed_at', null)
    .is('refunded_at', null).not('status', 'in', '(cancelled,refunded)')
  update = order.stripe_checkout_session_id ? update.eq('stripe_checkout_session_id', session.id) : update.is('stripe_checkout_session_id', null)
  const written = await update.select('id').maybeSingle()
  if (written.error) throw new Error('Could not confirm order')
  if (!written.data) return

  await supabase.from('order_status_history').insert({
    order_id: orderId, old_status: order.status, new_status: 'awaiting_videos', note: 'Payment confirmed. Awaiting video submission.',
  })
  const profile = order.athlete_profiles as { athlete_full_name: string; athlete_email: string } | null
  if (!profile) return
  const result = await sendPaymentConfirmationEmail(profile.athlete_email, profile.athlete_full_name, orderId, session.amount_total)
  await supabase.from('email_log').insert({
    user_id: userId, order_id: orderId, resend_id: result.resendId, template: 'payment_confirmation',
    to_email: profile.athlete_email, subject: `Payment confirmed — Pitch Nav Order #${orderId.slice(0, 8).toUpperCase()}`, error: result.error,
  })
}

async function recordFullRefund(charge: Stripe.Charge) {
  if (!charge.refunded) return
  let orderId = charge.metadata?.order_id
  let userId: string | undefined
  if (charge.invoice) {
    const invoice = typeof charge.invoice === 'string' ? await stripe.invoices.retrieve(charge.invoice) : charge.invoice
    // A later renewal refund does not reverse the initial assessment order.
    if (invoice.billing_reason !== 'subscription_create') return
    orderId = invoice.subscription_details?.metadata?.order_id ?? orderId
    userId = invoice.subscription_details?.metadata?.user_id
  }
  if (!orderId) return

  const supabase = createAdminClient()
  let update = supabase.from('orders').update({ status: 'refunded', refunded_at: new Date().toISOString() })
    .eq('id', orderId).is('refunded_at', null)
  if (userId) update = update.eq('user_id', userId)
  const { data, error } = await update.select('id').maybeSingle()
  if (error) throw new Error('Could not record refund')
  if (data) await supabase.from('order_status_history').insert({
    order_id: orderId, new_status: 'refunded', note: 'Full initial payment refund confirmed by the payment processor.',
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await confirmLegacyOrder(event.data.object)
    } else if (event.type === 'charge.refunded') {
      await recordFullRefund(event.data.object)
    }
    // An unsuccessful card attempt does not reverse a previous confirmed payment.
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Could not process event', event.id, error instanceof Error ? error.message : '')
    return NextResponse.json({ error: 'Could not process payment event' }, { status: 500 })
  }
}

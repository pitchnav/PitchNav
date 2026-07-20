import { type NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendPaymentConfirmationEmail,
  sendSubmissionConfirmationEmail,
} from '@/lib/resend'
import type Stripe from 'stripe'
import { enqueueAutomaticVelocityJob } from '@/lib/automatic-velocity'

// Must export config to disable body parsing — Stripe needs the raw body
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id
      const userId = session.metadata?.user_id

      if (!orderId || !userId) {
        console.error('[Webhook] Missing metadata on session', session.id)
        break
      }

      // Idempotency: skip if order already confirmed
      const { data: existing } = await supabase
        .from('orders')
        .select('id, payment_confirmed_at, athlete_profiles(athlete_full_name, athlete_email)')
        .eq('id', orderId)
        .single()

      if (!existing || existing.payment_confirmed_at) {
        console.log('[Webhook] Order already confirmed or not found:', orderId)
        break
      }

      // Confirm payment and advance status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'submitted',
          payment_confirmed_at: new Date().toISOString(),
          stripe_payment_intent_id: (session.subscription as string) || null,
          amount_paid_cents: session.amount_total ?? 2500,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('[Webhook] Failed to update order:', updateError)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }

      // Record status history
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        old_status: 'awaiting_payment',
        new_status: 'submitted',
        note: 'Payment confirmed via Stripe webhook',
      })

      // Send confirmation emails
      const profile = existing.athlete_profiles as { athlete_full_name: string; athlete_email: string } | null
      if (profile) {
        const emailResult = await sendPaymentConfirmationEmail(
          profile.athlete_email,
          profile.athlete_full_name,
          orderId,
          session.amount_total ?? 2500
        )

        await supabase.from('email_log').insert({
          user_id: userId,
          order_id: orderId,
          resend_id: emailResult.resendId,
          template: 'payment_confirmation',
          to_email: profile.athlete_email,
          subject: `Payment confirmed — Pitch Nav Order #${orderId.slice(0, 8).toUpperCase()}`,
          error: emailResult.error,
        })
      }

      // This covers orders where a side-view file already exists when Stripe
      // confirms payment. The paid upload page also enqueues after upload.
      void enqueueAutomaticVelocityJob({ orderId }).catch((reason) =>
        console.error('[Webhook] Automatic velocity enqueue failed:', reason)
      )

      console.log('[Webhook] Order confirmed:', orderId)
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      const orderId = intent.metadata?.order_id
      if (orderId) {
        await supabase
          .from('orders')
          .update({ status: 'awaiting_payment' })
          .eq('id', orderId)
          .eq('status', 'submitted')

        console.log('[Webhook] Payment failed for order:', orderId)
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const orderId = charge.metadata?.order_id
      if (orderId) {
        await supabase
          .from('orders')
          .update({ status: 'refunded', refunded_at: new Date().toISOString() })
          .eq('id', orderId)

        await supabase.from('order_status_history').insert({
          order_id: orderId,
          new_status: 'refunded',
          note: 'Refund processed via Stripe',
        })
      }
      break
    }

    default:
      // Unhandled event type — log and ignore
      console.log(`[Webhook] Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

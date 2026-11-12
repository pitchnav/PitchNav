import { getEligibleAthlete } from '@/lib/athlete-eligibility'
import { isStoreWrapper } from '@/lib/store-wrapper'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createCheckoutSession, stripe } from '@/lib/stripe'
import type { MembershipTier } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    if (isStoreWrapper(request.headers.get('user-agent'))) {
      return NextResponse.json({ error: 'Purchases are unavailable in this mobile app.' }, { status: 403 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, membershipTier, acceptsRecurringBilling } = await request.json() as {
      orderId?: string
      membershipTier?: MembershipTier
      acceptsRecurringBilling?: boolean
    }
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }
    if (membershipTier !== 'throwing' && membershipTier !== 'performance') {
      return NextResponse.json({ error: 'Choose a valid membership option' }, { status: 400 })
    }

    if (acceptsRecurringBilling !== true) {
      return NextResponse.json({ error: 'Confirm the monthly renewal terms before continuing.' }, { status: 400 })
    }

    // Fetch and validate the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, athlete_profile_id, status, payment_confirmed_at, refunded_at, stripe_checkout_session_id')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.refunded_at || order.status === 'refunded' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'This order is closed.' }, { status: 409 })
    }
    if (order.payment_confirmed_at) {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 })
    }

    const eligibility = await getEligibleAthlete(supabase, user.id, order.athlete_profile_id)
    if (eligibility.error) return NextResponse.json({ error: 'Could not verify the intake. Try again before paying.' }, { status: 503 })
    if (!eligibility.data || eligibility.data !== order.athlete_profile_id) {
      return NextResponse.json({ error: 'Complete the athlete intake and any required guardian approval before paying.' }, { status: 409 })
    }

    const previousId: string | null = order.stripe_checkout_session_id
    if (previousId) {
      const previous = await stripe.checkout.sessions.retrieve(previousId)
      if (previous.metadata?.order_id !== orderId || previous.metadata.user_id !== user.id) {
        return NextResponse.json({ error: 'Contact billing support about this order.' }, { status: 409 })
      }
      if (previous.status === 'complete') {
        return NextResponse.json({ error: 'Payment is being confirmed. Check your order before starting another purchase.' }, { status: 409 })
      }
      if (previous.status === 'open') {
        if (previous.metadata.membership_tier === membershipTier && previous.url) {
          return NextResponse.json({ url: previous.url })
        }
        // A completed session cannot be expired. If payment wins this race,
        // stop here instead of offering a second subscription.
        await stripe.checkout.sessions.expire(previousId)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await createCheckoutSession({
      orderId,
      userId: user.id,
      previousSessionId: previousId,
      membershipTier,
      successUrl: `${appUrl}/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/checkout?orderId=${orderId}&plan=${membershipTier}`,
    })

    if (!session.url) throw new Error('Checkout session has no URL')
    // Only the webhook/admin role can write billing fields. Claim this session
    // before handing the link to the customer. Parallel requests may share
    // the same idempotent Stripe result or compete with another plan choice.
    const admin = createAdminClient()
    let claim = admin.from('orders').update({ stripe_checkout_session_id: session.id })
      .eq('id', orderId).eq('user_id', user.id).is('payment_confirmed_at', null)
      .is('refunded_at', null).not('status', 'in', '(cancelled,refunded)')
    claim = previousId ? claim.eq('stripe_checkout_session_id', previousId) : claim.is('stripe_checkout_session_id', null)
    const result = await claim.select('id').maybeSingle()
    if (result.error) throw new Error('Could not save checkout session')
    if (!result.data) {
      const current = await admin.from('orders').select('stripe_checkout_session_id, payment_confirmed_at, refunded_at, status')
        .eq('id', orderId).eq('user_id', user.id).maybeSingle()
      if (current.error) throw new Error('Could not check checkout session')
      if (!current.data || current.data.stripe_checkout_session_id !== session.id ||
          current.data.payment_confirmed_at || current.data.refunded_at || ['cancelled', 'refunded'].includes(current.data.status)) {
        // This link was never handed out. A different session won the claim.
        return NextResponse.json({ error: 'This order changed during checkout. Refresh your order and try again.' }, { status: 409 })
      }
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] Error:', err)
    return NextResponse.json(
      { error: 'Could not create checkout session' },
      { status: 500 }
    )
  }
}

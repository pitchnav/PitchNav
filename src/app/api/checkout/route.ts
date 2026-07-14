import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Fetch and validate the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, athlete_profiles(athlete_full_name, athlete_email)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_confirmed_at) {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const athleteName = (order.athlete_profiles as { athlete_full_name: string })?.athlete_full_name ?? 'Athlete'

    const session = await createCheckoutSession({
      orderId,
      athleteName,
      userId: user.id,
      successUrl: `${appUrl}/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/checkout?orderId=${orderId}`,
    })

    // Store the session ID on the order for webhook verification
    await supabase
      .from('orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', orderId)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] Error:', err)
    return NextResponse.json(
      { error: 'Could not create checkout session' },
      { status: 500 }
    )
  }
}

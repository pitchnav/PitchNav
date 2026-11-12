import { NextRequest, NextResponse } from 'next/server'
import { billingOrderFields, linkedSubscription, stopRenewal, uuidPattern } from '@/lib/billing-memberships'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin
  if (request.headers.get('origin') !== origin) return new Response('Open cancellation from the Billing page.', { status: 403 })
  const data = await request.formData().catch(() => null)
  const id = data?.get('order')
  const periodEnd = Number(data?.get('periodEnd'))
  if (typeof id !== 'string' || !uuidPattern.test(id) || data?.get('confirm') !== 'end-of-period' ||
      !Number.isSafeInteger(periodEnd) || periodEnd <= 0) return new Response('Review the subscription and confirm cancellation.', { status: 400 })

  const back = new URL('/billing/manage', origin)
  back.searchParams.set('order', id)
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) {
      const login = new URL('/login', origin)
      login.searchParams.set('redirectTo', back.pathname + back.search)
      return NextResponse.redirect(login, 303)
    }
    const { data: order, error } = await db.from('orders').select(billingOrderFields)
      .eq('user_id', user.id).eq('id', id).maybeSingle()
    if (error) throw new Error('Order lookup failed')
    if (!order) return new Response('No linked order found.', { status: 404 })
    const subscription = await linkedSubscription(order, user.id)
    if (!subscription) return new Response('No linked subscription found.', { status: 404 })
    back.searchParams.set('result', await stopRenewal(subscription, periodEnd))
  } catch {
    back.searchParams.set('result', 'unconfirmed')
  }
  return NextResponse.redirect(back, 303)
}

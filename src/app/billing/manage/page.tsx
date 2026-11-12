import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type Stripe from 'stripe'
import { PolicyDocument, PolicySection } from '@/components/layout/PolicyDocument'
import { billingOrderFields, linkedSubscription, subscriptionState, uuidPattern, type BillingOrder } from '@/lib/billing-memberships'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Manage subscriptions', robots: { index: false, follow: false } }

const formatDate = (seconds: number) => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full', timeZone: 'UTC',
}).format(new Date(seconds * 1000))

async function Membership({ order, userId }: { order: BillingOrder; userId: string }) {
  const label = 'Order ' + order.id.slice(0, 8).toUpperCase()
  let sub: Stripe.Subscription | null
  try { sub = await linkedSubscription(order, userId) }
  catch {
    return <PolicySection title={label}><p>We couldn’t verify this order’s subscription status with Stripe. Retry or use the cancellation request below.</p></PolicySection>
  }
  if (!sub) return <PolicySection title={label}><p>This checkout has no completed subscription.</p></PolicySection>

  const state = subscriptionState(sub)
  const name = sub.metadata.membership_label || (sub.metadata.membership_tier === 'performance'
    ? 'Complete Performance' : sub.metadata.membership_tier === 'throwing' ? 'Throwing Development' : 'Membership')
  return <PolicySection title={name + ' · ' + label}>
    {state === 'ended' ? <p>This subscription has ended. Renewals are off.</p>
      : state === 'scheduled' ? <p>Renewals are off. Your subscription is scheduled to end on {formatDate(sub.cancel_at || sub.current_period_end)} (UTC).</p>
      : state === 'pending' ? <p>The subscription’s initial payment is incomplete. Use billing support below if you need help.</p>
      : <>
        <p>Stripe lists this subscription as {sub.status.replaceAll('_', ' ')}. Its current billing period ends on {formatDate(sub.current_period_end)} (UTC).</p>
        {sub.cancel_at && sub.cancel_at > sub.current_period_end && <p>Cancellation is currently scheduled for {formatDate(sub.cancel_at)} (UTC). You can stop renewal at the earlier end of the current period.</p>}
        <p>Confirm below to stop renewal at the end of this period. Charges already due may still be collected.</p>
        <form action="/api/billing/cancel" method="post">
          <input type="hidden" name="order" value={order.id} />
          <input type="hidden" name="periodEnd" value={sub.current_period_end} />
          <button type="submit" name="confirm" value="end-of-period" className="btn-action mt-3">Confirm cancellation at period end</button>
        </form>
      </>}
  </PolicySection>
}

export default async function ManageSubscriptions({ searchParams }: {
  searchParams: Promise<{ order?: string; after?: string; result?: string }>
}) {
  const params = await searchParams
  const orderId = typeof params.order === 'string' && uuidPattern.test(params.order) ? params.order : undefined
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login?redirectTo=' + encodeURIComponent('/billing/manage' + (orderId ? '?order=' + orderId : '')))
  const pageSize = 10
  let query = db.from('orders').select(billingOrderFields).eq('user_id', user.id)
    .or('stripe_checkout_session_id.not.is.null,stripe_payment_intent_id.like.sub*').order('id').limit(pageSize + 1)
  if (orderId) query = query.eq('id', orderId)
  else if (typeof params.after === 'string' && uuidPattern.test(params.after)) query = query.gt('id', params.after)
  const { data, error } = await query
  const orders: BillingOrder[] = data || []
  return <PolicyDocument title="Manage subscriptions" underReview={false}>
    {params.result === 'unconfirmed' && <p role="alert">We couldn’t confirm that cancellation was saved. Check the status below and retry or contact billing support.</p>}
    {params.result === 'changed' && <p role="alert">The billing period or subscription status changed. Review the latest details before confirming.</p>}
    {error ? <p role="alert">We couldn’t load your billing records. Refresh this page or use billing support below.</p>
      : orders.length === 0 ? <p>No linked subscription orders were found for this account{params.after ? ' on this page' : ''}. If you paid through a separate checkout link, use the options below.</p>
      : orders.slice(0, pageSize).map(order => <Membership key={order.id} order={order} userId={user.id} />)}
    {orders.length > pageSize && <p><Link href={'/billing/manage?after=' + orders[pageSize - 1].id}>More billing records</Link></p>}
    {(orderId || params.after) && <p><Link href="/billing/manage">See all linked subscriptions</Link></p>}
    <PolicySection title="Other purchases and billing support">
      <p>For a subscription purchased through a separate checkout link, see <Link href="/billing">billing options</Link> or send a <Link href="/contact?topic=cancellation">cancellation request</Link> using the email from your receipt.</p>
    </PolicySection>
  </PolicyDocument>
}

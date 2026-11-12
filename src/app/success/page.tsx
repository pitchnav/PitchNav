import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Payment status', robots: { index: false, follow: false } }

export default async function SuccessPage({ searchParams }: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams
  if (!orderId) redirect('/dashboard/orders')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: order, error } = await supabase.from('orders')
    .select('id, status, payment_confirmed_at, refunded_at')
    .eq('id', orderId).eq('user_id', user.id).maybeSingle()
  if (error?.code === '22P02') notFound()
  if (error) throw new Error('Could not check payment status.')
  if (!order) notFound()

  const closed = Boolean(order.refunded_at) || order.status === 'refunded' || order.status === 'cancelled'
  const paid = Boolean(order.payment_confirmed_at) && !closed
  const canUpload = paid && ['intake_started', 'awaiting_payment', 'awaiting_videos', 'submitted', 'additional_video_requested'].includes(order.status)
  const title = closed ? 'Order closed' : paid ? 'Payment confirmed' : 'Awaiting payment confirmation'

  return <div className="min-h-screen bg-navy-950 px-4 pb-20 pt-28">
    <section className="card mx-auto max-w-lg space-y-5">
      <p className="text-sm text-slate-400">Order #{order.id.slice(0, 8).toUpperCase()}</p>
      <h1 className="text-3xl font-black text-white">{title}</h1>
      {canUpload && <Link href={`/start-analysis/upload?orderId=${order.id}`} className="btn-action">Continue to video upload</Link>}
      {!paid && !closed && <>
        <p className="text-slate-300">If you just paid, the processor may still be confirming your payment. Check the status again before starting another checkout.</p>
        <a className="btn-secondary" href={`/success?orderId=${order.id}`}>Check status again</a>
      </>}
      <div><Link href={`/dashboard/orders/${order.id}`} className="text-electric-blue-light underline">View order</Link></div>
      <Link href="/billing" className="inline-block text-electric-blue-light underline">Billing help</Link>
    </section>
  </div>
}

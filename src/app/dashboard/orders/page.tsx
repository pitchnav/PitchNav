import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import type { AthleteProfile } from '@/types/database'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, athlete_profiles(athlete_full_name, playing_level)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">My Orders</h1>

      {!orders?.length ? (
        <div className="card text-center py-16">
          <p className="text-slate-400 mb-4">You haven&apos;t placed any orders yet.</p>
          <Link href="/start-analysis" className="btn-primary">Start My First Analysis</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const ap = order.athlete_profiles as Partial<AthleteProfile>
            return (
              <div key={order.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{ap?.athlete_full_name ?? 'Athlete'}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Order #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                      {formatDateShort(order.created_at)}
                      {order.amount_paid_cents && ` · ${formatCurrency(order.amount_paid_cents)}`}
                    </p>
                    {order.delivery_estimate_text && (
                      <p className="text-xs text-slate-500 mt-1">{order.delivery_estimate_text}</p>
                    )}
                  </div>
                  <Link
                    href={order.status === 'complete'
                      ? `/dashboard/reports/${order.id}`
                      : `/dashboard/orders/${order.id}`}
                    className={order.status === 'complete' ? 'btn-accent text-sm px-4 py-2' : 'btn-secondary text-sm px-4 py-2'}
                  >
                    {order.status === 'complete' ? 'View Report' : 'View Details'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

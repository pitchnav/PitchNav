import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Quick stats
  const [
    { count: totalOrders },
    { count: activeOrders },
    { count: completedOrders },
    { count: flaggedHealth },
    { count: pendingDeletions },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("complete","cancelled","refunded")'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'complete'),
    supabase.from('athlete_profiles').select('*', { count: 'exact', head: true }).eq('health_flagged', true),
    supabase.from('deletion_requests').select('*', { count: 'exact', head: true }).is('processed_at', null),
  ])

  // Recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, athlete_profiles(athlete_full_name)')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">Admin Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: totalOrders ?? 0, color: 'text-white' },
          { label: 'Active', value: activeOrders ?? 0, color: 'text-electric-blue-light' },
          { label: 'Complete', value: completedOrders ?? 0, color: 'text-accent-green' },
          { label: 'Health Flags', value: flaggedHealth ?? 0, color: 'text-yellow-400' },
          { label: 'Pending Deletions', value: pendingDeletions ?? 0, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(flaggedHealth ?? 0) > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-400">
            <strong>{flaggedHealth} athlete profile(s)</strong> have health flags from the intake screening.
            Review before proceeding with analysis.{' '}
            <Link href="/admin/athletes?filter=health_flagged" className="underline hover:no-underline">
              View Flagged Athletes
            </Link>
          </p>
        </div>
      )}

      {(pendingDeletions ?? 0) > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">
            <strong>{pendingDeletions} pending deletion request(s)</strong> need to be processed.
          </p>
        </div>
      )}

      {/* Recent orders table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="btn-secondary text-sm px-4 py-2">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Order ID', 'Athlete', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-widest text-slate-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {recentOrders?.map((order) => (
                <tr key={order.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3 pr-4 font-mono text-xs text-slate-400">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="py-3 pr-4 text-white font-medium">
                    {(order.athlete_profiles as { athlete_full_name: string })?.athlete_full_name ?? '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">{formatDateShort(order.created_at)}</td>
                  <td className="py-3">
                    <Link href={`/admin/orders/${order.id}`} className="text-electric-blue-light hover:underline text-xs">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

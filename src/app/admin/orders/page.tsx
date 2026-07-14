import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { formatDateShort, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'

interface SearchParams {
  status?: string
  q?: string
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select('*, athlete_profiles(athlete_full_name, health_flagged)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: orders } = await query

  // Client-side text filter
  const filtered = orders?.filter((o) => {
    if (!q) return true
    const name = (o.athlete_profiles as { athlete_full_name: string })?.athlete_full_name ?? ''
    return (
      name.toLowerCase().includes(q.toLowerCase()) ||
      o.id.toLowerCase().includes(q.toLowerCase())
    )
  }) ?? []

  const statusOptions = Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">All Orders</h1>

      {/* Filters */}
      <div className="card mb-6">
        <form className="flex flex-col sm:flex-row gap-4" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by athlete name or order ID…"
            className="input flex-1"
          />
          <select name="status" defaultValue={status ?? ''} className="input sm:w-64">
            <option value="">All Statuses</option>
            {statusOptions.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary whitespace-nowrap">Filter</button>
          {(status || q) && (
            <Link href="/admin/orders" className="btn-secondary whitespace-nowrap">Clear</Link>
          )}
        </form>
      </div>

      <p className="text-sm text-slate-500 mb-4">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-navy-800">
              <tr>
                {['Order ID', 'Athlete', 'Status', 'Submitted', 'Health Flag', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-widest text-slate-500 py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((order) => {
                const profile = order.athlete_profiles as { athlete_full_name: string; health_flagged: boolean } | null
                return (
                  <tr key={order.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-3 px-4 text-white font-medium">{profile?.athlete_full_name ?? '—'}</td>
                    <td className="py-3 px-4"><OrderStatusBadge status={order.status} /></td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{order.submitted_at ? formatDateShort(order.submitted_at) : '—'}</td>
                    <td className="py-3 px-4">
                      {profile?.health_flagged ? (
                        <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">⚠ Flagged</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/orders/${order.id}`} className="text-electric-blue-light hover:underline text-xs font-medium">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils'
import type { Order, AthleteProfile } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, athlete_profiles(athlete_full_name, playing_level, throwing_hand, current_avg_velocity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const activeOrders = orders?.filter((o) => !['complete', 'cancelled', 'refunded'].includes(o.status)) ?? []
  const completedOrders = orders?.filter((o) => o.status === 'complete') ?? []
  const { data: motionAnalyses } = await supabase
    .from('motion_analyses')
    .select('id,title,status,delivery_score,velocity_estimate_low,velocity_estimate_high,velocity_confidence,coach_feedback,created_at,training_plans(duration_weeks,follow_up_date)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-slate-400 mt-1">Track your analyses and view your reports here.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Analyses', value: (orders?.length ?? 0) + (motionAnalyses?.length ?? 0) },
          { label: 'Active', value: activeOrders.length },
          { label: 'Completed', value: completedOrders.length },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {!!motionAnalyses?.length && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-white">Saved Motion Lab Analyses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {motionAnalyses.map((analysis) => {
              const plan = Array.isArray(analysis.training_plans) ? analysis.training_plans[0] : analysis.training_plans
              return (
                <div key={analysis.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{analysis.title}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">{analysis.status.replaceAll('_', ' ')}</p>
                    </div>
                    {analysis.delivery_score !== null && <span className="rounded-lg bg-electric-blue/10 px-3 py-1 text-sm font-black text-electric-blue-light">{analysis.delivery_score}/30</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-navy-950 p-3"><p className="text-xs text-slate-500">Velocity estimate</p><p className="mt-1 font-bold text-white">{analysis.velocity_estimate_low !== null ? `${Math.round(analysis.velocity_estimate_low)}–${Math.round(analysis.velocity_estimate_high)} mph` : '—'}</p></div>
                    <div className="rounded-lg bg-navy-950 p-3"><p className="text-xs text-slate-500">Training plan</p><p className="mt-1 font-bold text-white">{plan?.duration_weeks ? `${plan.duration_weeks} weeks` : 'Pending coach'}</p></div>
                  </div>
                  {analysis.coach_feedback && <p className="mt-4 line-clamp-3 text-sm text-slate-300">{analysis.coach_feedback}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Active Orders</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const ap = order.athlete_profiles as Partial<AthleteProfile>
              return (
                <div key={order.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-white">{ap?.athlete_full_name ?? 'Athlete'}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Submitted {formatDateShort(order.created_at)} ·{' '}
                      {order.delivery_estimate_text ?? 'Delivery within 5–7 business days'}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="btn-secondary text-sm px-4 py-2 flex-shrink-0"
                  >
                    View Details <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed reports */}
      {completedOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Completed Reports</h2>
          <div className="space-y-3">
            {completedOrders.map((order) => {
              const ap = order.athlete_profiles as Partial<AthleteProfile>
              return (
                <div key={order.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent-green flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white">{ap?.athlete_full_name ?? 'Athlete'}</p>
                      <p className="text-xs text-slate-500">
                        Completed {order.completed_at ? formatDateShort(order.completed_at) : ''}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/reports/${order.id}`}
                    className="btn-accent text-sm px-4 py-2 flex-shrink-0"
                  >
                    View Report <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!orders?.length && !motionAnalyses?.length && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">⚾</div>
          <h2 className="text-xl font-bold text-white mb-2">No analyses yet</h2>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            Start your first pitching analysis to begin understanding your delivery and developing your velocity.
          </p>
          <Link href="/start-analysis" className="btn-primary">
            <Plus className="h-4 w-4" /> Start My First Analysis
          </Link>
        </div>
      )}

      {/* CTA to start new */}
      {((orders?.length ?? 0) > 0 || (motionAnalyses?.length ?? 0) > 0) && (
        <div className="card border-electric-blue/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">Ready for a follow-up?</h3>
            <p className="text-sm text-slate-400">Track your development with another analysis.</p>
          </div>
          <Link href="/start-analysis" className="btn-primary flex-shrink-0">
            <Plus className="h-4 w-4" /> New Analysis
          </Link>
        </div>
      )}
    </div>
  )
}

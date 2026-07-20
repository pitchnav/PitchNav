import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, CheckCircle, Activity, Clock, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { AnimatedStat } from '@/components/dashboard/AnimatedStat'
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
    .select('*, athlete_profiles(athlete_full_name, playing_level, throwing_hand, current_avg_velocity), video_submissions(id,angle)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const activeOrders = orders?.filter((o) => !['complete', 'cancelled', 'refunded'].includes(o.status)) ?? []
  const completedOrders = orders?.filter((o) => o.status === 'complete') ?? []
  const { data: motionAnalyses } = await supabase
    .from('motion_analyses')
    .select('id,title,status,delivery_score,velocity_estimate_low,velocity_estimate_high,velocity_confidence,strengths,development_priorities,coach_feedback,created_at,training_plans(duration_weeks,follow_up_date,weeks,title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-black text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-slate-400 mt-1">Track your analyses and view your reports here.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Analyses', value: (orders?.length ?? 0) + (motionAnalyses?.length ?? 0), icon: Activity, accentClassName: 'text-electric-blue-light' },
          { label: 'Active', value: activeOrders.length, icon: Clock, accentClassName: 'text-yellow-300' },
          { label: 'Completed', value: completedOrders.length, icon: CheckCircle, accentClassName: 'text-accent-green' },
        ].map(({ label, value, icon, accentClassName }, i) => (
          <AnimatedStat key={label} label={label} value={value} icon={icon} accentClassName={accentClassName} delayMs={i * 90} />
        ))}
      </div>

      {!!motionAnalyses?.length && (
        <div id="feedback-plan" className="mb-8 scroll-mt-24">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-green">Staff-reviewed delivery</p>
              <h2 className="mt-1 text-lg font-bold text-white">Your Feedback & Training Plan</h2>
              <p className="mt-1 text-sm text-slate-400">Submissions are analyzed first, then released after the Pitch Nav staff reviews the video, scores, velocity assumptions, and plan.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {motionAnalyses.map((analysis, i) => {
              const plan = Array.isArray(analysis.training_plans) ? analysis.training_plans[0] : analysis.training_plans
              return (
                <div
                  key={analysis.id}
                  className="card animate-slide-up transition-all duration-200 [animation-fill-mode:backwards] hover:-translate-y-1 hover:border-electric-blue/30"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{analysis.title}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">{analysis.status.replaceAll('_', ' ')}</p>
                    </div>
                    {analysis.status === 'published' && analysis.delivery_score !== null && <span className="rounded-lg bg-electric-blue/10 px-3 py-1 text-sm font-black text-electric-blue-light">{analysis.delivery_score}/30</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-navy-950 p-3"><p className="text-xs text-slate-500">Velocity estimate</p><p className="mt-1 font-bold text-white">{analysis.status === 'published' && analysis.velocity_estimate_low !== null ? `${Math.round(analysis.velocity_estimate_low)}–${Math.round(analysis.velocity_estimate_high)} mph` : '—'}</p></div>
                    <div className="rounded-lg bg-navy-950 p-3"><p className="text-xs text-slate-500">Training plan</p><p className="mt-1 font-bold text-white">{analysis.status === 'published' && plan?.duration_weeks ? `${plan.duration_weeks} weeks` : 'Pending coach'}</p></div>
                  </div>
                  {analysis.status === 'published' && analysis.coach_feedback && <p className="mt-4 line-clamp-3 text-sm text-slate-300">{analysis.coach_feedback}</p>}
                  {analysis.status === 'published' && !!analysis.strengths?.length && <p className="mt-4 text-sm text-slate-300"><span className="font-semibold text-accent-green">Starting strength:</span> {analysis.strengths[0]}</p>}
                  {analysis.status === 'published' && !!analysis.development_priorities?.length && <p className="mt-2 text-sm text-slate-300"><span className="font-semibold text-electric-blue-light">First priority:</span> {analysis.development_priorities[0]}</p>}
                  {analysis.status === 'published' && plan?.weeks?.length > 0 && (
                    <div className="mt-4 rounded-lg border border-surface-border bg-navy-950 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Week 1</p>
                      <p className="mt-1 text-sm text-white">{plan.weeks[0]?.priority}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    {analysis.status === 'published' ? (
                      <Link href={`/dashboard/feedback/${analysis.id}`} className="group inline-flex items-center text-sm font-semibold text-accent-green hover:text-white">
                        View approved feedback & calendar <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-300">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-pulse-slow rounded-full bg-yellow-300 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-300" />
                        </span>
                        Staff review in progress — we’ll email you when ready
                      </span>
                    )}
                    <Link href="/dashboard/motion-lab" className="group inline-flex items-center text-sm font-semibold text-electric-blue-light hover:text-white">
                      Open Motion Lab <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
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
            {activeOrders.map((order, i) => {
              const ap = order.athlete_profiles as Partial<AthleteProfile>
              const submittedVideos = (order.video_submissions ?? []) as Array<{ id: string; angle: string }>
              const openSideVideo = submittedVideos.find((video) => video.angle === 'open_side')
              return (
                <div
                  key={order.id}
                  className="card animate-slide-up flex flex-col gap-4 transition-all duration-200 [animation-fill-mode:backwards] hover:-translate-y-1 hover:border-electric-blue/30 sm:flex-row sm:items-center sm:justify-between"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-white">{ap?.athlete_full_name ?? 'Athlete'}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Submitted {formatDateShort(order.created_at)} ·{' '}
                      Automated Motion Lab feedback is available immediately after video analysis
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {openSideVideo && (
                      <Link href={`/dashboard/motion-lab?videoId=${openSideVideo.id}`} className="btn-primary group text-sm px-4 py-2">
                        Analyze Now <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                    )}
                    <Link href={`/dashboard/orders/${order.id}`} className="btn-secondary group text-sm px-4 py-2 flex-shrink-0">
                      View Details <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
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
            {completedOrders.map((order, i) => {
              const ap = order.athlete_profiles as Partial<AthleteProfile>
              return (
                <div
                  key={order.id}
                  className="card animate-slide-up flex flex-col gap-4 transition-all duration-200 [animation-fill-mode:backwards] hover:-translate-y-1 hover:border-accent-green/30 sm:flex-row sm:items-center sm:justify-between"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
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
                    className="btn-accent group text-sm px-4 py-2 flex-shrink-0"
                  >
                    View Report <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!orders?.length && !motionAnalyses?.length && (
        <div className="card animate-fade-in py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-electric-blue/10 shadow-glow">
            <Video className="h-6 w-6 text-electric-blue-light" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No analyses yet</h2>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            Start your first pitching analysis to begin understanding your delivery and developing your velocity.
          </p>
          <Link href="/start-analysis" className="btn-primary group">
            <Plus className="h-4 w-4" /> Start My First Analysis
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {/* CTA to start new */}
      {((orders?.length ?? 0) > 0 || (motionAnalyses?.length ?? 0) > 0) && (
        <div className="card animate-fade-in border-electric-blue/20 flex flex-col items-center justify-between gap-4 transition-all duration-200 hover:-translate-y-1 hover:border-electric-blue/40 sm:flex-row">
          <div>
            <h3 className="font-semibold text-white">Ready for a follow-up?</h3>
            <p className="text-sm text-slate-400">Track your development with another analysis.</p>
          </div>
          <Link href="/start-analysis" className="btn-primary group flex-shrink-0">
            <Plus className="h-4 w-4" /> New Analysis
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

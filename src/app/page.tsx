import Link from 'next/link'
import { Activity, ArrowRight, CalendarDays, Gauge, LayoutDashboard } from 'lucide-react'
import { PublicHome } from '@/components/home/PublicHome'
import { createClient } from '@/lib/supabase/server'
import { calculateDeliveryScore } from '@/lib/utils'

type HomeCategory = { category: string; score: number; strength?: string }

function AuthenticatedHome({ firstName, latest, activeOrders }: { firstName: string; latest: any; activeOrders: number }) {
  const categories = (latest?.category_scores ?? []) as HomeCategory[]
  const deliveryScore = calculateDeliveryScore(categories, latest?.delivery_score)
  const plan = Array.isArray(latest?.training_plans) ? latest.training_plans[0] : latest?.training_plans
  const weekOne = plan?.weeks?.[0]
  return (
    <div className="min-h-screen bg-navy-950 pb-20 pt-24">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-brand-line pb-8 sm:pb-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div><h1 className="page-title text-white">Welcome back, {firstName}.</h1><p className="mt-3 max-w-2xl text-slate-400">Your latest scores, video feedback, and weekly plan are collected here.</p></div>
            <div className="flex flex-wrap gap-3"><Link href="/dashboard" className="btn-primary"><LayoutDashboard className="h-4 w-4" /> Full Dashboard</Link><Link href="/dashboard/motion-lab" className="btn-secondary"><Activity className="h-4 w-4" /> Video Review</Link></div>
          </div>
        </div>

        {/* Velocity-estimate tile removed 2026-10-25: D-010 deleted the producer,
            so velocity_estimate_low is never written and the tile always read "—". */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">Overall score</p><p className="mt-2 text-4xl font-black text-white">{deliveryScore ?? '—'}<span className="text-lg text-electric-blue-light">/30</span></p></div>
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">Current plan</p><p className="mt-2 text-3xl font-black text-white">{plan?.duration_weeks ? `${plan.duration_weeks} weeks` : '—'}</p><p className="mt-1 text-xs text-slate-400">Monday–Sunday calendar</p></div>
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">Active submissions</p><p className="mt-2 text-4xl font-black text-white">{activeOrders}</p><p className="mt-1 text-xs text-slate-400">In your account</p></div>
        </div>

        {latest ? <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Latest video feedback</p><h2 className="mt-1 text-2xl font-black text-white">Mechanics breakdown</h2></div><Gauge className="h-8 w-8 text-electric-blue-light" /></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{categories.map((item) => <div key={item.category} className="rounded-xl border border-surface-border bg-navy-950 p-4"><div className="flex justify-between gap-3"><p className="font-semibold text-white">{item.category}</p><p className="font-black text-electric-blue-light">{item.score}/5</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-700"><div className="h-full rounded-full bg-electric-blue" style={{ width: `${item.score * 20}%` }} /></div>{item.strength && <p className="mt-3 line-clamp-2 text-xs text-slate-400">{item.strength}</p>}</div>)}</div>
            <Link href={`/dashboard/feedback/${latest.id}`} className="btn-accent mt-6">View Full Feedback <ArrowRight className="h-4 w-4" /></Link>
          </section>
          <section className="card"><CalendarDays className="h-7 w-7 text-accent-green" /><p className="mt-4 text-xs font-bold uppercase tracking-widest text-accent-green">This week</p><h2 className="mt-1 text-xl font-black text-white">{weekOne?.priority ?? 'Plan ready after analysis'}</h2><div className="mt-5 space-y-3">{weekOne?.days?.slice(0, 3).map((day: any) => <div key={day.day} className="rounded-lg bg-navy-950 p-3"><p className="text-xs font-bold text-white">{day.day} · {day.focus}</p><p className="mt-1 line-clamp-2 text-xs text-slate-400">{day.work}</p></div>)}</div><Link href={`/dashboard/feedback/${latest.id}`} className="mt-5 inline-flex text-sm font-semibold text-electric-blue-light">Open full calendar <ArrowRight className="ml-1 h-4 w-4" /></Link></section>
        </div> : <section className="card mt-8 py-12 text-center"><Activity className="mx-auto h-10 w-10 text-electric-blue-light" /><h2 className="mt-4 text-2xl font-black text-white">Start your first pitching analysis</h2><p className="mx-auto mt-2 max-w-lg text-slate-400">Submit a side-view pitching video to receive your score breakdown, key positions, feedback, and weekly plan.</p><Link href="/start-analysis" className="btn-action mt-6">Start Analysis <ArrowRight className="h-4 w-4" /></Link></section>}
      </section>
    </div>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const [{ data: profile }, { data: latest }, { count: activeOrders }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('motion_analyses').select('id,title,delivery_score,category_scores,training_plans(duration_weeks,weeks)').eq('user_id', user.id).eq('status', 'published').not('published_at', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(complete,cancelled,refunded)'),
    ])
    const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Athlete'
    return <AuthenticatedHome firstName={firstName} latest={latest} activeOrders={activeOrders ?? 0} />
  }
  return <PublicHome />
}

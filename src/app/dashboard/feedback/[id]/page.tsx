import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

type Category = { category: string; score: number; confidence: string; strength: string; development: string; evidence: string }
type Phase = { key: string; label: string; time: number; storage_path: string; confidence_note: string; signedUrl?: string }
type PlanDay = { day: string; focus: string; work: string }
type PlanWeek = { week: number; priority: string; coaching_cue?: string; prescription?: string; days?: PlanDay[] }

export default async function FeedbackReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: analysis } = await supabase
    .from('motion_analyses')
    .select('*,training_plans(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!analysis) notFound()

  const categories = (analysis.category_scores ?? []) as Category[]
  const phases = (analysis.phase_snapshots ?? []) as Phase[]
  for (const phase of phases) {
    const { data } = await supabase.storage.from('analysis-assets').createSignedUrl(phase.storage_path, 3600)
    phase.signedUrl = data?.signedUrl
  }
  const planRecord = Array.isArray(analysis.training_plans) ? analysis.training_plans[0] : analysis.training_plans
  const weeks = (planRecord?.weeks ?? []) as PlanWeek[]
  const strengths = (analysis.strengths ?? []) as string[]
  const priorities = (analysis.development_priorities ?? []) as string[]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link href="/dashboard#feedback-plan" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>

      <section className="overflow-hidden rounded-2xl border border-electric-blue/25 bg-gradient-to-br from-navy-800 to-navy-950 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-electric-blue-light">Pitch Nav video review</p>
        <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><h1 className="text-3xl font-black text-white sm:text-5xl">Feedback & Development Plan</h1><p className="mt-2 text-slate-400">{analysis.title}</p></div>
          <div className="rounded-2xl border border-electric-blue/30 bg-navy-950 px-7 py-5 text-center"><p className="text-xs uppercase tracking-widest text-slate-500">Overall delivery score</p><p className="mt-1 text-5xl font-black text-white">{analysis.delivery_score ?? '—'}<span className="text-xl text-electric-blue-light">/30</span></p></div>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>This immediate report uses 2D video-based estimates. Phase frames, scores, and cues are automated coaching starting points, not laboratory biomechanics measurements. A coach must confirm them before they are treated as final expert-reviewed findings.</p></div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black text-white">Mechanics scorecard</h2>
        <p className="mt-1 text-sm text-slate-400">Each category includes the positive finding, development area, video evidence, and confidence.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {categories.map((item) => <div key={item.category} className="rounded-xl border border-surface-border bg-navy-950 p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold text-white">{item.category}</h3><span className="text-xl font-black text-electric-blue-light">{item.score}/5</span></div>
            <ProgressBar value={item.score} max={5} className="mt-3" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{item.confidence} confidence</p>
            <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-accent-green">Good:</span> {item.strength}</p>
            <p className="mt-2 text-sm text-slate-300"><span className="font-semibold text-yellow-300">Develop:</span> {item.development}</p>
            <p className="mt-3 border-t border-surface-border pt-3 text-xs text-slate-500">Evidence: {item.evidence}</p>
          </div>)}
        </div>
        <p className="mt-5 text-xs text-slate-500">The Delivery Score is an internal coaching tool for tracking the same athlete over time. It is not a medical score, laboratory biomechanics score, or prediction of injury.</p>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black text-white">Six delivery phases</h2>
        <p className="mt-1 text-sm text-slate-400">Automated candidate screenshots from this exact uploaded video.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {phases.map((phase) => <article key={phase.key} className="overflow-hidden rounded-xl border border-surface-border bg-navy-950">
            {phase.signedUrl ? <img src={phase.signedUrl} alt={`${phase.label} video-based candidate`} className="aspect-video w-full object-contain bg-black" /> : <div className="flex aspect-video items-center justify-center bg-black text-sm text-slate-600">Screenshot unavailable</div>}
            <div className="p-4"><p className="font-bold text-white">{phase.label}</p><p className="mt-1 text-xs text-electric-blue-light">{phase.time.toFixed(2)} seconds</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{phase.confidence_note}</p></div>
          </article>)}
          {!phases.length && <p className="text-sm text-slate-500">Save a new Motion Lab analysis to generate phase screenshots.</p>}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card"><h2 className="text-xl font-bold text-white">What looked good</h2><div className="mt-4 space-y-3">{strengths.map((item) => <p key={item} className="flex gap-3 text-sm text-slate-300"><CheckCircle className="h-5 w-5 shrink-0 text-accent-green" />{item}</p>)}</div></div>
        <div className="card"><h2 className="text-xl font-bold text-white">Development priorities</h2><ol className="mt-4 space-y-3">{priorities.map((item, index) => <li key={item} className="flex gap-3 text-sm text-slate-300"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-blue/15 text-xs font-bold text-electric-blue-light">{index + 1}</span>{item}</li>)}</ol></div>
      </section>

      <section className="card">
        <div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-electric-blue-light" /><div><h2 className="text-2xl font-black text-white">{planRecord?.duration_weeks ?? 4}-week Monday–Sunday plan</h2><p className="text-sm text-slate-400">Follow your existing throwing and strength program; do not use this plan to override medical or coaching restrictions.</p></div></div>
        <div className="mt-6 space-y-6">{weeks.map((week) => <div key={week.week} className="rounded-xl border border-surface-border bg-navy-950 p-5"><h3 className="text-lg font-bold text-white">Week {week.week}: {week.priority}</h3>{week.coaching_cue && <p className="mt-2 text-sm text-electric-blue-light">Cue: {week.coaching_cue}</p>}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{week.days?.map((day) => <div key={day.day} className="rounded-lg border border-surface-border bg-navy-900 p-3"><p className="text-xs font-black uppercase text-white">{day.day}</p><p className="mt-1 text-xs font-semibold text-accent-green">{day.focus}</p><p className="mt-2 text-xs leading-relaxed text-slate-400">{day.work}</p></div>)}</div></div>)}</div>
      </section>
      <SafetyDisclaimer />
    </div>
  )
}

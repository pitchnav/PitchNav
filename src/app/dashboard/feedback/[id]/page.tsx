import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { InteractiveFeedbackTools } from '@/components/reports/InteractiveFeedbackTools'

type Category = { category: string; score: number; confidence: string; strength: string; development: string; evidence: string }
type Phase = { key: string; label: string; time: number; storage_path: string; confidence_note: string; signedUrl?: string }
type PlanDay = { day: string; focus: string; work: string }
type PlanWeek = { week: number; priority: string; coaching_cue?: string; prescription?: string; days?: PlanDay[] }
type PerformanceCorrelation = { assessment_category: string; score: number; observed_deficiency: string; lift_emphasis: string; mobility_emphasis: string; rationale: string }
type StrengthDay = { day: string; focus: string; work: string; cues?: string[]; common_mistake?: string; correlation?: string }
type StrengthWeek = { week: number; phase: string; tailored_focus: string; correlations?: PerformanceCorrelation[]; days: StrengthDay[] }

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
  if (analysis.status !== 'published') redirect('/dashboard?review=pending')

  const categories = (analysis.category_scores ?? []) as Category[]
  const phases = (analysis.phase_snapshots ?? []) as Phase[]
  for (const phase of phases) {
    const { data } = await supabase.storage.from('analysis-assets').createSignedUrl(phase.storage_path, 3600)
    phase.signedUrl = data?.signedUrl
  }
  const planRecord = Array.isArray(analysis.training_plans) ? analysis.training_plans[0] : analysis.training_plans
  const weeks = (planRecord?.weeks ?? []) as PlanWeek[]
  const strengthWeeks = (planRecord?.strength_mobility_weeks ?? []) as StrengthWeek[]
  const strengths = (analysis.strengths ?? []) as string[]
  const priorities = (analysis.development_priorities ?? []) as string[]
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const todayPart = (type: 'year' | 'month' | 'day') => todayParts.find((part) => part.type === type)?.value ?? ''
  const todayDate = `${todayPart('year')}-${todayPart('month')}-${todayPart('day')}`

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link href="/dashboard#feedback-plan" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>

      <section className="overflow-hidden rounded-2xl border border-electric-blue/25 bg-gradient-to-br from-navy-800 to-navy-950 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-electric-blue-light">Pitch Nav video review</p>
        <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><h1 className="text-3xl font-black text-white sm:text-5xl">Feedback & Development Plan</h1><p className="mt-2 text-slate-400">{analysis.title}</p></div>
          <div className="rounded-2xl border border-electric-blue/30 bg-navy-950 px-7 py-5 text-center"><p className="text-xs uppercase tracking-widest text-slate-500">Overall delivery score</p><p className="mt-1 text-5xl font-black text-white">{analysis.delivery_score ?? '—'}<span className="text-xl text-electric-blue-light">/30</span></p></div>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>This report is based on video, not lab equipment — it&apos;s a coaching tool, not a medical or laboratory measurement. A Pitch Nav coach has reviewed everything on this page before releasing it to you.</p></div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black text-white">Mechanics scorecard</h2>
        <p className="mt-1 text-sm text-slate-400">For each category: what&apos;s working, what to develop, the video evidence, and how confident we are.</p>
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
        <p className="mt-5 text-xs text-slate-500">The Delivery Score tracks your own progress over time. It is not a medical score, a lab measurement, or a prediction of injury.</p>
      </section>

      <InteractiveFeedbackTools
        analysisId={analysis.id}
        planId={planRecord?.id}
        title={analysis.title}
        categories={categories}
        phases={phases}
        weeks={weeks}
        strengthWeeks={strengthWeeks}
        initialProgress={planRecord?.progress ?? {}}
        planStartDate={planRecord?.starts_on ?? planRecord?.published_at ?? analysis.published_at ?? analysis.created_at}
        todayDate={todayDate}
        membershipTier={strengthWeeks.length > 0 ? 'performance' : 'throwing'}
      />
      <SafetyDisclaimer />
    </div>
  )
}

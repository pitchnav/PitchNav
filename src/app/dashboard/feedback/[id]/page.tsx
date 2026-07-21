import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { InteractiveFeedbackTools } from '@/components/reports/InteractiveFeedbackTools'
import { calculateDeliveryScore } from '@/lib/utils'

type Category = { category: string; score: number; confidence: string; strength: string; development: string; evidence: string }
type Phase = { key: string; label: string; time: number; storage_path: string; confidence_note: string; signedUrl?: string }
type PlanDay = { day: string; focus: string; work: string }
type PlanWeek = { week: number; priority: string; coaching_cue?: string; prescription?: string; days?: PlanDay[] }
type PerformanceCorrelation = { assessment_category: string; score: number; observed_deficiency: string; lift_emphasis: string; mobility_emphasis: string; rationale: string }
type StrengthDay = { day: string; focus: string; work: string; cues?: string[]; common_mistake?: string; correlation?: string }
type StrengthWeek = { week: number; phase: string; tailored_focus: string; correlations?: PerformanceCorrelation[]; days: StrengthDay[] }

function parseCategories(value: unknown): Category[] {
  let source = value

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source)
    } catch {
      return []
    }
  }

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const record = source as Record<string, unknown>
    const wrapped = record.categories ?? record.scores ?? record.category_scores
    source = wrapped ?? Object.entries(record).map(([category, item]) => (
      item && typeof item === 'object'
        ? { category, ...(item as Record<string, unknown>) }
        : { category, score: item }
    ))
  }

  if (!Array.isArray(source)) return []

  return source.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const score = Number(record.score ?? record.score_value ?? record.value ?? record.rating)
    if (!Number.isFinite(score)) return []

    return [{
      category: String(record.category ?? record.name ?? record.label ?? `Category ${index + 1}`),
      score: Math.max(0, Math.min(5, score)),
      confidence: String(record.confidence ?? record.video_quality ?? 'Moderate'),
      strength: String(record.strength ?? record.positive ?? 'No note added.'),
      development: String(record.development ?? record.opportunity ?? record.next_focus ?? 'No next focus added.'),
      evidence: String(record.evidence ?? record.observation ?? 'Review the highlighted video position.'),
    }]
  })
}

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

  const categories = parseCategories(analysis.category_scores)
  const deliveryScore = calculateDeliveryScore(categories, analysis.delivery_score)
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
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 overflow-x-hidden px-3 sm:space-y-8 sm:px-4 animate-fade-in">
      <Link href="/dashboard#feedback-plan" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>

      <section className="overflow-hidden rounded-2xl border border-electric-blue/25 bg-gradient-to-br from-navy-800 to-navy-950 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-electric-blue-light">Pitch Nav video review</p>
        <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><h1 className="text-3xl font-black text-white sm:text-5xl">Feedback & Development Plan</h1><p className="mt-2 text-slate-400">{analysis.title}</p></div>
          <div className="rounded-2xl border border-electric-blue/30 bg-navy-950 px-7 py-5 text-center"><p className="text-xs uppercase tracking-widest text-slate-500">Overall delivery score</p><p className="mt-1 text-5xl font-black text-white">{deliveryScore ?? '—'}<span className="text-xl text-electric-blue-light">/30</span></p></div>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>This is a video-based coaching report, not medical advice. A Pitch Nav coach reviewed it before release.</p></div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black text-white">Mechanics scorecard</h2>
        <p className="mt-1 text-sm text-slate-400">See what is working, what to improve, and the cue to use next.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {categories.map((item) => <div key={item.category} className="min-w-0 rounded-xl border border-surface-border bg-navy-950 p-5 transition-colors duration-200 hover:border-electric-blue/35">
            <div className="flex items-center justify-between"><h3 className="font-bold text-white">{item.category}</h3><span className="text-xl font-black text-electric-blue-light">{item.score}/5</span></div>
            <ProgressBar value={item.score} max={5} className="mt-3" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Video quality: {item.confidence}</p>
            <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-accent-green">Working well:</span> {item.strength}</p>
            <p className="mt-2 text-sm text-slate-300"><span className="font-semibold text-yellow-300">Next focus:</span> {item.development}</p>
            <p className="mt-3 border-t border-surface-border pt-3 text-xs text-slate-500">What we saw: {item.evidence}</p>
          </div>)}
        </div>
        <p className="mt-5 text-xs text-slate-500">Use this score to track your own progress over time. It is not a medical or injury-risk score.</p>
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

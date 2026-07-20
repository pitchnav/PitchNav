'use client'

import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Download,
  Dumbbell,
  MessageCircle,
  Plus,
  Target,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Category = {
  category: string
  score: number
  confidence: string
  strength: string
  development: string
  evidence: string
}
type Phase = {
  key: string
  label: string
  time: number
  confidence_note: string
  signedUrl?: string
}
type Day = { day: string; focus: string; work: string }
type Week = {
  week: number
  priority: string
  coaching_cue?: string
  prescription?: string
  days?: Day[]
}
type PerformanceCorrelation = {
  assessment_category: string
  score: number
  observed_deficiency: string
  lift_emphasis: string
  mobility_emphasis: string
  rationale: string
}
type StrengthDay = {
  day: string
  focus: string
  work: string
  cues?: string[]
  common_mistake?: string
  correlation?: string
}
type StrengthWeek = {
  week: number
  phase: string
  tailored_focus: string
  correlations?: PerformanceCorrelation[]
  days: StrengthDay[]
}
type CalendarMode = 'today' | 'outlook'
type MembershipTier = 'throwing' | 'performance'
type CalendarEntry = {
  date: Date
  dateKey: string
  dayName: string
  planWeekNumber: number
  throwingWeek?: Week
  throwing?: Day
  performanceWeek?: StrengthWeek
  performance?: StrengthDay
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const drillMap: Record<string, { name: string; improves: string; sets: string; cues: string[]; mistake: string }> = {
  'Front-Side Stability': { name: 'Lead-Leg Stability Holds', improves: 'Front-leg control after foot strike', sets: '3 sets × 5 reps', cues: ['Land under control', 'Finish over a stable base'], mistake: 'Forcing the knee completely locked' },
  Posture: { name: 'Wall Posture Drill', improves: 'Head and trunk control', sets: '3 sets × 6 reps', cues: ['Move around a stable center', 'Keep the finish balanced'], mistake: 'Leaning early to create artificial tilt' },
  'Lower-Half Sequencing': { name: 'Rocker Delivery Drill', improves: 'Lower-half rhythm and sequence', sets: '3 sets × 5 throws', cues: ['Hips initiate smoothly', 'Let the arm follow the lower half'], mistake: 'Rushing toward maximum intent' },
  Direction: { name: 'Stride-Line Drill', improves: 'Repeatable stride direction', sets: '3 sets × 5 reps', cues: ['Choose a clear target line', 'Land naturally on the line'], mistake: 'Forcing the foot into an uncomfortable angle' },
  'Upper-Half Timing': { name: 'Connection Throws', improves: 'Arm timing with trunk rotation', sets: '3 sets × 5 throws', cues: ['Stay smooth into foot contact', 'Rotate without pulling the glove'], mistake: 'Trying to manufacture a specific arm slot' },
  'Release Consistency': { name: 'Target Window Throws', improves: 'Repeatable intent and release window', sets: '3 sets × 6 throws', cues: ['Use one visual target', 'Repeat the same tempo'], mistake: 'Changing mechanics solely to chase the target' },
}

function parseLocalDate(value?: string | null) {
  if (!value) return null
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function daysBetween(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endUtc - startUtc) / 86_400_000)
}

function findDay<T extends { day: string }>(days: T[] | undefined, dayName: string, fallbackIndex: number) {
  if (!days?.length) return undefined
  return days.find((item) => item.day.toLowerCase() === dayName.toLowerCase()) ?? days[fallbackIndex % days.length]
}

function throwingMistake(focus?: string) {
  const value = (focus ?? '').toLowerCase()
  if (value.includes('recovery') || value.includes('rest')) return 'Adding missed high-intent work to a recovery day.'
  if (value.includes('bullpen') || value.includes('intent')) return 'Increasing intensity when movement quality, soreness, or command is declining.'
  if (value.includes('mobility')) return 'Forcing range or stretching through pain.'
  return 'Rushing repetitions instead of resetting and repeating the assigned cue.'
}

function RoutineCard({
  title,
  label,
  completed,
  onToggle,
  children,
  accent = 'blue',
}: {
  title: string
  label: string
  completed: boolean
  onToggle: () => void
  children: ReactNode
  accent?: 'blue' | 'green'
}) {
  return (
    <article className={`rounded-xl border p-5 ${accent === 'green' ? 'border-accent-green/25 bg-accent-green/5' : 'border-electric-blue/25 bg-electric-blue/5'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${accent === 'green' ? 'text-accent-green' : 'text-electric-blue-light'}`}>{label}</p>
          <h4 className="mt-1 text-xl font-black text-white">{title}</h4>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${completed ? 'bg-accent-green/15 text-accent-green' : 'bg-navy-950 text-slate-300 hover:text-white'}`}
        >
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${completed ? 'border-accent-green bg-accent-green text-navy-950' : 'border-slate-600'}`}>
            {completed && <Check className="h-3.5 w-3.5" />}
          </span>
          {completed ? 'Completed' : 'Mark complete'}
        </button>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </article>
  )
}

export function InteractiveFeedbackTools({
  analysisId,
  planId,
  title,
  categories,
  phases,
  weeks,
  strengthWeeks,
  initialProgress = {},
  planStartDate,
  todayDate,
  membershipTier,
}: {
  analysisId: string
  planId?: string
  title: string
  categories: Category[]
  phases: Phase[]
  weeks: Week[]
  strengthWeeks: StrengthWeek[]
  initialProgress?: Record<string, boolean>
  planStartDate?: string | null
  todayDate: string
  membershipTier?: MembershipTier
}) {
  const supabase = useMemo(() => createClient(), [])
  const [activePhase, setActivePhase] = useState(phases[0]?.key)
  const [progress, setProgress] = useState(initialProgress)
  const [question, setQuestion] = useState('')
  const [message, setMessage] = useState('')
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('today')
  const [selectedOffset, setSelectedOffset] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const phase = phases.find((item) => item.key === activePhase) ?? phases[0]
  const priorityCategories = [...categories].sort((a, b) => a.score - b.score)
  const biggest = priorityCategories[0]
  const drills = priorityCategories.slice(0, 3).map((category) => ({ category: category.category, ...drillMap[category.category] }))
  const tier: MembershipTier = membershipTier ?? (strengthWeeks.length > 0 ? 'performance' : 'throwing')

  const calendar = useMemo<CalendarEntry[]>(() => {
    const today = parseLocalDate(todayDate) ?? new Date()
    const programStart = parseLocalDate(planStartDate) ?? today
    return Array.from({ length: 14 }, (_, offset) => {
      const date = addDays(today, offset)
      const programDay = Math.max(0, daysBetween(programStart, date))
      const throwingWeek = weeks.length ? weeks[Math.floor(programDay / 7) % weeks.length] : undefined
      const performanceWeek = tier === 'performance' && strengthWeeks.length
        ? strengthWeeks[Math.floor(programDay / 7) % strengthWeeks.length]
        : undefined
      const dayName = DAY_NAMES[date.getDay()]
      return {
        date,
        dateKey: dateKey(date),
        dayName,
        planWeekNumber: Math.floor(programDay / 7) + 1,
        throwingWeek,
        throwing: findDay(throwingWeek?.days, dayName, programDay),
        performanceWeek,
        performance: findDay(performanceWeek?.days, dayName, programDay),
      }
    })
  }, [planStartDate, strengthWeeks, tier, todayDate, weeks])

  const selectedDay = calendar[Math.min(selectedOffset, calendar.length - 1)] ?? calendar[0]
  const visibleDays = calendarMode === 'today' ? calendar.slice(0, 1) : calendar

  async function toggleTask(key: string) {
    const next = { ...progress, [key]: !progress[key] }
    setProgress(next)
    setMessage('')
    if (!planId) return

    const { error } = await supabase.rpc('update_training_plan_progress', {
      target_plan_id: planId,
      next_progress: next,
    })
    if (error) {
      const fallback = await supabase.from('training_plans').update({ progress: next }).eq('id', planId)
      if (fallback.error) {
        setProgress(progress)
        setMessage('Progress could not be saved. Refresh and try again.')
      }
    }
  }

  async function askAnalyst() {
    if (!question.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setMessage('Please sign in again.')
    const { error } = await supabase.from('analysis_questions').insert({ motion_analysis_id: analysisId, user_id: user.id, question: question.trim() })
    if (error) setMessage(error.message)
    else {
      setQuestion('')
      setMessage('Question sent to your analyst.')
    }
  }

  function downloadShareCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1200
    canvas.height = 630
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630)
    gradient.addColorStop(0, '#020817')
    gradient.addColorStop(1, '#0b2454')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1200, 630)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 48px Arial'
    ctx.fillText('Pitch Nav', 70, 90)
    ctx.fillStyle = '#3b82f6'
    ctx.font = 'bold 28px Arial'
    ctx.fillText('ATHLETE PROGRESS', 70, 145)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 54px Arial'
    ctx.fillText(title.slice(0, 32), 70, 250)
    ctx.font = 'bold 110px Arial'
    ctx.fillText(`${categories.reduce((sum, item) => sum + item.score, 0)}/30`, 70, 400)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '28px Arial'
    ctx.fillText('Delivery Score · video-based coaching tool', 70, 450)
    if (biggest) {
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 25px Arial'
      ctx.fillText(`Current focus: ${biggest.category}`, 70, 530)
    }
    ctx.fillStyle = '#64748b'
    ctx.font = '20px Arial'
    ctx.fillText('Private report details are not included.', 70, 580)
    const link = document.createElement('a')
    link.download = 'pitch-nav-progress.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="space-y-8">
      {biggest && (
        <section className="overflow-hidden rounded-2xl border border-electric-blue/30 bg-gradient-to-r from-electric-blue/10 to-navy-900 p-6">
          <div className="flex items-start gap-4">
            <Target className="mt-1 h-7 w-7 shrink-0 text-electric-blue-light" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Biggest opportunity</p>
              <h2 className="mt-1 text-2xl font-black text-white">Improve {biggest.category}</h2>
              <p className="mt-3 text-sm text-slate-300"><b>Observed:</b> {biggest.evidence}</p>
              <p className="mt-2 text-sm text-slate-300"><b>What to work on:</b> {biggest.development}</p>
              <p className="mt-2 text-xs text-slate-500">{biggest.confidence} confidence · video-based estimate</p>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="text-2xl font-black text-white">Your six key positions</h2>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {phases.map((item) => (
            <button key={item.key} onClick={() => setActivePhase(item.key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${item.key === activePhase ? 'bg-electric-blue text-white' : 'bg-navy-950 text-slate-400'}`}>
              {item.label}
            </button>
          ))}
        </div>
        {phase && (
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl bg-black">
              {phase.signedUrl ? <img src={phase.signedUrl} alt={phase.label} className="aspect-video w-full object-contain" /> : <div className="flex aspect-video items-center justify-center text-slate-600">Frame unavailable</div>}
            </div>
            <div className="rounded-xl bg-navy-950 p-5">
              <h3 className="text-xl font-bold text-white">{phase.label}</h3>
              <p className="mt-1 text-xs text-electric-blue-light">{phase.time.toFixed(2)} seconds</p>
              <p className="mt-4 text-sm text-slate-300"><b>Strength:</b> {categories[Math.min(categories.length - 1, phases.indexOf(phase))]?.strength ?? 'Coach confirmation pending.'}</p>
              <p className="mt-3 text-sm text-slate-300"><b>Opportunity:</b> {categories[Math.min(categories.length - 1, phases.indexOf(phase))]?.development ?? 'Coach confirmation pending.'}</p>
              <p className="mt-3 text-sm text-slate-300"><b>Measurement:</b> {categories[Math.min(categories.length - 1, phases.indexOf(phase))]?.evidence ?? 'Not available.'}</p>
              <p className="mt-4 text-xs text-slate-500">{phase.confidence_note}</p>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="text-2xl font-black text-white">Three personalized drills</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {drills.map((drill) => {
            const key = `drill:${drill.category}`
            return (
              <article key={drill.category} className="rounded-xl border border-surface-border bg-navy-950 p-5">
                <p className="text-xs font-bold uppercase text-electric-blue-light">{drill.category}</p>
                <h3 className="mt-1 text-lg font-bold text-white">{drill.name}</h3>
                <p className="mt-3 text-sm text-slate-400">{drill.improves}</p>
                <p className="mt-3 text-sm font-semibold text-white">{drill.sets}</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-400">{drill.cues.map((cue) => <li key={cue}>• {cue}</li>)}</ul>
                <p className="mt-3 text-xs text-yellow-300">Common mistake: {drill.mistake}</p>
                <button onClick={() => toggleTask(key)} className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-bold ${progress[key] ? 'bg-accent-green/15 text-accent-green' : 'bg-electric-blue text-white'}`}>
                  {progress[key] ? <><Check className="mr-1 inline h-4 w-4" /> Completed</> : <><Plus className="mr-1 inline h-4 w-4" /> Add/mark complete</>}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="card" id="training-calendar">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-1 h-7 w-7 shrink-0 text-electric-blue-light" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Rolling plan</p>
              <h2 className="mt-1 text-2xl font-black text-white">Your next two weeks</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                You&apos;ll always see today plus the next 13 days. A new day is added each morning.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-surface-border bg-navy-950 p-1">
            <button type="button" onClick={() => { setCalendarMode('today'); setSelectedOffset(0) }} className={`min-h-11 rounded-lg px-4 text-sm font-bold ${calendarMode === 'today' ? 'bg-electric-blue text-white' : 'text-slate-400'}`}>Today</button>
            <button type="button" onClick={() => setCalendarMode('outlook')} className={`min-h-11 rounded-lg px-4 text-sm font-bold ${calendarMode === 'outlook' ? 'bg-electric-blue text-white' : 'text-slate-400'}`}>14-day outlook</button>
          </div>
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-3">
          {visibleDays.map((entry, visibleIndex) => {
            const offset = calendarMode === 'today' ? 0 : visibleIndex
            const selected = selectedOffset === offset
            const throwDone = Boolean(progress[`calendar:${entry.dateKey}:throwing`])
            const performanceDone = tier !== 'performance' || !entry.performance || Boolean(progress[`calendar:${entry.dateKey}:performance`])
            return (
              <button
                type="button"
                key={entry.dateKey}
                onClick={() => setSelectedOffset(offset)}
                className={`min-w-[178px] rounded-xl border p-4 text-left transition ${selected ? 'border-electric-blue bg-electric-blue/10' : 'border-surface-border bg-navy-950 hover:border-electric-blue/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{offset === 0 ? 'Today' : entry.dayName}</p>
                    <p className="mt-1 text-lg font-black text-white">{entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  {throwDone && performanceDone && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-green text-navy-950"><Check className="h-4 w-4" /></span>}
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">{entry.throwing?.focus ?? 'Throwing plan check-in'}</p>
                {tier === 'performance' && entry.performance && <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-accent-green">+ {entry.performance.focus}</p>}
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-600"><span>Plan week {entry.planWeekNumber}</span><ChevronRight className="h-4 w-4" /></div>
              </button>
            )
          })}
        </div>

        {selectedDay && (
          <div className="mt-5 rounded-2xl border border-surface-border bg-navy-950 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-surface-border pb-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">{selectedOffset === 0 ? 'Today’s complete routine' : 'Selected day'}</p>
                <h3 className="mt-1 text-3xl font-black text-white">{selectedDay.dayName}, {selectedDay.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400"><Clock className="h-4 w-4" /> Plan week {selectedDay.planWeekNumber}</div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <RoutineCard
                title={selectedDay.throwing?.focus ?? 'Throwing plan check-in'}
                label="Throwing development"
                completed={Boolean(progress[`calendar:${selectedDay.dateKey}:throwing`])}
                onToggle={() => toggleTask(`calendar:${selectedDay.dateKey}:throwing`)}
              >
                <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Full routine & instructions</p><p className="mt-2 text-sm leading-relaxed text-slate-300">{selectedDay.throwing?.work ?? 'Follow the staff-approved throwing workload and record how the session felt.'}</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-navy-900 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-500">Sets & repetitions</p><p className="mt-1 text-sm font-semibold text-white">{selectedDay.throwingWeek?.prescription ?? 'Complete the assigned routine with controlled, repeatable reps.'}</p></div>
                  <div className="rounded-lg bg-navy-900 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-500">Primary coaching cue</p><p className="mt-1 text-sm font-semibold text-white">{selectedDay.throwingWeek?.coaching_cue ?? 'Reset between repetitions and prioritize movement quality.'}</p></div>
                </div>
                <p className="rounded-lg bg-yellow-400/10 p-3 text-xs leading-relaxed text-yellow-200"><b>Common mistake:</b> {throwingMistake(selectedDay.throwing?.focus)}</p>
                {biggest && <p className="rounded-lg bg-electric-blue/10 p-3 text-xs leading-relaxed text-electric-blue-light"><b>Why this drill:</b> it builds on the {biggest.category.toLowerCase()} priority from your report.</p>}
              </RoutineCard>

              {tier === 'performance' && selectedDay.performance ? (
                <RoutineCard
                  title={selectedDay.performance.focus}
                  label={selectedDay.performance.focus.toLowerCase().includes('mobility') || selectedDay.performance.focus.toLowerCase().includes('recovery') || selectedDay.performance.focus.toLowerCase().includes('rest') ? 'Mobility & recovery' : 'Baseball strength'}
                  completed={Boolean(progress[`calendar:${selectedDay.dateKey}:performance`])}
                  onToggle={() => toggleTask(`calendar:${selectedDay.dateKey}:performance`)}
                  accent="green"
                >
                  <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Full daily routine</p><p className="mt-2 text-sm leading-relaxed text-slate-300">{selectedDay.performance.work}</p></div>
                  {selectedDay.performance.cues?.length ? <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Execution cues</p><ul className="mt-2 space-y-2 text-sm text-slate-300">{selectedDay.performance.cues.map((cue) => <li key={cue}>• {cue}</li>)}</ul></div> : null}
                  {selectedDay.performance.common_mistake ? <p className="rounded-lg bg-yellow-400/10 p-3 text-xs leading-relaxed text-yellow-200"><b>Common mistake:</b> {selectedDay.performance.common_mistake}</p> : null}
                  {selectedDay.performance.correlation ? <p className="rounded-lg bg-accent-green/10 p-3 text-xs leading-relaxed text-accent-green"><b>Assessment connection:</b> {selectedDay.performance.correlation}</p> : null}
                </RoutineCard>
              ) : (
                <article className="rounded-xl border border-dashed border-surface-border bg-navy-900/40 p-6">
                  <Dumbbell className="h-7 w-7 text-slate-600" />
                  <h4 className="mt-3 text-lg font-bold text-white">Throwing Development membership</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">This $25 plan includes the complete throwing routine. Tailored baseball lifting and mobility details are included with the $40 Complete Performance membership.</p>
                </article>
              )}
            </div>

            {selectedDay.performanceWeek?.tailored_focus && (
              <div className="mt-5 rounded-xl border border-accent-green/20 bg-accent-green/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-accent-green">This week’s focus</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{selectedDay.performanceWeek.tailored_focus}</p>
              </div>
            )}
          </div>
        )}
        {message && <p className="mt-4 text-sm text-yellow-200" role="status">{message}</p>}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <MessageCircle className="h-6 w-6 text-electric-blue-light" />
          <h2 className="mt-3 text-xl font-bold text-white">Ask your analyst</h2>
          <p className="mt-1 text-sm text-slate-400">Ask up to two quick questions about your report.</p>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} className="input mt-4 min-h-28" placeholder="What should I focus on first?" />
          <button onClick={askAnalyst} className="btn-primary mt-3">Send question</button>
          {message && <p className="mt-2 text-xs text-slate-400">{message}</p>}
        </div>
        <div className="card">
          <Download className="h-6 w-6 text-accent-green" />
          <h2 className="mt-3 text-xl font-bold text-white">Shareable progress card</h2>
          <p className="mt-1 text-sm text-slate-400">Share your score and current focus. The rest of your report stays private.</p>
          <button onClick={downloadShareCard} className="btn-accent mt-4">Download progress card</button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </section>
    </div>
  )
}

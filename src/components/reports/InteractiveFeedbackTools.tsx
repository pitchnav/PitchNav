'use client'

import { useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Download, MessageCircle, Plus, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Category = { category: string; score: number; confidence: string; strength: string; development: string; evidence: string }
type Phase = { key: string; label: string; time: number; confidence_note: string; signedUrl?: string }
type Day = { day: string; focus: string; work: string }
type Week = { week: number; priority: string; coaching_cue?: string; days?: Day[] }

const drillMap: Record<string, { name: string; improves: string; sets: string; cues: string[]; mistake: string }> = {
  'Front-Side Stability': { name: 'Lead-Leg Stability Holds', improves: 'Front-leg control after foot strike', sets: '3 sets × 5 reps', cues: ['Land under control', 'Finish over a stable base'], mistake: 'Forcing the knee completely locked' },
  Posture: { name: 'Wall Posture Drill', improves: 'Head and trunk control', sets: '3 sets × 6 reps', cues: ['Move around a stable center', 'Keep the finish balanced'], mistake: 'Leaning early to create artificial tilt' },
  'Lower-Half Sequencing': { name: 'Rocker Delivery Drill', improves: 'Lower-half rhythm and sequence', sets: '3 sets × 5 throws', cues: ['Hips initiate smoothly', 'Let the arm follow the lower half'], mistake: 'Rushing toward maximum intent' },
  Direction: { name: 'Stride-Line Drill', improves: 'Repeatable stride direction', sets: '3 sets × 5 reps', cues: ['Choose a clear target line', 'Land naturally on the line'], mistake: 'Forcing the foot into an uncomfortable angle' },
  'Upper-Half Timing': { name: 'Connection Throws', improves: 'Arm timing with trunk rotation', sets: '3 sets × 5 throws', cues: ['Stay smooth into foot contact', 'Rotate without pulling the glove'], mistake: 'Trying to manufacture a specific arm slot' },
  'Release Consistency': { name: 'Target Window Throws', improves: 'Repeatable intent and release window', sets: '3 sets × 6 throws', cues: ['Use one visual target', 'Repeat the same tempo'], mistake: 'Changing mechanics solely to chase the target' },
}

export function InteractiveFeedbackTools({ analysisId, planId, title, categories, phases, weeks, initialProgress = {} }: { analysisId: string; planId?: string; title: string; categories: Category[]; phases: Phase[]; weeks: Week[]; initialProgress?: Record<string, boolean> }) {
  const supabase = useMemo(() => createClient(), [])
  const [activePhase, setActivePhase] = useState(phases[0]?.key)
  const [progress, setProgress] = useState(initialProgress)
  const [question, setQuestion] = useState('')
  const [message, setMessage] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phase = phases.find((item) => item.key === activePhase) ?? phases[0]
  const priorityCategories = [...categories].sort((a, b) => a.score - b.score)
  const biggest = priorityCategories[0]
  const drills = priorityCategories.slice(0, 3).map((category) => ({ category: category.category, ...drillMap[category.category] }))

  async function toggleTask(key: string) {
    const next = { ...progress, [key]: !progress[key] }
    setProgress(next)
    if (planId) await supabase.from('training_plans').update({ progress: next }).eq('id', planId)
  }

  async function askAnalyst() {
    if (!question.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setMessage('Please sign in again.')
    const { error } = await supabase.from('analysis_questions').insert({ motion_analysis_id: analysisId, user_id: user.id, question: question.trim() })
    if (error) setMessage(error.message)
    else { setQuestion(''); setMessage('Question sent to your analyst.') }
  }

  function downloadShareCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1200; canvas.height = 630
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630); gradient.addColorStop(0, '#020817'); gradient.addColorStop(1, '#0b2454')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1200, 630)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px Arial'; ctx.fillText('Pitch Nav', 70, 90)
    ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 28px Arial'; ctx.fillText('ATHLETE PROGRESS', 70, 145)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 54px Arial'; ctx.fillText(title.slice(0, 32), 70, 250)
    ctx.font = 'bold 110px Arial'; ctx.fillText(`${categories.reduce((sum, item) => sum + item.score, 0)}/30`, 70, 400)
    ctx.fillStyle = '#94a3b8'; ctx.font = '28px Arial'; ctx.fillText('Delivery Score · video-based coaching tool', 70, 450)
    if (biggest) { ctx.fillStyle = '#22c55e'; ctx.font = 'bold 25px Arial'; ctx.fillText(`Current focus: ${biggest.category}`, 70, 530) }
    ctx.fillStyle = '#64748b'; ctx.font = '20px Arial'; ctx.fillText('Private report details are not included.', 70, 580)
    const link = document.createElement('a'); link.download = 'pitch-nav-progress.png'; link.href = canvas.toDataURL('image/png'); link.click()
  }

  return <div className="space-y-8">
    {biggest && <section className="overflow-hidden rounded-2xl border border-electric-blue/30 bg-gradient-to-r from-electric-blue/10 to-navy-900 p-6"><div className="flex items-start gap-4"><Target className="mt-1 h-7 w-7 shrink-0 text-electric-blue-light" /><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Biggest opportunity</p><h2 className="mt-1 text-2xl font-black text-white">Improve {biggest.category}</h2><p className="mt-3 text-sm text-slate-300"><b>Observed:</b> {biggest.evidence}</p><p className="mt-2 text-sm text-slate-300"><b>What to work on:</b> {biggest.development}</p><p className="mt-2 text-xs text-slate-500">{biggest.confidence} confidence · video-based estimate</p></div></div></section>}

    <section className="card"><h2 className="text-2xl font-black text-white">Interactive six-phase viewer</h2><div className="mt-5 flex gap-2 overflow-x-auto pb-2">{phases.map((item) => <button key={item.key} onClick={() => setActivePhase(item.key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${item.key === activePhase ? 'bg-electric-blue text-white' : 'bg-navy-950 text-slate-400'}`}>{item.label}</button>)}</div>{phase && <div className="mt-4 grid gap-5 md:grid-cols-2"><div className="overflow-hidden rounded-xl bg-black">{phase.signedUrl ? <img src={phase.signedUrl} alt={phase.label} className="aspect-video w-full object-contain" /> : <div className="flex aspect-video items-center justify-center text-slate-600">Frame unavailable</div>}</div><div className="rounded-xl bg-navy-950 p-5"><h3 className="text-xl font-bold text-white">{phase.label}</h3><p className="mt-1 text-xs text-electric-blue-light">{phase.time.toFixed(2)} seconds</p><p className="mt-4 text-sm text-slate-300"><b>Strength:</b> {categories[Math.min(categories.length - 1, phases.indexOf(phase))]?.strength ?? 'Coach confirmation pending.'}</p><p className="mt-3 text-sm text-slate-300"><b>Opportunity:</b> {categories[Math.min(categories.length - 1, phases.indexOf(phase))]?.development ?? 'Coach confirmation pending.'}</p><p className="mt-3 text-sm text-slate-300"><b>Measurement:</b> {categories[Math.min(categories.length - 1, phases.indexOf(phase))]?.evidence ?? 'Not available.'}</p><p className="mt-4 text-xs text-slate-500">{phase.confidence_note}</p></div></div>}</section>

    <section className="card"><h2 className="text-2xl font-black text-white">Three personalized drills</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{drills.map((drill) => { const key = `drill:${drill.category}`; return <article key={drill.category} className="rounded-xl border border-surface-border bg-navy-950 p-5"><p className="text-xs font-bold uppercase text-electric-blue-light">{drill.category}</p><h3 className="mt-1 text-lg font-bold text-white">{drill.name}</h3><p className="mt-3 text-sm text-slate-400">{drill.improves}</p><p className="mt-3 text-sm font-semibold text-white">{drill.sets}</p><ul className="mt-3 space-y-1 text-xs text-slate-400">{drill.cues.map((cue) => <li key={cue}>• {cue}</li>)}</ul><p className="mt-3 text-xs text-yellow-300">Common mistake: {drill.mistake}</p><button onClick={() => toggleTask(key)} className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-bold ${progress[key] ? 'bg-accent-green/15 text-accent-green' : 'bg-electric-blue text-white'}`}>{progress[key] ? <><Check className="mr-1 inline h-4 w-4" /> Completed</> : <><Plus className="mr-1 inline h-4 w-4" /> Add/mark complete</>}</button></article>})}</div></section>

    <section className="card"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-electric-blue-light" /><h2 className="text-2xl font-black text-white">Four-week roadmap</h2></div><div className="mt-5 grid gap-4 md:grid-cols-4">{['Learn the movement','Add intensity','Blend into full delivery','Retest and compare'].map((label, index) => { const key = `roadmap:${index + 1}`; return <button key={label} onClick={() => toggleTask(key)} className={`rounded-xl border p-4 text-left ${progress[key] ? 'border-accent-green/30 bg-accent-green/10' : 'border-surface-border bg-navy-950'}`}><p className="text-xs text-slate-500">Week {index + 1}</p><p className="mt-1 font-bold text-white">{label}</p>{progress[key] && <p className="mt-3 text-xs text-accent-green">Complete</p>}</button>})}</div></section>

    <section className="grid gap-6 md:grid-cols-2"><div className="card"><MessageCircle className="h-6 w-6 text-electric-blue-light" /><h2 className="mt-3 text-xl font-bold text-white">Ask your analyst</h2><p className="mt-1 text-sm text-slate-400">Ask up to two concise follow-up questions about this analysis.</p><textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} className="input mt-4 min-h-28" placeholder="What should I focus on first?" /><button onClick={askAnalyst} className="btn-primary mt-3">Send question</button>{message && <p className="mt-2 text-xs text-slate-400">{message}</p>}</div><div className="card"><Download className="h-6 w-6 text-accent-green" /><h2 className="mt-3 text-xl font-bold text-white">Shareable progress card</h2><p className="mt-1 text-sm text-slate-400">Creates a branded image with your score and current focus. Private report details remain hidden.</p><button onClick={downloadShareCard} className="btn-accent mt-4">Download progress card</button><canvas ref={canvasRef} className="hidden" /></div></section>
  </div>
}

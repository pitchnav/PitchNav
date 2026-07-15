import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function saveReview(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return
  const id = String(formData.get('id'))
  const score = Number(formData.get('delivery_score'))
  const feedback = String(formData.get('coach_feedback') ?? '')
  const strengths = String(formData.get('strengths') ?? '').split('\n').map((v) => v.trim()).filter(Boolean).slice(0, 3)
  const priorities = String(formData.get('priorities') ?? '').split('\n').map((v) => v.trim()).filter(Boolean).slice(0, 3)
  await supabase.from('motion_analyses').update({
    delivery_score: Number.isFinite(score) ? score : null,
    coach_feedback: feedback,
    strengths,
    development_priorities: priorities,
    status: 'published',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  }).eq('id', id)
  revalidatePath('/admin/motion-lab')
  revalidatePath('/dashboard')
}

export default async function AdminMotionLabPage() {
  const supabase = await createClient()
  const { data: analyses } = await supabase.from('motion_analyses').select('*,profiles(email,full_name),training_plans(*)').order('created_at', { ascending: false })
  return <div className="space-y-6"><div><h1 className="text-3xl font-black text-white">Motion Lab Reviews</h1><p className="mt-2 text-slate-400">Review measurements, publish feedback, and connect score updates to athlete dashboards.</p></div>
    {!analyses?.length ? <div className="card text-slate-400">No Motion Lab analyses have been submitted.</div> : analyses.map((analysis) => <form action={saveReview} key={analysis.id} className="card space-y-4">
      <input type="hidden" name="id" value={analysis.id}/><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-white">{analysis.title}</h2><p className="text-sm text-slate-500">{analysis.profiles?.full_name ?? analysis.profiles?.email}</p></div><span className="status-badge bg-electric-blue/10 text-electric-blue-light">{analysis.status.replaceAll('_',' ')}</span></div>
      <div className="grid gap-4 md:grid-cols-3"><label><span className="label">Delivery score (0–30)</span><input className="input" name="delivery_score" type="number" min="0" max="30" defaultValue={analysis.delivery_score ?? ''}/></label><label className="md:col-span-2"><span className="label">Athlete-facing coach feedback</span><textarea className="input min-h-24" name="coach_feedback" defaultValue={analysis.coach_feedback ?? ''}/></label><label><span className="label">Three strengths (one per line)</span><textarea className="input min-h-28" name="strengths" defaultValue={(analysis.strengths ?? []).join('\n')}/></label><label><span className="label">Three priorities (one per line)</span><textarea className="input min-h-28" name="priorities" defaultValue={(analysis.development_priorities ?? []).join('\n')}/></label><div className="rounded-xl bg-navy-950 p-4 text-sm text-slate-300"><p>FPS: {analysis.capture_fps ?? '—'}</p><p>Velocity: {analysis.velocity_estimate_low ? `${analysis.velocity_estimate_low}–${analysis.velocity_estimate_high} mph` : 'Not calculated'}</p><p>Confidence: {analysis.velocity_confidence ?? '—'}</p></div></div>
      <button className="btn-primary" type="submit">Publish coach review</button>
    </form>)}</div>
}

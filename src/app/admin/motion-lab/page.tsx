import { scheduleAssessmentFollowup } from '@/lib/assessment-followup-jobs'
import { StandaloneFootStrike } from '@/components/admin/StandaloneFootStrike'
import { landingSampleTimes, sourcePhaseImages, validateMechanicsFindings, type MechanicsFinding } from '@/lib/mechanics-findings'
import { MechanicsFindings, type EvidenceFrame } from '@/components/reports/MechanicsFindings'
import { AssessmentReviewGuide } from '@/components/admin/AssessmentReviewGuide'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { sendMotionAnalysisReadyEmail } from '@/lib/resend'
import { DeleteAnalysisButton } from './DeleteAnalysisButton'

export const maxDuration = 300

async function saveReview(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return
  const id = String(formData.get('id'))
  const rawScore = String(formData.get('delivery_score') ?? '').trim()
  const score = rawScore ? Number(rawScore) : NaN
  const feedback = String(formData.get('coach_feedback') ?? '')
  const strengths = String(formData.get('strengths') ?? '').split('\n').map((v) => v.trim()).filter(Boolean)
  const priorities = String(formData.get('priorities') ?? '').split('\n').map((v) => v.trim()).filter(Boolean)
  const { data: analysisRecord } = await supabase.from('motion_analyses').select('user_id,title,order_id,updated_at,published_at,status,phase_snapshots,biggest_opportunity,profiles!motion_analyses_user_id_fkey(email,full_name)').eq('id', id).single()
  if (!analysisRecord || analysisRecord.order_id) {
    throw new Error('Apply and publish this assessment from its order review.')
  }
  if (analysisRecord.published_at || analysisRecord.status === 'published') throw new Error('This review was already published.')
  const phases = sourcePhaseImages(analysisRecord.phase_snapshots, analysisRecord.user_id, id).filter(phase => phase.key === 'lead_foot_contact')
  const [checkpoint] = validateMechanicsFindings([JSON.parse(String(formData.get('foot_strike_finding')))],
    phases.map(phase => phase.key), landingSampleTimes(phases))
  const opportunity = analysisRecord.biggest_opportunity ?? {}
  const opportunityUpdate = Array.isArray(opportunity.findings)
    ? { ...opportunity, findings: [...opportunity.findings.filter((item: MechanicsFinding) => !item.foot_strike), checkpoint] }
    : { ...opportunity, standalone_foot_strike: checkpoint }
  const { data: saved, error } = await supabase.from('motion_analyses').update({
    biggest_opportunity: opportunityUpdate,
    delivery_score: Number.isFinite(score) ? score : null,
    coach_feedback: feedback,
    strengths,
    development_priorities: priorities,
    status: 'published',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  }).eq('id', id).eq('updated_at', String(formData.get('revision'))).is('published_at', null).select('id').maybeSingle()
  if (error || !saved) throw new Error('This review changed. Reload the assessment before publishing.')
  scheduleAssessmentFollowup(id)
  await supabase.from('training_plans').update({ published_at: new Date().toISOString() }).eq('motion_analysis_id', id)
  const ownerProfile = Array.isArray(analysisRecord?.profiles) ? analysisRecord?.profiles[0] : analysisRecord?.profiles
  if (ownerProfile?.email) await sendMotionAnalysisReadyEmail(ownerProfile.email, ownerProfile.full_name || 'Athlete', id)
  revalidatePath('/admin/motion-lab')
  revalidatePath('/dashboard')
}

async function deleteAnalysis(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return
  const id = String(formData.get('id'))
  await supabase.from('motion_analyses').delete().eq('id', id)
  revalidatePath('/admin/motion-lab')
}

export default async function AdminMotionLabPage() {
  const supabase = await createClient()
  const [{ data: analyses, error: analysesError }, { data: submissions, error: submissionsError }] = await Promise.all([
    supabase.from('motion_analyses').select('*,profiles!motion_analyses_user_id_fkey(email,full_name),training_plans(*)').order('created_at', { ascending: false }),
    supabase.from('orders').select('id,status,created_at,payment_confirmed_at,amount_paid_cents,stripe_checkout_session_id,athlete_profiles(athlete_full_name,athlete_email),video_submissions(id,angle,file_name)').order('created_at', { ascending: false }),
  ])
  if (analysesError) console.error('Motion Lab review queue failed to load', analysesError)
  if (submissionsError) console.error('Order submission queue failed to load', submissionsError)
  const landingFrames = new Map<string, EvidenceFrame>()
  await Promise.all((analyses ?? []).map(async analysis => {
    if (analysis.order_id || analysis.published_at || analysis.status === 'published') return
    const phase = sourcePhaseImages(analysis.phase_snapshots, analysis.user_id, analysis.id).find(phase => phase.key === 'lead_foot_contact')
    if (!phase) return
    const { data } = await supabase.storage.from('analysis-assets').createSignedUrl(phase.storage_path, 3600)
    landingFrames.set(analysis.id, {key:phase.key, label:phase.label ?? 'Landing', time:phase.time,
      sampleTimes:data?.signedUrl ? phase.sample_times : [], columns:phase.columns, url:data?.signedUrl})
  }))
  return <div className="space-y-8"><div><h1 className="text-3xl font-black text-white">Motion Lab Reviews</h1><p className="mt-2 text-slate-400">See every customer video submission, then review and release completed Motion Lab reports.</p><Link href="/admin/tracker-studio" className="btn-secondary mt-4">Open 3D rig studio</Link></div>
    <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">Incoming queue</p><h2 className="mt-1 text-xl font-black text-white">Customer video submissions</h2></div>
      {!submissions?.length ? <div className="card text-slate-400">No customer orders or uploaded videos were found.</div> : <div className="grid gap-4">{submissions.map((submission) => { const athlete = Array.isArray(submission.athlete_profiles) ? submission.athlete_profiles[0] : submission.athlete_profiles; const videos = submission.video_submissions ?? []; return <article key={submission.id} className="card"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h3 className="text-lg font-bold text-white">{athlete?.athlete_full_name ?? 'Athlete name unavailable'}</h3><p className="mt-1 text-sm text-electric-blue-light">{athlete?.athlete_email ?? 'Email unavailable'}</p><p className="mt-2 text-xs capitalize text-slate-500">{submission.status.replaceAll('_',' ')} · {submission.payment_confirmed_at ? `PAID $${((submission.amount_paid_cents ?? 0) / 100).toFixed(2)}` : 'PAYMENT NOT CONFIRMED'} · {videos.length} uploaded video{videos.length === 1 ? '' : 's'}</p>{videos.length > 0 && <p className="mt-2 text-xs text-slate-400">{videos.map((video) => `${video.angle.replaceAll('_',' ')}: ${video.file_name}`).join(' · ')}</p>}</div><Link href={`/admin/orders/${submission.id}`} className="btn-primary shrink-0">Open athlete & videos →</Link></div></article> })}</div>}
    </section>
    <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-green">Reports requiring approval</p><h2 className="mt-1 text-xl font-black text-white">Completed Motion Lab analyses</h2></div>
    {analysesError ? <div className="card border-red-500/30 text-red-300"><p className="font-semibold">Could not load the review queue: {analysesError.message}</p><p className="mt-2 text-sm text-red-300/80">This is a query error, not an empty queue. Reload the page or contact support if this persists.</p></div> : !analyses?.length ? <div className="card text-slate-400"><p className="font-semibold text-white">No completed Motion Lab report has been submitted yet.</p><p className="mt-2 text-sm">Uploaded videos appear in the customer queue above. A report enters this approval section after Motion Lab finishes processing and the athlete submits it for review.</p></div> : analyses.map((analysis) => <form id={analysis.id} action={saveReview} key={analysis.id} className="card scroll-mt-24 space-y-4">
      <input type="hidden" name="id" value={analysis.id}/><input type="hidden" name="revision" value={analysis.updated_at}/><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-white">{analysis.title}</h2><p className="text-sm text-slate-500">{analysis.profiles?.full_name ?? analysis.profiles?.email}</p></div><span className="status-badge bg-electric-blue/10 text-electric-blue-light">{analysis.status.replaceAll('_',' ')}</span></div>
      {(analysis.clip_summary as { deliveryShapeValid?: boolean } | null)?.deliveryShapeValid === false && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">Automatic processing could not confirm this clip shows one complete pitch. Watch the source video before approving — do not release this report on scores alone.</div>}
      <MechanicsFindings findings={analysis.biggest_opportunity?.findings ?? (analysis.biggest_opportunity?.standalone_foot_strike ? [analysis.biggest_opportunity.standalone_foot_strike] : [])} frames={analysis.phase_snapshots ?? []} />
            <AssessmentReviewGuide />
      {!analysis.order_id && !analysis.published_at && analysis.status !== 'published' && <StandaloneFootStrike frame={landingFrames.get(analysis.id)}
        initial={analysis.biggest_opportunity?.findings?.find((item: MechanicsFinding) => item.foot_strike) ?? analysis.biggest_opportunity?.standalone_foot_strike} />}
      {!analysis.order_id && !analysis.published_at && analysis.status !== 'published' && <div className="grid gap-4 md:grid-cols-3"><label><span className="label">Delivery score (0–30)</span><input className="input" name="delivery_score" type="number" min="0" max="30" defaultValue={analysis.delivery_score ?? ''}/></label><label className="md:col-span-2"><span className="label">Athlete-facing coach feedback</span><textarea className="input min-h-24" name="coach_feedback" defaultValue={analysis.coach_feedback ?? ''}/></label><label><span className="label">Strengths (one per line)</span><textarea className="input min-h-28" name="strengths" defaultValue={(analysis.strengths ?? []).join('\n')}/></label><label><span className="label">Priorities (one per line)</span><textarea className="input min-h-28" name="priorities" defaultValue={(analysis.development_priorities ?? []).join('\n')}/></label><div className="rounded-xl bg-navy-950 p-4 text-sm text-slate-300"><p>FPS: {analysis.capture_fps ?? '—'}</p><p>Velocity: {analysis.velocity_estimate_low ? `${analysis.velocity_estimate_low}–${analysis.velocity_estimate_high} mph` : 'Not calculated'}</p><p>Confidence: {analysis.velocity_confidence ?? '—'}</p></div></div>}
      <div className="flex flex-wrap gap-3">{analysis.order_id ?
        <Link className="btn-primary" href={'/admin/orders/' + analysis.order_id + '?tab=report'}>Open order for approval</Link> :
        (!analysis.published_at && analysis.status !== 'published' && <button className="btn-primary" type="submit">Approve & release to athlete</button>)}<DeleteAnalysisButton deleteAnalysis={deleteAnalysis} /></div>
    </form>)}</section></div>
}

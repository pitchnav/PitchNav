import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isMechanicsOverview, overviewEvidence } from '@/lib/mechanics-overview'
import { landingSampleTimes, sourcePhaseImages, validateMechanicsFindings } from '@/lib/mechanics-findings'

export async function POST(request: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })
  const { data: staff } = await db.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!staff?.is_admin) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.analysisId !== 'string' || typeof body.orderId !== 'string' ||
      typeof body.revision !== 'string' || typeof body.summary !== 'string' || !body.summary.trim()) {
    return NextResponse.json({ error: 'Select an order and enter the assessment.' }, { status: 400 })
  }
  const { data: analysis } = await db.from('motion_analyses')
    .select('id,user_id,order_id,athlete_profile_id,status,phase_snapshots,clip_summary,published_at,updated_at')
    .eq('id', body.analysisId).maybeSingle()
  const { data: order } = await db.from('orders').select('id,status,user_id,athlete_profile_id')
    .eq('id', body.orderId).maybeSingle()
  if (!analysis || !order || analysis.user_id !== order.user_id ||
      (analysis.order_id ? analysis.order_id !== order.id : !analysis.athlete_profile_id || analysis.athlete_profile_id !== order.athlete_profile_id)) {
    return NextResponse.json({ error: 'The analysis does not belong to this order.' }, { status: 409 })
  }
  if (analysis.published_at || analysis.status === 'published' || ['complete','cancelled','refunded'].includes(order.status)) {
    return NextResponse.json({ error: 'This review is closed.' }, { status: 409 })
  }
  const snapshots = Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots : []
  const phases = sourcePhaseImages(snapshots, analysis.user_id, analysis.id)
  const keys = phases.map(phase => phase.key)
  if (isMechanicsOverview(analysis.clip_summary?.delivery_overview?.storage_path, analysis.user_id, analysis.id)) keys.push(overviewEvidence.key)
  let findings
  try {
    findings = validateMechanicsFindings(body.findings, keys, landingSampleTimes(phases))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid finding.' }, { status: 400 })
  }
  const { data: saved, error } = await db.from('motion_analyses').update({
    biggest_opportunity: { findings }, coach_feedback: body.summary.trim(),
    strengths: [], development_priorities: findings.flatMap(item => item.coaching_action ? [item.coaching_action] : []),
    category_scores: [], delivery_score: null,
    phase_snapshots: snapshots.map(phase => {
      const notes = findings.filter(item => item.evidence_keys.includes(phase.key)).map(item => item.answer)
      return { ...phase, answer: notes.join(' ') || null, strength: null, opportunity: null, coaching_cue: null }
    }),
    order_id: order.id, status: 'coach_review', ai_draft_status: 'ready_for_staff_review',
    ai_generated_at: null, ai_model: null,
  }).eq('id', analysis.id).eq('updated_at', body.revision).is('published_at', null)
    .select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not save review: ' + error.message }, { status: 500 })
  if (!saved) return NextResponse.json({ error: 'Another reviewer updated this assessment. Reload before saving.' }, { status: 409 })
  return NextResponse.json({ ok: true })
}

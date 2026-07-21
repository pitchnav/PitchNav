import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { calculateDeliveryScore } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

const POSITION_FROM_AUTOMATED: Record<string, string> = {
  peak_leg_lift: 'peak_leg_lift',
  hand_separation: 'hand_separation',
  lead_foot_contact: 'lead_foot_contact',
  maximum_external_rotation: 'max_external_rotation',
  ball_release: 'ball_release',
  finish: 'finish_deceleration',
}

function scorecardKey(category: string) {
  return category.toLowerCase().replace(/[–—-]+/g, '_').replace(/\s+/g, '_')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

    const { analysisId, orderId } = await request.json() as { analysisId?: string; orderId?: string }
    if (!analysisId || !orderId) return NextResponse.json({ error: 'Missing analysis or order ID.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: analysis, error: analysisError } = await admin.from('motion_analyses')
      .select('id,delivery_score,category_scores,phase_snapshots,strengths,development_priorities,coach_feedback,biggest_opportunity,velocity_estimate_low,velocity_estimate_high,velocity_confidence,ai_draft_status')
      .eq('id', analysisId)
      .single()

    if (analysisError) return NextResponse.json({ error: `Could not load AI draft: ${analysisError.message}` }, { status: 500 })
    if (!analysis) return NextResponse.json({ error: 'Saved Motion Lab analysis not found.' }, { status: 404 })
    if (analysis.ai_draft_status !== 'ready_for_staff_review') {
      return NextResponse.json({ error: 'Generate the AI coaching draft before applying it.' }, { status: 409 })
    }

    const categories = Array.isArray(analysis.category_scores) ? analysis.category_scores as Array<Record<string, unknown>> : []
    const deliveryScore = calculateDeliveryScore(
      categories as Array<{ score?: number | null }>,
      analysis.delivery_score,
    )
    const phases = Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots as Array<Record<string, unknown>> : []
    const strengths = Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 3) : []
    const priorities = Array.isArray(analysis.development_priorities) ? analysis.development_priorities.slice(0, 3) : []
    const opportunity = analysis.biggest_opportunity && typeof analysis.biggest_opportunity === 'object'
      ? analysis.biggest_opportunity as Record<string, unknown>
      : {}
    const opportunityText = [
      opportunity.title,
      opportunity.observation,
      opportunity.why_it_matters,
      opportunity.coaching_cue ? `Coaching cue: ${opportunity.coaching_cue}` : null,
    ].filter(Boolean).join('\n\n')
    const velocityRange = analysis.velocity_estimate_low !== null && analysis.velocity_estimate_high !== null
      ? `Video-estimated range: ${Number(analysis.velocity_estimate_low).toFixed(1)}–${Number(analysis.velocity_estimate_high).toFixed(1)} mph (${analysis.velocity_confidence ?? 'limited'} confidence). Not radar verified.`
      : 'No video velocity range was produced. Do not infer exact velocity from mechanics scores.'

    const { data: report, error: reportError } = await admin.from('analysis_reports').upsert({
      order_id: orderId,
      analyst_id: user.id,
      delivery_score: deliveryScore,
      three_strengths: strengths,
      three_priorities: priorities,
      main_focus: opportunityText || analysis.coach_feedback || 'Your primary focus will be confirmed in the completed report.',
      secondary_focuses: priorities.slice(1),
      reviewer_velocity_notes: velocityRange,
    }, { onConflict: 'order_id' }).select('id').single()

    if (reportError || !report) {
      return NextResponse.json({ error: `Could not create report draft: ${reportError?.message ?? 'unknown error'}` }, { status: 500 })
    }

    for (const category of categories) {
      const key = scorecardKey(String(category.category ?? ''))
      if (!key) continue
      const note = [
        category.strength ? `Strength: ${category.strength}` : null,
        category.development ? `Opportunity: ${category.development}` : null,
        category.evidence ? `Visible evidence: ${category.evidence}` : null,
        category.confidence ? `Confidence: ${category.confidence}` : null,
      ].filter(Boolean).join(' ')
      const { error } = await admin.from('scorecard_categories').upsert({
        report_id: report.id,
        category: key,
        score: Math.max(1, Math.min(5, Number(category.score) || 3)),
        notes: note,
      }, { onConflict: 'report_id,category' })
      if (error) return NextResponse.json({ error: `Could not apply ${key} score: ${error.message}` }, { status: 500 })
    }

    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index]
      const phaseKey = String(phase.key ?? '')
      const position = POSITION_FROM_AUTOMATED[phaseKey]
      const storagePath = typeof phase.storage_path === 'string' ? phase.storage_path : ''
      if (!position || !storagePath) continue
      const time = Number(phase.time)
      const { error } = await admin.from('position_screenshots').upsert({
        report_id: report.id,
        position,
        storage_path: storagePath,
        reviewer_notes: Number.isFinite(time)
          ? `Key frame from your delivery at ${time.toFixed(2)} seconds.`
          : 'Key frame from your delivery.',
        strengths: typeof phase.strength === 'string' ? phase.strength : null,
        development_opportunity: typeof phase.opportunity === 'string' ? phase.opportunity : null,
        coaching_cue: typeof phase.coaching_cue === 'string' ? phase.coaching_cue : null,
        quality_note: typeof phase.confidence_note === 'string' ? phase.confidence_note : null,
        sort_order: index,
      }, { onConflict: 'report_id,position' })
      if (error) return NextResponse.json({ error: `Could not apply ${phaseKey} frame: ${error.message}` }, { status: 500 })
    }

    const { error: analysisUpdateError } = await admin.from('motion_analyses').update({
      delivery_score: deliveryScore,
      ai_draft_status: 'staff_verified',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', analysisId)
    if (analysisUpdateError) return NextResponse.json({ error: `Report was created, but verification status failed: ${analysisUpdateError.message}` }, { status: 500 })

    await admin.from('orders').update({ status: 'report_being_prepared' }).eq('id', orderId)
    return NextResponse.json({ ok: true, reportId: report.id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not apply the verified AI draft.' }, { status: 500 })
  }
}

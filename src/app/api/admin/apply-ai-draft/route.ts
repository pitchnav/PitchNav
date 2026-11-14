import { scheduleAssessmentFollowup } from '@/lib/assessment-followup-jobs'
import { buildBaseballPerformancePlan, type CategoryAssessment } from '@/lib/performance-plan'
import { buildEightWeekThrowingPlan } from '@/lib/throwing-plan'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { landingSampleTimes, validateMechanicsFindings } from '@/lib/mechanics-findings'
import { calculateDeliveryScore } from '@/lib/utils'
import type { MechanicsFinding } from '@/lib/mechanics-findings'
import { figure8Drill, janitorDrill, preferredReviewedDrill } from '@/lib/reviewed-drill-matches'

export const runtime = 'nodejs'
export const maxDuration = 300

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

// Both AI-assisted and manually authored reviews use the staff-approved evidence.
async function reviewedPlanUpdate(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  orderId: string,
  categories: CategoryAssessment[],
  findings: MechanicsFinding[]
) {
  const { data: plan, error: planLoadError } = await admin.from('training_plans')
    .select('id,starts_on,strength_mobility_weeks')
    .eq('motion_analysis_id', analysisId)
    .maybeSingle()
  if (planLoadError) throw new Error(`Could not load the training plan: ${planLoadError.message}`)
  if (!plan) return null
  const planStart = plan.starts_on ? new Date(`${plan.starts_on}T12:00:00Z`) : new Date()
  const finalReview = new Date(planStart)
  finalReview.setUTCDate(finalReview.getUTCDate() + 56)
  const planUpdate = {
    duration_weeks: 8,
    title: '8-Week Pitching Development Plan',
    weeks: [] as ReturnType<typeof buildEightWeekThrowingPlan>,
    strength_mobility_weeks: [] as ReturnType<typeof buildBaseballPerformancePlan>,
    rolling_window_days: 14,
    follow_up_date: finalReview.toISOString().slice(0, 10),
  }
  // A cue without a routed category remains in the report. It is insufficient
  // to select a drill, diagnose a strength limitation, or prescribe a program.
  const corrections = findings.filter(finding => finding.verdict === 'observed' && finding.coaching_action)
  if (!corrections.length || !categories.length) return planUpdate

  const { data: drillCatalog, error: drillsError } = await admin.from('drills')
    .select('name,category,description,coaching_cues,sets,reps')
    .eq('is_active', true)
  if (drillsError) throw new Error(`Could not load the drill library: ${drillsError.message}`)
  const { data: order, error: orderError } = await admin.from('orders').select('amount_paid_cents').eq('id', orderId).single()
  if (orderError || !order) throw new Error('Could not verify the purchased plan.')
  const includesStrength = (order.amount_paid_cents ?? 0) >= 4000 ||
    (Array.isArray(plan.strength_mobility_weeks) && plan.strength_mobility_weeks.length > 0)
  const catalog = (drillCatalog ?? []) as Array<{ name: string; category: string; description: string }>
  const priorities = corrections.map(finding => finding.coaching_action!)
  const tasks = corrections.map(finding => {
    const action = finding.coaching_action!
    const preferred = preferredReviewedDrill(finding)
    const drill = catalog.find(drill => action.startsWith(drill.name + '.') &&
      (![figure8Drill, janitorDrill].includes(drill.name) || drill.name === preferred))
    return { task:action, drillName:drill?.name ?? null }
  })
  planUpdate.weeks = buildEightWeekThrowingPlan(categories, priorities, catalog, undefined, tasks)
  if (includesStrength) planUpdate.strength_mobility_weeks = buildBaseballPerformancePlan(categories, priorities)
  return planUpdate
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
      .select('id,user_id,order_id,updated_at,published_at,status,clip_summary,delivery_score,category_scores,phase_snapshots,strengths,development_priorities,coach_feedback,biggest_opportunity,velocity_estimate_low,velocity_estimate_high,velocity_confidence,ai_draft_status')
      .eq('id', analysisId)
      .single()

    if (analysisError) return NextResponse.json({ error: `Could not load AI draft: ${analysisError.message}` }, { status: 500 })
    if (!analysis) return NextResponse.json({ error: 'Saved Motion Lab analysis not found.' }, { status: 404 })
    if (analysis.published_at || analysis.status === 'published' || analysis.ai_draft_status !== 'ready_for_staff_review') {
      return NextResponse.json({ error: 'Only a saved, unpublished review can be applied.' }, { status: 409 })
    }

    if (analysis.order_id && analysis.order_id !== orderId) {
      return NextResponse.json({ error: 'This analysis belongs to a different order.' }, { status: 409 })
    }
    if (!analysis.order_id) {
      const { data: order } = await admin.from('orders').select('user_id').eq('id', orderId).single()
      if (!order || order.user_id !== analysis.user_id) {
        return NextResponse.json({ error: 'The order and analysis must belong to the same athlete.' }, { status: 409 })
      }
    }
    const categories = Array.isArray(analysis.category_scores) ? analysis.category_scores as Array<Record<string, unknown>> : []
    const snapshots = Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots as Array<Record<string, unknown>> : []
    const phases = snapshots.filter(shot => {
      const key = String(shot.key)
      return Object.hasOwn(POSITION_FROM_AUTOMATED, key) && shot.storage_path === `${analysis.user_id}/motion-lab/${analysis.id}/phases/${key}.png`
    })
    const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : []
    const priorities = Array.isArray(analysis.development_priorities) ? analysis.development_priorities : []
    const opportunity = analysis.biggest_opportunity && typeof analysis.biggest_opportunity === 'object'
      ? analysis.biggest_opportunity as Record<string, unknown>
      : {}
    const expectedOverview = `${analysis.user_id}/motion-lab/${analysis.id}/phases/delivery_overview.png`
    const overviewPath = analysis.clip_summary?.delivery_overview?.storage_path === expectedOverview ? expectedOverview : null
    const evidenceKeys = phases.map(shot => String(shot.key))
    if (overviewPath) evidenceKeys.push('delivery_overview')
    let findings = null
    if (Array.isArray(opportunity.findings)) {
      try {
        findings = validateMechanicsFindings(opportunity.findings, evidenceKeys, landingSampleTimes(phases))
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Review the landing evidence.' }, { status: 409 })
      }
    }
    // An older assessment can still be verified from the actual notes and scorecard.
    const legacyFocus = [opportunity.title, opportunity.observation, opportunity.why_it_matters,
      typeof opportunity.coaching_cue === 'string' ? opportunity.coaching_cue : null].filter(v => typeof v === 'string' && v.trim()).join('\n\n')
    const deliveryScore = findings && categories.length !== 6 ? null : calculateDeliveryScore(categories, analysis.delivery_score)
    // Decision D-010 removed video-estimated velocity, so there is no estimated
    // range to report and the athlete's radar-verified number comes from intake.
    // The note is now constant rather than a branch on a column nothing writes.
    const velocityRange = 'Velocity is not estimated from video. Use the athlete-reported radar number from intake, and do not infer exact velocity from mechanics scores.'

    const report = {
      delivery_score: deliveryScore,
      three_strengths: strengths,
      three_priorities: priorities,
      main_focus: findings ? analysis.coach_feedback : legacyFocus || analysis.coach_feedback,
      mechanics_findings: findings,
      mechanics_overview_path: overviewPath,
      secondary_focuses: priorities.slice(1),
      reviewer_velocity_notes: velocityRange,
    }
    const scores = []
    for (const category of categories) {
      const key = scorecardKey(String(category.category ?? ''))
      if (!key) continue
      const note = [
        category.strength ? `Strength: ${category.strength}` : null,
        category.development ? `Opportunity: ${category.development}` : null,
        category.evidence ? `Visible evidence: ${category.evidence}` : null,
        category.confidence ? `Confidence: ${category.confidence}` : null,
        category.likely_cause ? `Likely cause: ${String(category.likely_cause).replaceAll('_', ' ')}` : null,
      ].filter(Boolean).join(' ')
      scores.push({
        category: key,
        score: Math.max(1, Math.min(5, Number(category.score) || 3)),
        notes: note,
      })
    }
    const pictures = []
    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index]
      const phaseKey = String(phase.key ?? '')
      const position = POSITION_FROM_AUTOMATED[phaseKey]
      const storagePath = typeof phase.storage_path === 'string' ? phase.storage_path : ''
      if (!position || !storagePath) continue
      const time = Number(phase.time)
      pictures.push({
        position,
        storage_path: storagePath,
        reviewer_notes: typeof phase.answer === 'string' ? phase.answer : Number.isFinite(time)
          ? `Key frame from your delivery at ${time.toFixed(2)} seconds.`
          : 'Key frame from your delivery.',
        strengths: typeof phase.strength === 'string' ? phase.strength : null,
        development_opportunity: typeof phase.opportunity === 'string' ? phase.opportunity : null,
        coaching_cue: typeof phase.coaching_cue === 'string' ? phase.coaching_cue : null,
        quality_note: typeof phase.confidence_note === 'string' ? phase.confidence_note : null,
        sort_order: index,
      })
    }

    const plan = findings ? await reviewedPlanUpdate(admin, analysisId, orderId, categories as CategoryAssessment[], findings) : null
    const { data: reportId, error } = await admin.rpc('apply_reviewed_mechanics', {
      analysis_id: analysisId, order_id_arg: orderId, staff_id: user.id, expected_revision: analysis.updated_at,
      report_data: report, score_rows: scores, phase_rows: pictures, plan_data: plan,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'P0001' ? 409 : 500 })
    scheduleAssessmentFollowup(analysisId)
    return NextResponse.json({ ok: true, reportId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not apply the verified AI draft.' }, { status: 500 })
  }
}

import { scheduleAssessmentFollowup } from '@/lib/assessment-followup-jobs'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendMotionAnalysisReadyEmail } from '@/lib/resend'
import { buildTrainingPlanPublishUpdate } from '@/lib/training-plan-schedule'
import { validateMechanicsFindings, landingSampleTimes, sourcePhaseImages } from '@/lib/mechanics-findings'
import { isMechanicsOverview, overviewEvidence } from '@/lib/mechanics-overview'
import { calculateDeliveryScore } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

    const { analysisId, orderId } = await request.json() as { analysisId?: string; orderId?: string }
    if (!analysisId || !orderId) return NextResponse.json({ error: 'Missing analysis or order ID.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: analysis, error: analysisError } = await admin.from('motion_analyses')
      .select('id,user_id,order_id,status,updated_at,ai_draft_status,delivery_score,category_scores,coach_feedback,biggest_opportunity,phase_snapshots,clip_summary')
      .eq('id', analysisId)
      .single()
    if (analysisError || !analysis) {
      return NextResponse.json({ error: `Could not load the analysis: ${analysisError?.message ?? 'not found'}` }, { status: 500 })
    }
    if (analysis.order_id && analysis.order_id !== orderId) {
      return NextResponse.json({ error: 'This analysis belongs to a different order.' }, { status: 409 })
    }
    const categories = Array.isArray(analysis.category_scores)
      ? analysis.category_scores as Array<{ score?: number | null }>
      : []
    const structured = Array.isArray(analysis.biggest_opportunity?.findings)
    const deliveryScore = structured && categories.length !== 6 ? null : calculateDeliveryScore(categories, analysis.delivery_score)
    const verified = analysis.ai_draft_status === 'staff_verified' || analysis.ai_draft_status === 'published'
    if (!analysis.coach_feedback || (structured ? !verified : categories.length < 6 || deliveryScore === null)) {
      return NextResponse.json({ error: 'Apply and verify the AI draft before publishing.' }, { status: 409 })
    }

    const { data: report, error: reportError } = await admin.from('analysis_reports')
      .select('id,published_at,mechanics_findings')
      .eq('order_id', orderId)
      .single()
    if (reportError || !report || (structured && !Array.isArray(report.mechanics_findings))) {
      return NextResponse.json({ error: `The athlete report has not been created: ${reportError?.message ?? 'not found'}` }, { status: 409 })
    }

    if (structured && (analysis.status !== 'published' || !report.published_at)) {
      const phases = sourcePhaseImages(analysis.phase_snapshots, analysis.user_id, analysis.id)
      const keys = phases.map(phase => phase.key)
      if (isMechanicsOverview(analysis.clip_summary?.delivery_overview?.storage_path, analysis.user_id, analysis.id)) keys.push(overviewEvidence.key)
      try {
        // Athletes can open either the Motion Lab feedback or the order report.
        for (const findings of [analysis.biggest_opportunity?.findings, report.mechanics_findings]) {
          validateMechanicsFindings(findings, keys, landingSampleTimes(phases))
        }
      } catch {
        return NextResponse.json({ error: 'Save and apply the hand-up L and torso check before publishing this assessment.' }, { status: 409 })
      }
    }

    const { data: plan, error: planLoadError } = await admin.from('training_plans')
      .select('id,published_at,starts_on,follow_up_date')
      .eq('motion_analysis_id', analysisId)
      .maybeSingle()
    if (planLoadError) return NextResponse.json({ error: planLoadError.message }, { status: 500 })
    if (!plan && !structured) {
      return NextResponse.json({ error: 'The athlete training plan has not been created.' }, { status: 409 })
    }
    const now = new Date().toISOString()
    const wasPublished = analysis.status === 'published' && Boolean(report.published_at)
    const { data: published, error: publishAnalysisError } = await admin.from('motion_analyses').update({
      status: 'published',
      ai_draft_status: 'published',
      reviewed_by: user.id,
      reviewed_at: now,
      published_at: now,
      delivery_score: deliveryScore,
    }).eq('id', analysisId).eq('updated_at', analysis.updated_at).select('id').maybeSingle()
    if (!publishAnalysisError && !published) return NextResponse.json({ error: 'The review changed. Reload before publishing.' }, { status: 409 })
    if (publishAnalysisError) return NextResponse.json({ error: `Could not publish feedback: ${publishAnalysisError.message}` }, { status: 500 })

    if (plan) {
      const planUpdate = buildTrainingPlanPublishUpdate(now, plan)
      const { error: planError } = await admin.from('training_plans').update(planUpdate).eq('id', plan.id)
      if (planError) return NextResponse.json({ error: `Feedback was published, but the plan failed: ${planError.message}` }, { status: 500 })
    }

    const { error: reportPublishError } = await admin.from('analysis_reports').update({ published_at: now, delivery_score: deliveryScore }).eq('id', report.id)
    if (reportPublishError) return NextResponse.json({ error: `Feedback was published, but the order report failed: ${reportPublishError.message}` }, { status: 500 })

    const { error: orderError } = await admin.from('orders').update({ status: 'complete', completed_at: now }).eq('id', orderId)
    if (orderError) return NextResponse.json({ error: `Report was published, but order completion failed: ${orderError.message}` }, { status: 500 })

    await admin.from('order_status_history').insert({
      order_id: orderId,
      new_status: 'complete',
      changed_by: user.id,
      note: 'Staff-verified report released to athlete.',
    })

    scheduleAssessmentFollowup(analysisId)
    let notificationSent = true
    let notificationError: string | null = null
    if (!wasPublished) {
      const { data: athlete } = await admin.from('profiles').select('email,full_name').eq('id', analysis.user_id).single()
      if (athlete?.email) {
        const delivery = await sendMotionAnalysisReadyEmail(athlete.email, athlete.full_name || 'Athlete', analysisId)
        if (!delivery.success) {
          notificationSent = false
          notificationError = delivery.error
          console.error('Motion analysis ready email was not delivered', delivery.error)
        }
      } else {
        notificationSent = false
        notificationError = 'Athlete has no email on file.'
      }
    }

    return NextResponse.json({ ok: true, notificationSent, notificationError })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not publish and send the report.' }, { status: 500 })
  }
}

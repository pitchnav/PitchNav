import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { buildBaseballPerformancePlan, type CategoryAssessment } from '@/lib/performance-plan'
import { buildEightWeekThrowingPlan } from '@/lib/throwing-plan'
import { calculateDeliveryScore } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 300

const CATEGORIES = ['Direction', 'Lower-Half Sequencing', 'Upper-Half Timing', 'Front-Side Stability', 'Posture', 'Release Consistency']

const schema = {
  type: 'object', additionalProperties: false,
  required: ['overall_assessment', 'delivery_score', 'strengths', 'development_priorities', 'categories', 'phase_notes', 'biggest_opportunity'],
  properties: {
    overall_assessment: { type: 'string', minLength: 300 },
    delivery_score: { type: 'integer', minimum: 6, maximum: 30 },
    strengths: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', minLength: 100 } },
    development_priorities: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', minLength: 140 } },
    biggest_opportunity: { type: 'object', additionalProperties: false, required: ['title', 'observation', 'why_it_matters', 'coaching_cue'], properties: { title: { type: 'string', minLength: 12 }, observation: { type: 'string', minLength: 100 }, why_it_matters: { type: 'string', minLength: 100 }, coaching_cue: { type: 'string', minLength: 60 } } },
    categories: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['category', 'score', 'strength', 'development', 'evidence', 'confidence'], properties: { category: { type: 'string', enum: CATEGORIES }, score: { type: 'integer', minimum: 1, maximum: 5 }, strength: { type: 'string', minLength: 100 }, development: { type: 'string', minLength: 180 }, evidence: { type: 'string', minLength: 100 }, confidence: { type: 'string', enum: ['High', 'Moderate', 'Limited'] } } } },
    phase_notes: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['key', 'strength', 'opportunity', 'coaching_cue', 'confidence_note'], properties: { key: { type: 'string', enum: ['peak_leg_lift', 'hand_separation', 'lead_foot_contact', 'maximum_external_rotation', 'ball_release', 'finish'] }, strength: { type: 'string', minLength: 80 }, opportunity: { type: 'string', minLength: 120 }, coaching_cue: { type: 'string', minLength: 50 }, confidence_note: { type: 'string', minLength: 50 } } } },
  },
}

function getOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text
  for (const item of (Array.isArray(payload.output) ? payload.output : []) as Array<{ content?: Array<{ type?: string; text?: string }> }>) {
    for (const content of item.content ?? []) if (content.type === 'output_text' && content.text) return content.text
  }
  return ''
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY has not been added to Vercel.' }, { status: 503 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })
    const { analysisId } = await request.json() as { analysisId?: string }
    if (!analysisId) return NextResponse.json({ error: 'Missing analysis ID.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: analysis, error: analysisError } = await admin.from('motion_analyses')
      .select('id,mechanics_metrics,clip_summary,category_scores,phase_snapshots,capture_fps,athlete_profiles(date_of_birth,height_feet,height_inches,weight_lbs,throwing_hand,playing_level,current_avg_velocity,current_max_velocity,goal_velocity,main_goal,mechanical_concern,throwing_program,strength_program,upcoming_deadline,bullpen_intensity,pitches_per_week)')
      .eq('id', analysisId).single()
    if (analysisError) return NextResponse.json({ error: `Could not load the saved Motion Lab result: ${analysisError.message}` }, { status: 500 })
    if (!analysis) return NextResponse.json({ error: 'Motion analysis not found.' }, { status: 404 })
    const snapshots = Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots as Array<{ key: string; storage_path?: string; time?: number; confidence_note?: string }> : []
    const images: Array<Record<string, unknown>> = []
    for (const shot of snapshots) {
      if (!shot.storage_path) continue
      const { data } = await admin.storage.from('analysis-assets').createSignedUrl(shot.storage_path, 1800)
      if (data?.signedUrl) {
        images.push({ type: 'input_text', text: `Phase candidate ${shot.key}, at ${shot.time ?? 'unknown'} seconds. Detector note: ${shot.confidence_note ?? 'none'}.` })
        images.push({ type: 'input_image', image_url: data.signedUrl, detail: 'high' })
      }
    }
    if (images.length < 12) return NextResponse.json({
      error: 'Automatic six-phase processing has not finished for this order. Retry automatic processing only if the customer processing screen was interrupted.',
    }, { status: 409 })
    const athlete = Array.isArray(analysis.athlete_profiles) ? analysis.athlete_profiles[0] : analysis.athlete_profiles
    const prompt = `Prepare a conservative baseball pitching-coach draft for mandatory human review. Analyze only visible evidence in these side-view phase candidates and supplied 2D pose data. Do not diagnose injury, calculate injury risk, claim laboratory biomechanics, infer exact internal joint rotation, or promise velocity gains. Lower confidence for obscured phases. Maximum external rotation and ball release are only candidates. Scores are internal coaching scores, not medical scores.

Write every athlete-facing field so an eighth grader can understand it on the first read. Use short, direct sentences and familiar body words. If a baseball term is necessary, explain it in the same sentence. Do not use vague handoffs such as “staff should confirm,” “review whether,” “a basic directional check is possible,” or “use this as a starting point.” Do not use unexplained phrases such as “plate-line direction,” “lateral drift,” “frontal plane,” or “kinetic chain.”

Give the athlete enough value for a paid detailed review:
- The overall assessment must be 5–7 sentences. Start with the clearest pattern, state the main problem, explain why it matters, and end with the first action and the two-week reassessment goal.
- Each category strength must be 2–3 sentences: say exactly what body part did well, when it happened, and why it helps.
- Each category development field must be 3–4 sentences: plainly state what the athlete is not doing well, when it happens, why it matters, and one specific cue or drill goal. Do not soften the weakness into a non-answer.
- Each evidence field must be 2–3 sentences tied to a visible phase, time, or supplied measurement. Explain what the evidence means in plain language.
- Each top-level strength and priority must be at least 2 complete sentences.
- When the camera truly cannot show a movement, do not invent a fault. Name the exact thing that is hidden in plain language, say what can still be seen, and give a specific setup or comparison for the next two-week video check.
- The eight-week plan is reassessed at weeks 2, 4, 6, and 8. The week-8 review leads to a new program based on the athlete’s in-season, preseason, or offseason workload.

Every development priority must name an observable weakness and the phase/evidence supporting it, because verified category weaknesses will be mapped directly to baseball throwing, strength, and mobility work. Do not prescribe a lift as a guaranteed mechanics correction.
Athlete: ${JSON.stringify(athlete ?? {})}
Capture FPS: ${analysis.capture_fps ?? 'unknown'}
Clip summary: ${JSON.stringify(analysis.clip_summary ?? {})}
2D pose metrics: ${JSON.stringify(analysis.mechanics_metrics ?? {})}
Deterministic candidates (supporting data only): ${JSON.stringify(analysis.category_scores ?? [])}`
    const model = process.env.OPENAI_MECHANICS_MODEL || 'gpt-5.4-mini'
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model, reasoning: { effort: 'medium' }, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, ...images] }], text: { verbosity: 'high', format: { type: 'json_schema', name: 'pitch_nav_mechanics_draft', strict: true, schema } } }) })
    const payload = await response.json() as Record<string, unknown>
    if (!response.ok) return NextResponse.json({ error: (payload.error as { message?: string } | undefined)?.message || 'OpenAI could not generate the draft.' }, { status: 502 })
    const output = getOutputText(payload)
    if (!output) return NextResponse.json({ error: 'The AI response did not contain a report.' }, { status: 502 })
    const draft = JSON.parse(output) as { overall_assessment: string; delivery_score: number; strengths: string[]; development_priorities: string[]; biggest_opportunity: Record<string, string>; categories: unknown[]; phase_notes: Array<Record<string, string>> }
    const deliveryScore = calculateDeliveryScore(
      draft.categories as Array<{ score?: number | null }>,
      draft.delivery_score,
    )
    const notes = new Map(draft.phase_notes.map((phase) => [phase.key, phase]))
    const { error } = await admin.from('motion_analyses').update({ delivery_score: deliveryScore, strengths: draft.strengths, development_priorities: draft.development_priorities, coach_feedback: draft.overall_assessment, category_scores: draft.categories, phase_snapshots: snapshots.map((shot) => ({ ...shot, ...(notes.get(shot.key) ?? {}) })), biggest_opportunity: draft.biggest_opportunity, ai_draft_status: 'ready_for_staff_review', ai_generated_at: new Date().toISOString(), ai_model: model }).eq('id', analysisId)
    if (error) throw error

    // Rebuild the throwing plan from the final AI-assisted weaknesses for every
    // athlete. Performance members also receive the correlated strength plan.
    const { data: plan, error: planLoadError } = await admin.from('training_plans')
      .select('id,starts_on,strength_mobility_weeks')
      .eq('motion_analysis_id', analysisId)
      .maybeSingle()
    if (planLoadError) throw planLoadError
    const currentPerformanceWeeks = Array.isArray(plan?.strength_mobility_weeks) ? plan.strength_mobility_weeks : []
    if (plan) {
      const planStart = plan.starts_on ? new Date(`${plan.starts_on}T12:00:00Z`) : new Date()
      const finalReview = new Date(planStart)
      finalReview.setUTCDate(finalReview.getUTCDate() + 56)
      const planUpdate: Record<string, unknown> = {
        duration_weeks: 8,
        title: '8-Week Pitching Development Plan',
        weeks: buildEightWeekThrowingPlan(draft.categories as CategoryAssessment[], draft.development_priorities),
        rolling_window_days: 14,
        follow_up_date: finalReview.toISOString().slice(0, 10),
      }
      if (currentPerformanceWeeks.length > 0) {
        planUpdate.strength_mobility_weeks = buildBaseballPerformancePlan(
          draft.categories as CategoryAssessment[],
          draft.development_priorities
        )
      }
      const { error: planUpdateError } = await admin.from('training_plans')
        .update(planUpdate)
        .eq('id', plan.id)
      if (planUpdateError) throw planUpdateError
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not generate AI mechanics draft.' }, { status: 500 })
  }
}

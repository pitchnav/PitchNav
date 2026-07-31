import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { buildBaseballPerformancePlan, type CategoryAssessment } from '@/lib/performance-plan'
import { buildEightWeekThrowingPlan } from '@/lib/throwing-plan'
import { calculateDeliveryScore } from '@/lib/utils'
import { summarizeScreenSession, type ScreenResult } from '@/lib/movement-screens'
import { buildConvergenceReport, type DeliveryMetrics } from '@/lib/screen-mechanics-convergence'
import { buildAthleteContext, type AthleteProfileInput } from '@/lib/athlete-context'

export const runtime = 'nodejs'
export const maxDuration = 300

const CATEGORIES = ['Direction', 'Lower-Half Sequencing', 'Upper-Half Timing', 'Front-Side Stability', 'Posture', 'Release Consistency']
const LIKELY_CAUSES = [
  'hamstring_tightness_or_weakness',
  'hip_mobility_limitation',
  'ankle_stability_limitation',
  'core_pelvis_control',
  'thoracic_mobility_limitation',
  'scapular_control_limitation',
  'general_repeatability',
]

const schema = {
  type: 'object', additionalProperties: false,
  required: ['overall_assessment', 'delivery_score', 'strengths', 'development_priorities', 'categories', 'phase_notes', 'biggest_opportunity'],
  properties: {
    overall_assessment: { type: 'string', minLength: 300 },
    delivery_score: { type: 'integer', minimum: 6, maximum: 30 },
    strengths: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', minLength: 100 } },
    development_priorities: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', minLength: 140 } },
    biggest_opportunity: { type: 'object', additionalProperties: false, required: ['title', 'observation', 'why_it_matters', 'coaching_cue'], properties: { title: { type: 'string', minLength: 12 }, observation: { type: 'string', minLength: 100 }, why_it_matters: { type: 'string', minLength: 100 }, coaching_cue: { type: 'string', minLength: 60 } } },
    categories: {
      type: 'array', minItems: 6, maxItems: 6,
      items: {
        type: 'object', additionalProperties: false,
        required: ['category', 'score', 'strength', 'development', 'evidence', 'confidence', 'likely_cause', 'physical_hypothesis'],
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          score: { type: 'integer', minimum: 1, maximum: 5 },
          strength: { type: 'string', minLength: 100 },
          development: { type: 'string', minLength: 180 },
          evidence: { type: 'string', minLength: 100 },
          confidence: { type: 'string', enum: ['High', 'Moderate', 'Limited'] },
          // Coarse tag retained only so the existing program mapping keeps
          // working. The real reasoning lives in physical_hypothesis, which
          // is not restricted to a fixed list.
          likely_cause: { type: 'string', enum: LIKELY_CAUSES },
          physical_hypothesis: {
            type: 'object', additionalProperties: false,
            required: ['limitation', 'mechanism', 'competing_explanations', 'evidence_basis', 'confirming_screen', 'confidence'],
            properties: {
              // Free text on purpose. Athletes vary far too much to force
              // every physical explanation into a fixed enum.
              limitation: { type: 'string', minLength: 25 },
              mechanism: { type: 'string', minLength: 120 },
              // Forces differential thinking instead of committing to the
              // first plausible story. This is the main guard against
              // confident-sounding nonsense.
              competing_explanations: {
                type: 'array', minItems: 1, maxItems: 3,
                items: {
                  type: 'object', additionalProperties: false,
                  required: ['explanation', 'why_less_likely'],
                  properties: {
                    explanation: { type: 'string', minLength: 20 },
                    why_less_likely: { type: 'string', minLength: 40 },
                  },
                },
              },
              // Declares out loud whether this rests on a real measurement or
              // is still an inference from video.
              evidence_basis: { type: 'string', enum: ['measured_screen', 'video_inference'] },
              confirming_screen: { type: 'string', minLength: 10 },
              confidence: { type: 'string', enum: ['High', 'Moderate', 'Limited'] },
            },
          },
        },
      },
    },
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
      .select('id,user_id,mechanics_metrics,clip_summary,category_scores,phase_snapshots,capture_fps,athlete_profiles(date_of_birth,height_feet,height_inches,weight_lbs,throwing_hand,playing_level,current_avg_velocity,current_max_velocity,goal_velocity,main_goal,mechanical_concern,throwing_program,strength_program,upcoming_deadline,bullpen_intensity,pitches_per_week)')
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

    const analysisUserId = analysis.user_id as string
    // Intake data (age, height, weight, level, velocity) turned into computed
    // values plus explicit guidance on how each should change a reading --
    // rather than a raw JSON blob the model has to interpret unaided.
    const athleteContext = buildAthleteContext(athlete as AthleteProfileInput | null)

    // Movement screens are measured physical capacity, captured separately
    // from the pitch. When present they replace guesswork about WHY a
    // mechanics fault is happening; when absent the model must say the
    // physical explanation is still an inference from video.
    const { data: screenSession } = await admin.from('movement_screen_sessions')
      .select('id,results,summary,completed_at')
      .eq('user_id', analysisUserId)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const screenResults = Array.isArray(screenSession?.results) ? screenSession.results as ScreenResult[] : []
    const screenSummary = screenResults.length ? summarizeScreenSession(screenResults) : null
    const screensUsable = Boolean(screenSummary && !screenSummary.insufficient)
    const screenBlock = screensUsable && screenSummary
      ? `MEASURED MOVEMENT SCREENS (captured ${screenSession?.completed_at ?? 'recently'}). These are measured numbers, not guesses. Ground every physical explanation in them and set evidence_basis to "measured_screen" when you do:
${screenSummary.findings.map((finding) => `- [${finding.kind}, ${finding.reliability.toLowerCase()} reliability] ${finding.detail}`).join('\n') || '- Every screen measured inside the expected range with no notable side-to-side difference.'}`
      : `NO USABLE MOVEMENT SCREENS ON FILE. You have not measured this athlete's physical capacity. Every physical explanation is therefore an inference from video only: set evidence_basis to "video_inference", keep confidence at "Limited" or "Moderate", and name the screen that would settle it in confirming_screen. Do not state a physical limitation as established fact.`

    // Cross-reference the two independent measurements against each other
    // BEFORE any advice is written. Each prediction below was fixed in code
    // ahead of time, with its refuting condition defined, so a disagreement is
    // genuinely possible rather than manufactured.
    const clip = (analysis.clip_summary ?? {}) as Record<string, number | null | undefined>
    const deliveryMetrics: DeliveryMetrics = {
      kneeChangeAfterStride: clip.leadKneeChangeAfterStride ?? null,
      trunkTiltChange: Array.isArray(clip.trunkTiltRange)
        ? (clip.trunkTiltRange as unknown as number[])[1] - (clip.trunkTiltRange as unknown as number[])[0]
        : null,
      elbowChange: Array.isArray(clip.elbowRange)
        ? (clip.elbowRange as unknown as number[])[1] - (clip.elbowRange as unknown as number[])[0]
        : null,
      peakSeparation: clip.peakSeparation ?? null,
      peakSeparationTime: clip.peakSeparationTime ?? null,
      strideTime: clip.widestStrideTime ?? null,
    }
    const priorCategories = Array.isArray(analysis.category_scores)
      ? (analysis.category_scores as Array<{ category?: string; score?: number }>)
          .filter((item): item is { category: string; score: number } =>
            typeof item?.category === 'string' && typeof item?.score === 'number')
          .map((item) => ({ category: item.category, score: item.score }))
      : []
    const convergence = screensUsable
      ? buildConvergenceReport(screenResults, deliveryMetrics, priorCategories)
      : { checks: [], unexplained: [], insufficient: true }

    const convergenceBlock = convergence.insufficient
      ? ''
      : `
CROSS-CHECK BETWEEN THE SCREENS AND THIS DELIVERY. Each prediction was fixed before the delivery was examined, so these outcomes are real results and not confirmation. Use them to rank what to work on:
${convergence.checks.map((check) => `- ${check.screen_name} — predicted: ${check.prediction} RESULT: ${check.outcome.replace('_', ' ').toUpperCase()}. ${check.observed} ${check.implication}`).join('\n') || '- No measured limitation produced a prediction to test in this delivery.'}
${convergence.unexplained.map((fault) => `- ${fault.observed} ${fault.implication}`).join('\n')}

How to use this cross-check:
- A CONFIRMED result is your strongest available evidence: the screen and the delivery agree independently. Lead with it, and set evidence_basis to "measured_screen".
- A NOT SHOWING result means the limitation is real but this delivery is not currently paying for it. Say so plainly and give it lower training priority. Do not describe it as ruled out — compensations vary from pitch to pitch.
- An UNEXPLAINED fault has no measured physical limitation behind it, so treat it as a timing or skill pattern and prescribe drill and cue work rather than more mobility or lifting for it.
- Do not claim agreement the cross-check did not find. If a result came back NOT SHOWING or INCONCLUSIVE, your write-up must reflect that rather than asserting the limitation is causing the fault.`
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

${screenBlock}
${convergenceBlock}

Before you write any advice, read the delivery evidence and the movement-screen evidence against each other. The screens tell you what this athlete's body can do; the delivery tells you what it actually did. Neither alone is enough: a limitation that never shows up in the throw is not this month's priority, and a fault with no physical limitation behind it will not be fixed by mobility work.

For every category, reason out the physical explanation in physical_hypothesis. Do not pick from a menu — describe the actual limitation you believe is driving what you see, in your own plain words, however specific or compound it is. Athletes differ enormously in build, training age, and movement history, and forcing every explanation into a small fixed set produces generic, wrong advice.

Rules for physical_hypothesis:
- limitation: name the movement-capacity limitation in plain language (for example, "the lead hip does not rotate inward far enough to let the pelvis clear the front leg"). Describe capacity and control only. Never name a diagnosis, injury, or anatomical pathology — no labrum, no UCL, no impingement, no tears, no inflammation. If you find yourself naming a body-part injury, you have gone too far; describe the movement limitation instead.
- mechanism: explain why that limitation would produce this specific fault at this specific phase. If you cannot construct that chain, your hypothesis is probably wrong — pick a different one.
- competing_explanations: name at least one other credible explanation for the same visible fault, and say why you consider it less likely here. This is required. A fault almost always has more than one possible cause, and the second-best explanation is often the right one.
- evidence_basis: "measured_screen" only if a measured movement screen above actually supports it. If you are reasoning from the pitch video alone, it is "video_inference" — say so honestly. A single camera watching a fast rotational movement cannot establish a physical limitation on its own.
- confirming_screen: name the specific screen or test that would confirm or rule this out at the next check.
- confidence: be conservative. "High" requires a supporting measurement, not a convincing story.

Also set likely_cause to the closest coarse tag from this list purely for program routing: hamstring_tightness_or_weakness, hip_mobility_limitation, ankle_stability_limitation, core_pelvis_control, thoracic_mobility_limitation, scapular_control_limitation, general_repeatability. This tag is a rough bucket, not your actual reasoning — use general_repeatability when none of them fit what you described.

Reflect that same reasoning in the category's development field using this shape, in your own words and specific to what you observed:
1. Name the visible pattern and when in the delivery it happens (for example, a lead leg that keeps traveling forward instead of blocking at foot strike).
2. Name the plausible physical reason in plain language (for example, tightness or a strength gap in the hamstrings, or limited hip mobility) — match this to the likely_cause you selected.
3. Say what the plan does about it this week (for example, focusing on hip-hinge strength work and hamstring mobility) so the athlete understands why their specific plan looks the way it does.
${athleteContext.promptBlock}

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
    if (error) throw new Error(`Could not save the AI draft: ${error.message}`)

    // Rebuild the throwing plan from the final AI-assisted weaknesses for every
    // athlete. Performance members also receive the correlated strength plan.
    const { data: plan, error: planLoadError } = await admin.from('training_plans')
      .select('id,starts_on,strength_mobility_weeks')
      .eq('motion_analysis_id', analysisId)
      .maybeSingle()
    if (planLoadError) throw new Error(`Could not load the training plan: ${planLoadError.message}`)
    const { data: drillCatalog, error: drillsError } = await admin.from('drills')
      .select('name,category,description,coaching_cues,sets,reps')
      .eq('is_active', true)
    if (drillsError) throw new Error(`Could not load the drill library: ${drillsError.message}`)
    const currentPerformanceWeeks = Array.isArray(plan?.strength_mobility_weeks) ? plan.strength_mobility_weeks : []
    if (plan) {
      const planStart = plan.starts_on ? new Date(`${plan.starts_on}T12:00:00Z`) : new Date()
      const finalReview = new Date(planStart)
      finalReview.setUTCDate(finalReview.getUTCDate() + 56)
      const planUpdate: Record<string, unknown> = {
        duration_weeks: 8,
        title: '8-Week Pitching Development Plan',
        weeks: buildEightWeekThrowingPlan(draft.categories as CategoryAssessment[], draft.development_priorities, drillCatalog ?? []),
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
      if (planUpdateError) throw new Error(`Could not update the training plan: ${planUpdateError.message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not generate AI mechanics draft.' }, { status: 500 })
  }
}

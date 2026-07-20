import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { buildBaseballPerformancePlan, type CategoryAssessment } from '@/lib/performance-plan'

export const runtime = 'nodejs'
export const maxDuration = 300

const CATEGORIES = ['Direction', 'Lower-Half Sequencing', 'Upper-Half Timing', 'Front-Side Stability', 'Posture', 'Release Consistency']

const schema = {
  type: 'object', additionalProperties: false,
  required: ['overall_assessment', 'delivery_score', 'strengths', 'development_priorities', 'categories', 'phase_notes', 'biggest_opportunity'],
  properties: {
    overall_assessment: { type: 'string' },
    delivery_score: { type: 'integer', minimum: 6, maximum: 30 },
    strengths: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    development_priorities: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    biggest_opportunity: { type: 'object', additionalProperties: false, required: ['title', 'observation', 'why_it_matters', 'coaching_cue'], properties: { title: { type: 'string' }, observation: { type: 'string' }, why_it_matters: { type: 'string' }, coaching_cue: { type: 'string' } } },
    categories: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['category', 'score', 'strength', 'development', 'evidence', 'confidence'], properties: { category: { type: 'string', enum: CATEGORIES }, score: { type: 'integer', minimum: 1, maximum: 5 }, strength: { type: 'string' }, development: { type: 'string' }, evidence: { type: 'string' }, confidence: { type: 'string', enum: ['High', 'Moderate', 'Limited'] } } } },
    phase_notes: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['key', 'strength', 'opportunity', 'coaching_cue', 'confidence_note'], properties: { key: { type: 'string', enum: ['peak_leg_lift', 'hand_separation', 'lead_foot_contact', 'maximum_external_rotation', 'ball_release', 'finish'] }, strength: { type: 'string' }, opportunity: { type: 'string' }, coaching_cue: { type: 'string' }, confidence_note: { type: 'string' } } } },
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
      .select('id,mechanics_metrics,clip_summary,category_scores,phase_snapshots,capture_fps,athlete_profiles(date_of_birth,height_feet,height_inches,weight_lbs,throwing_hand,playing_level,current_avg_velocity,current_max_velocity,goal_velocity,main_goal,mechanical_concern)')
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
    const prompt = `Prepare a conservative baseball pitching-coach draft for mandatory human review. Analyze only visible evidence in these side-view phase candidates and supplied 2D pose data. Do not diagnose injury, calculate injury risk, claim laboratory biomechanics, infer exact internal joint rotation, or promise velocity gains. Lower confidence for obscured phases. Maximum external rotation and ball release are only candidates. Scores are internal coaching scores, not medical scores. Be specific and evidence-based; avoid generic filler. Every development priority must name an observable weakness and the phase/evidence supporting it, because verified category weaknesses will be mapped directly to baseball strength and mobility work. Do not prescribe a lift as a guaranteed mechanics correction.
Athlete: ${JSON.stringify(athlete ?? {})}
Capture FPS: ${analysis.capture_fps ?? 'unknown'}
Clip summary: ${JSON.stringify(analysis.clip_summary ?? {})}
2D pose metrics: ${JSON.stringify(analysis.mechanics_metrics ?? {})}
Deterministic candidates (supporting data only): ${JSON.stringify(analysis.category_scores ?? [])}`
    const model = process.env.OPENAI_MECHANICS_MODEL || 'gpt-5.4-mini'
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model, reasoning: { effort: 'medium' }, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, ...images] }], text: { format: { type: 'json_schema', name: 'pitch_nav_mechanics_draft', strict: true, schema } } }) })
    const payload = await response.json() as Record<string, unknown>
    if (!response.ok) return NextResponse.json({ error: (payload.error as { message?: string } | undefined)?.message || 'OpenAI could not generate the draft.' }, { status: 502 })
    const output = getOutputText(payload)
    if (!output) return NextResponse.json({ error: 'The AI response did not contain a report.' }, { status: 502 })
    const draft = JSON.parse(output) as { overall_assessment: string; delivery_score: number; strengths: string[]; development_priorities: string[]; biggest_opportunity: Record<string, string>; categories: unknown[]; phase_notes: Array<Record<string, string>> }
    const notes = new Map(draft.phase_notes.map((phase) => [phase.key, phase]))
    const { error } = await admin.from('motion_analyses').update({ delivery_score: draft.delivery_score, strengths: draft.strengths, development_priorities: draft.development_priorities, coach_feedback: draft.overall_assessment, category_scores: draft.categories, phase_snapshots: snapshots.map((shot) => ({ ...shot, ...(notes.get(shot.key) ?? {}) })), biggest_opportunity: draft.biggest_opportunity, ai_draft_status: 'ready_for_staff_review', ai_generated_at: new Date().toISOString(), ai_model: model }).eq('id', analysisId)
    if (error) throw error

    // Performance members already have a non-empty strength/mobility plan.
    // Rebuild it from the final AI-assisted category weaknesses so the plan
    // correlates to the assessment the staff member is about to verify.
    const { data: plan, error: planLoadError } = await admin.from('training_plans')
      .select('id,strength_mobility_weeks')
      .eq('motion_analysis_id', analysisId)
      .maybeSingle()
    if (planLoadError) throw planLoadError
    const currentPerformanceWeeks = Array.isArray(plan?.strength_mobility_weeks) ? plan.strength_mobility_weeks : []
    if (plan && currentPerformanceWeeks.length > 0) {
      const correlatedPlan = buildBaseballPerformancePlan(
        draft.categories as CategoryAssessment[],
        draft.development_priorities
      )
      const { error: planUpdateError } = await admin.from('training_plans')
        .update({ strength_mobility_weeks: correlatedPlan })
        .eq('id', plan.id)
      if (planUpdateError) throw planUpdateError
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not generate AI mechanics draft.' }, { status: 500 })
  }
}

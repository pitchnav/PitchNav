import { missingLandingFinding } from '@/lib/foot-strike-review'
import { POST } from './route'
import { scheduleAssessmentFollowup } from '@/lib/assessment-followup-jobs'
import { createAdminClient, createClient } from '@/lib/supabase/server'

jest.mock('@/lib/assessment-followup-jobs', () => ({ scheduleAssessmentFollowup: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))

async function applyPlan(categories: unknown[], cue: string | null, planKind: string, previousStrength: unknown[] = [], legacy = false) {
  const rpc = jest.fn().mockResolvedValue({ data: 'report', error: null })
  const fixture: Record<string, unknown> = {
    profiles: { is_admin: true },
    motion_analyses: { id: 'analysis', order_id: 'order', user_id: 'athlete', updated_at: 'revision',
      ai_draft_status: 'ready_for_staff_review', category_scores: categories,
      phase_snapshots: [{ key: 'ball_release', storage_path: 'athlete/motion-lab/analysis/phases/ball_release.png' }],
      biggest_opportunity: legacy ? { observation: 'The reviewed trunk position stays centered.' } : { findings: [{ flag_id: null, topic: 'Front leg', verdict: 'observed',
        answer: 'Knee extension is visible.', evidence_keys: ['ball_release'], evidence: 'Adjacent frames show extension.', coaching_action: cue }, missingLandingFinding()] },
    },
    training_plans: { id: 'plan', starts_on: '2026-11-12', strength_mobility_weeks: previousStrength },
    orders: { amount_paid_cents: planKind === 'complete' ? 5000 : 2500 },
    drills: [],
  }
  function from(table: string) {
    const result = { data: fixture[table], error: null }
    const query = { ...result, select: () => query, eq: () => query, single: () => result, maybeSingle: () => result }
    return query
  }
  ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'staff' } } }) }, from })
  ;(createAdminClient as jest.Mock).mockReturnValue({ from, rpc })
  const result = await POST(new Request('http://localhost/api/admin/apply-ai-draft', { method: 'POST',
    body: JSON.stringify({ analysisId: 'analysis', orderId: 'order' }) }))
  expect(result.status).toBe(200)
  expect(scheduleAssessmentFollowup).toHaveBeenCalledWith('analysis')
  return rpc.mock.calls[0][1]
}

test('a reviewed sequence without a corrective cue clears any preliminary throwing or strength prescription', async () => {
  const { report_data, plan_data, score_rows } = await applyPlan([], null, 'complete', [{ week: 1 }])
  expect(report_data.delivery_score).toBeNull()
  expect(score_rows).toEqual([])
  expect(plan_data.weeks).toEqual([])
  expect(plan_data.strength_mobility_weeks).toEqual([])
})

test.each([['complete', true], ['throwing', false]])('a verified routed change respects the purchased %s plan even with empty new draft weeks', async (tier, strength) => {
  const cue = 'Use the adjustment approved in the landing review.'
  const { plan_data } = await applyPlan([{ category: 'Front-Side Stability', score: 2, confidence: 'High', development: cue }], cue, tier as string)
  expect(plan_data.weeks).toHaveLength(8)
  expect((plan_data.strength_mobility_weeks?.length ?? 0) > 0).toBe(strength)
})


test('a verified legacy assessment keeps its approved text and existing plan without inventing phase findings', async () => {
  const { report_data, plan_data } = await applyPlan([], null, 'throwing', [], true)
  expect(report_data.main_focus).toBe('The reviewed trunk position stays centered.')
  expect(report_data.mechanics_findings).toBeNull()
  expect(plan_data).toBeNull()
})

import { POST } from './route'
import { missingLandingFinding } from '@/lib/foot-strike-review'
import { createAdminClient, createClient } from '@/lib/supabase/server'

jest.mock('@/lib/assessment-followup-jobs', () => ({ scheduleAssessmentFollowup: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))
jest.mock('@/lib/resend', () => ({ sendMotionAnalysisReadyEmail: jest.fn() }))

test.each(['motion_analyses', 'analysis_reports'])('first publication refuses a missing hand-up L on the %s record', async missing => {
  const checkpoint = [missingLandingFinding()]
  const records: Record<string, unknown> = {
    profiles: { is_admin: true },
    motion_analyses: { id: 'analysis', order_id: 'order', user_id: 'athlete', status: 'coach_review',
      ai_draft_status: 'staff_verified', coach_feedback: 'Reviewed.', phase_snapshots: [],
      biggest_opportunity: { findings: missing === 'motion_analyses' ? [] : checkpoint } },
    analysis_reports: { id: 'report', published_at: null, mechanics_findings: missing === 'analysis_reports' ? [] : checkpoint },
  }
  const update = jest.fn()
  const from = (table: string) => {
    const query = { select: () => query, eq: () => query, single: async () => ({data: records[table]}), update }
    return query
  }
  ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser: async () => ({data: {user:{id:'staff'}}}) }, from })
  ;(createAdminClient as jest.Mock).mockReturnValue({from})
  const result = await POST(new Request('http://localhost/api/admin/publish-report', {
    method: 'POST', body: JSON.stringify({analysisId:'analysis', orderId:'order'}),
  }))
  expect(result.status).toBe(409)
  expect((await result.json()).error).toContain('hand-up L')
  expect(update).not.toHaveBeenCalled()
})

import { renderToStaticMarkup } from 'react-dom/server'
import ReportPage from '@/app/dashboard/reports/[id]/page'
import FeedbackPage from '@/app/dashboard/feedback/[id]/page'
import { createClient } from '@/lib/supabase/server'
import { emptyFootStrike } from '@/lib/foot-strike-review'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))

const visible = 'Your hand rises after your front foot lands.'
const unknown = 'The far shoulder is hidden.'
const mixed = visible + ' ' + unknown
const landing = { ...emptyFootStrike, contact_status: 'bracketed', hand_up_l: 'absent', arm_timing: 'issue_visible',
  arm_observation: visible, torso_observation: 'Torso-only staff note.' }
const params = Promise.resolve({ id: 'sample' })

test('both published athlete pages show the confirmed arm finding and keep staff-only phase notes out', async () => {
  const report = { id: 'report', published_at: '2026-11-14', main_focus: mixed, three_priorities: [visible], mechanics_findings: [{ foot_strike: landing }] }
  const rows: Record<string, unknown> = {
    orders: { status: 'complete', athlete_profiles: {}, analysis_reports: report },
    motion_analyses: { id: 'analysis', status: 'published', published_at: report.published_at, coach_feedback: mixed,
      phase_snapshots: [{ key: 'lead_foot_contact', label: 'Landing', time: 1, answer: 'Torso-only staff note.', storage_path: 'landing.png' }],
      biggest_opportunity: { findings: report.mechanics_findings } },
    position_screenshots: [{ id: 'position', position: 'lead_foot_contact', reviewer_notes: 'Torso-only staff note.', quality_note: 'Internal detector note.' }],
  }
  function from(table: string) {
    const result = { data: rows[table] ?? [] }
    const chain = { ...result, select: () => chain, eq: () => chain, not: () => chain, single: async () => result, order: async () => result }
    return chain
  }
  ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'athlete' } } }) }, from,
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://example.invalid/phase.png' } }) }) } })
  for (const page of [ReportPage, FeedbackPage]) {
    const html = renderToStaticMarkup(await page({ params }))
    expect(html).toContain(visible)
    expect(html).not.toMatch(/Torso-only|far shoulder|Internal detector|coach did not add/)
  }
})

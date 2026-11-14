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

test.each([
  ['Lead with your elbow.', false],
  ['Trace a figure eight with the ball, then flow into a rocker throw.', true],
  ['Place a towel on the landing mark and stride to it at your normal tempo.', true],
])('both athlete pages distinguish a practice task from a reminder in a legacy cue field: %s', async (legacyText, keepLegacy) => {
  const practice = 'Use the Split Stance rehearsal. Pause on landing, then finish the delivery at normal rhythm.'
  const signed = 'Janitor Throws. Start across your stride line, step out, and throw toward the target.'
  const slogan = 'Get your arm up earlier.'
  const report = { id: 'report', published_at: '2026-11-14', main_focus: mixed, three_priorities: [visible],
    mechanics_findings: [{ foot_strike: landing, verdict:'observed', topic:'Arm at landing', answer:visible, coaching_action:practice },
      {verdict:'observed',topic:'Torso',coaching_action:signed}, {verdict:'observed',topic:'Reminder',coaching_action:slogan}] }
  const rows: Record<string, unknown> = {
    orders: { status: 'complete', athlete_profiles: {}, analysis_reports: report },
    motion_analyses: { id: 'analysis', status: 'published', published_at: report.published_at, coach_feedback: mixed,
      phase_snapshots: [{ key: 'lead_foot_contact', label: 'Landing', time: 1, coaching_cue:legacyText, answer: 'Torso-only staff note.', storage_path: 'landing.png' }],
      category_scores:[{category:'Upper-Half Timing',score:2}], training_plans:[{weeks:[{week:1,prescription:'2 sets of 4 prescribed reps',coaching_cue:slogan,days:[{day:'Saturday',focus:'Skill work',work:'Complete your usual warmup.'}]}]}],
      biggest_opportunity: { findings: report.mechanics_findings } },
    position_screenshots: [{ id: 'position', position: 'lead_foot_contact', coaching_cue:legacyText, reviewer_notes: 'Torso-only staff note.', quality_note: 'Internal detector note.' }],
    assigned_drills: [{ id:'assigned', drill: { name:'Rocker Drill', category:'arm_timing', sets:2, reps:'4 prescribed reps', description:'Rock forward from a split stance and throw to the target.',
      coaching_cues:[slogan, 'Start from a staggered stance.'], common_mistakes:[], contraindications:'Stop for shoulder pain.'} }],
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
    expect(html).toContain(practice)
    expect(html).toContain(signed)
    expect(html.includes(legacyText as string)).toBe(keepLegacy)
    expect(html).not.toContain(slogan)
    expect(html).not.toMatch(/Coaching Cues?|Use this cue|Primary coaching cue|cue to use next/i)
    expect(html).toContain('4 prescribed reps')
    if (page === ReportPage) {
      expect(html).toContain('Start from a staggered stance.')
      expect(html).toContain('Stop for shoulder pain.')
    }
    expect(html).not.toContain('Connection Throws')
    expect(html).not.toMatch(/Torso-only|far shoulder|Internal detector|coach did not add/)
  }
})

import { POST } from './route'
import { createAdminClient, createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))
const uid = 'fake-athlete-id'
const aid = 'fake-analysis-id'
const single = (data: unknown) => ({ select: () => ({ eq: () => ({ single: async () => ({ data, error: null }) }) }) })
const sign = jest.fn()
const send = jest.fn()
const savedKey = process.env.OPENAI_API_KEY
const savedFetch = global.fetch
beforeEach(() => {
  process.env.OPENAI_API_KEY = 'offline-test-only'
  global.fetch = send
  sign.mockReset()
  send.mockReset()
  ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'staff' } } }) }, from: () => single({ is_admin: true }) })
})
afterAll(() => { global.fetch = savedFetch; if (savedKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = savedKey })
const adult = { date_of_birth: '1990-01-01', terms_agreed: true, privacy_agreed: true }
test.each([
  [false, 2, uid, 'correct', 403],
  [true, 0, uid, 'correct', 403],
  [true, 2, uid, 'minor-without-guardian', 403],
  [true, 2, 'different-athlete', 'correct', 403],
  [true, 2, uid, 'wrong-owner', 409],
])('permission and ownership must match before signing frames or contacting OpenAI', async (consent, version, profileUser, path, expected) => {
  const storagePath = path === 'correct' ? uid + '/motion-lab/' + aid + '/phases/finish.png' : 'unrelated-frame.png'
  const analysis = { id: aid, user_id: uid, athlete_profiles: { ...adult, date_of_birth: path === 'minor-without-guardian' ? '2011-01-01' : adult.date_of_birth, consent_ai_draft: consent, ai_draft_permission_version: version, user_id: profileUser }, phase_snapshots: [{ key: 'finish', storage_path: storagePath }] }
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: () => single(analysis), storage: { from: () => ({ createSignedUrl: sign }) } })
  const result = await POST(new Request('http://localhost/api/admin/ai-mechanics', { method: 'POST', body: JSON.stringify({ analysisId: aid }) }))
  expect(result.status).toBe(expected)
  expect(sign).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})

test('staff draft uses six authorized frames and measured screens without diagnosing a block from unsigned knee range', async () => {
  const keys = ['peak_leg_lift','hand_separation','lead_foot_contact','maximum_external_rotation','ball_release','finish']
  const snapshots = keys.map(key => ({ key, storage_path: uid + '/motion-lab/' + aid + '/phases/' + key + '.png' }))
  const analysis = {
    id: aid, user_id: uid, athlete_profiles: { ...adult, id: 'profile-id', user_id: uid, consent_ai_draft: true, ai_draft_permission_version: 2 }, phase_snapshots: snapshots,
    clip_summary: { mechanics_timeline: { version: 1 }, widestStrideTime: 2, leadKneeChangeAfterStride: 48 },
  }
  const screenResults = [
    { screen_id: 'ankle_dorsiflexion', side: 'left', value: 18 },
    { screen_id: 'ankle_dorsiflexion', side: 'right', value: 19 },
    { screen_id: 'overhead_reach', side: 'left', value: 172 },
    { screen_id: 'overhead_reach', side: 'right', value: 171 },
  ]
  sign.mockImplementation(async (path: string) => ({ data: { signedUrl: 'https://offline.invalid/' + path } }))
  const screens = { eq: jest.fn(), order: jest.fn(), limit: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: { results: screenResults } }) }
  screens.eq.mockReturnValue(screens)
  screens.order.mockReturnValue(screens)
  screens.limit.mockReturnValue(screens)
  ;(createAdminClient as jest.Mock).mockReturnValue({
    from: (table: string) => table === 'motion_analyses' ? single(analysis) : { select: () => screens },
    storage: { from: () => ({ createSignedUrl: sign }) },
  })
  // Stop after the request boundary. No external service or draft persistence is needed for this test.
  send.mockResolvedValue({ ok: false, json: async () => ({}) })
  const result = await POST(new Request('http://localhost/api/admin/ai-mechanics', { method: 'POST', body: JSON.stringify({ analysisId: aid }) }))
  expect(result.status).toBe(502)
  expect(screens.eq).toHaveBeenCalledWith('athlete_profile_id', 'profile-id')
  expect(sign).toHaveBeenCalledTimes(6)
  expect(send).toHaveBeenCalledTimes(1)
  const body = JSON.parse(send.mock.calls[0][1].body)
  expect(body.store).toBe(false)
  expect(body.instructions).toMatch(/distinct corrections/i)
  expect(body.instructions).toMatch(/specific practice task/i)
  expect(body.text.format.schema.properties.findings.items.properties.drill_name).toBeDefined()
  expect(body.instructions).toMatch(/release direction/i)
  expect(body.instructions).toMatch(/staff evidence/i)
  const prompt = body.input[0].content[0].text
  expect(prompt).toContain('ankle_dorsiflexion')
  expect(prompt).toContain('18°')
  expect(prompt).not.toContain('unstable-landing pattern')
  expect(prompt).not.toContain('48° after landing')
  expect(body.input[0].content.filter((item: { type: string }) => item.type === 'input_image')).toHaveLength(6)
})

test.each(['visibility', 'exact drill', 'another drill', 'no drill', 'unknown drill'])('staff persistence follows the reviewed library evidence: %s', async mode => {
  const keys = ['peak_leg_lift', 'hand_separation', 'lead_foot_contact', 'maximum_external_rotation', 'ball_release', 'finish']
  const snapshots = keys.map(key => ({ key, storage_path: uid + '/motion-lab/' + aid + '/phases/' + key + '.png', sample_times: [1.1, 1.2, 1.3] }))
  const analysis = { id: aid, user_id: uid, updated_at: '2026-11-12T12:00:00Z', athlete_profiles: { ...adult, id: 'profile-id', user_id: uid, consent_ai_draft: true, ai_draft_permission_version: 2 }, phase_snapshots: snapshots, clip_summary: { elbowRange: [1, 172], legacy_angle_marker: 'unsupported_angle', delivery_overview: { storage_path: uid + '/motion-lab/' + aid + '/phases/delivery_overview.png', sample_times: [0, 1, 2] } } }
  sign.mockImplementation(async () => ({ data: { signedUrl: 'https://offline.invalid/phase' } }))
  const screens = { eq: jest.fn(), order: jest.fn(), limit: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) }
  for (const fn of [screens.eq, screens.order, screens.limit]) fn.mockReturnValue(screens)
  const cas = { eq: jest.fn(), is: jest.fn(), neq: jest.fn(), select: jest.fn(), maybeSingle: async () => ({ data: { id: aid }, error: null }) }
  for (const fn of [cas.eq, cas.is, cas.neq, cas.select]) fn.mockReturnValue(cas)
  const save = jest.fn(() => cas)
  const analysisTable = { ...single(analysis), update: save }
  ;(createAdminClient as jest.Mock).mockReturnValue({
    from: (table: string) => table === 'motion_analyses' ? analysisTable : table === 'drills'
      ? { select: () => ({ eq: async () => ({data:[
        {name:'Figure 8 Rhythm Rocker',description:'Use a loose figure eight into a rocker throw.'},
        {name:'Pivot Throw',description:'Throw from a narrow pivot stance.'},
      ]}) }) }
      : { select: () => screens },
    storage: { from: () => ({ createSignedUrl: sign }) },
  })
  const limit = { flag_id: 154, topic: 'Glove-side lean', verdict: 'unable_to_assess', answer: 'This side view combines forward and sideways movement.', evidence_keys: ['ball_release', 'delivery_overview'], evidence: 'Your head is ahead of your belt on the side-view release panels.', coaching_action: null }
  const footStrike = mode === 'visibility' ? { hand_up_l: 'unresolved', contact_status: 'unresolved', last_airborne_time: null, first_planted_time: null,
    arm_timing: 'unresolved', arm_observation: 'Your wrist is below the elbow in the first panel.',
    torso_opening: 'unresolved', torso_observation: 'The far shoulder is hidden at landing.',
    evidence: 'The shoe overlaps the mound in the three landing panels.', coaching_action: null } : {
    hand_up_l:'absent', contact_status:'bracketed', last_airborne_time:1.1, first_planted_time:1.2,
    arm_timing:'issue_visible', arm_observation:'The ball hand rises after the front foot lands.', torso_opening:'no_clear_issue',
    torso_observation:'The chest stays sideways into landing.', evidence:'The front shoe is airborne in the first panel and planted in the second.',
    coaching_action:'Compare the hand’s arrival as the stride foot lands.',
    drill_name: ({'unknown drill':'Fictional exercise','exact drill':'Figure 8 Rhythm Rocker','another drill':'Pivot Throw'} as Record<string,string>)[mode] ?? null,
  }
  send.mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify({
    foot_strike: footStrike,
    overall_assessment: limit.answer, strengths: [], findings: [limit],
    phase_notes: keys.map(key => ({ key, answer: 'A visible phase observation.' })), program_categories: [],
  }) }) })
  const result = await POST(new Request('http://localhost/api/admin/ai-mechanics', { method: 'POST', body: JSON.stringify({ analysisId: aid }) }))
  if (mode === 'unknown drill') {
    expect(result.status).toBe(502)
    expect(save).not.toHaveBeenCalled()
    return
  }
  expect(result.status).toBe(200)
  const body = JSON.parse(send.mock.calls[0][1].body)
  expect(body.input[0].content[0].text).toContain('270 |')
  expect(body.input[0].content[0].text).not.toContain('unsupported_angle')
  expect(body.input[0].content[1].text).toContain('1.1, 1.2, 1.3')
  expect(body.input[0].content.filter((item: { type: string }) => item.type === 'input_image')).toHaveLength(7)
  expect(body.input[0].content.at(-2).text).toContain('Whole delivery')
  expect(body.text.format.schema.properties.findings.items.properties.drill_name.enum).toEqual(['Figure 8 Rhythm Rocker', 'Pivot Throw', null])
  expect(cas.eq).toHaveBeenCalledWith('updated_at', analysis.updated_at)
  if (mode !== 'visibility') {
    const drillText: Record<string,string> = {
      'exact drill':'Figure 8 Rhythm Rocker. Use a loose figure eight into a rocker throw. ',
      'another drill':'Pivot Throw. Throw from a narrow pivot stance. ',
    }
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ biggest_opportunity: { findings: [limit, expect.objectContaining({
      coaching_action:(drillText[mode] ?? '') + footStrike.coaching_action,
      verdict:'observed',
    })] }, ai_draft_status:'ready_for_staff_review' }))
    return
  }
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ biggest_opportunity: { findings: [limit, expect.objectContaining({
    topic: 'Arm and torso at foot strike', evidence_keys: ['lead_foot_contact'], verdict: 'unable_to_assess',
    answer: footStrike.arm_observation + ' ' + footStrike.torso_observation, coaching_action: null,
  })] }, development_priorities: [], strengths: [], delivery_score: null }))
})

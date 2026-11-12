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
test.each([
  [false, uid, 'correct', 403],
  [true, 'different-athlete', 'correct', 403],
  [true, uid, 'wrong-owner', 409],
])('permission and ownership must match before signing frames or contacting OpenAI', async (consent, profileUser, path, expected) => {
  const storagePath = path === 'correct' ? uid + '/motion-lab/' + aid + '/phases/finish.png' : 'unrelated-frame.png'
  const analysis = { id: aid, user_id: uid, athlete_profiles: { consent_ai_draft: consent, user_id: profileUser }, phase_snapshots: [{ key: 'finish', storage_path: storagePath }] }
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: () => single(analysis), storage: { from: () => ({ createSignedUrl: sign }) } })
  const result = await POST(new Request('http://localhost/api/admin/ai-mechanics', { method: 'POST', body: JSON.stringify({ analysisId: aid }) }))
  expect(result.status).toBe(expected)
  expect(sign).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})

test('affirmative consent permits exactly six same-analysis frames for a staff draft', async () => {
  const keys = ['peak_leg_lift','hand_separation','lead_foot_contact','maximum_external_rotation','ball_release','finish']
  const snapshots = keys.map(key => ({ key, storage_path: uid + '/motion-lab/' + aid + '/phases/' + key + '.png' }))
  const analysis = { id: aid, user_id: uid, athlete_profiles: { id: 'profile-id', user_id: uid, consent_ai_draft: true }, phase_snapshots: snapshots }
  sign.mockImplementation(async (path: string) => ({ data: { signedUrl: 'https://offline.invalid/' + path } }))
  const screens = { eq: jest.fn(), order: jest.fn(), limit: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) }
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
  expect(body.input[0].content.filter((item: { type: string }) => item.type === 'input_image')).toHaveLength(6)
})

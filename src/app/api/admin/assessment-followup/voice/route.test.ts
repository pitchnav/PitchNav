import { PATCH } from './route'
import { createAdminClient, createClient } from '@/lib/supabase/server'

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))

const revision = '2026-11-12T23:00:00.000Z'
const voice = { note: '', examples: [{ source: 'Fictional reviewed finding.', response: 'Fictional coaching wording.' }] }
function request(approvedForReuse = true) {
  return new Request('http://localhost/api/admin/assessment-followup/voice', {
    method: 'PATCH', body: JSON.stringify({ voice, revision, approvedForReuse }),
  })
}
function mockAccess(signedIn: boolean, staff: boolean) {
  const profile = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: async () => ({ data: { is_admin: staff } }) }
  jest.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'reviewer' } : null } }) },
    from: () => profile,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}
beforeEach(() => jest.resetAllMocks())

test('requires a signed-in staff member before reading settings or using the service client', async () => {
  mockAccess(false, false)
  expect((await PATCH(request())).status).toBe(401)
  mockAccess(true, false)
  expect((await PATCH(request())).status).toBe(403)
  expect(createAdminClient).not.toHaveBeenCalled()
})
test('declines reusable examples without explicit staff approval', async () => {
  mockAccess(true, true)
  expect((await PATCH(request(false))).status).toBe(400)
  expect(createAdminClient).not.toHaveBeenCalled()
})
test('saves only against the revision staff saw and reports a conflict when another reviewer saved first', async () => {
  mockAccess(true, true)
  const q = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { updated_at: revision } }) }
  jest.mocked(createAdminClient).mockReturnValue({ from: () => q })
  expect((await PATCH(request())).status).toBe(409)
  expect(q.eq).toHaveBeenCalledWith('updated_at', revision)
  const saved = await PATCH(request())
  expect(saved.status).toBe(200)
  expect((await saved.json()).voice).toEqual(voice)
})

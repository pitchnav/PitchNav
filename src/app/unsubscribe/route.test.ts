import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { retestEmailReady, retestUnsubscribeToken } from '@/lib/retest-email-preferences'
import { createAdminClient } from '@/lib/supabase/server'
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))

const userId = '11111111-1111-4111-a111-111111111111'
const secret = process.env.RETEST_UNSUBSCRIBE_SECRET
const address = process.env.RETEST_MAILING_ADDRESS
beforeEach(() => {
  process.env.RETEST_UNSUBSCRIBE_SECRET = 'mock-only-reminder-token-secret-1234567890'
  process.env.RETEST_MAILING_ADDRESS = 'Test mailing address'
  jest.clearAllMocks()
})
afterAll(() => {
  if (secret === undefined) delete process.env.RETEST_UNSUBSCRIBE_SECRET; else process.env.RETEST_UNSUBSCRIBE_SECRET = secret
  if (address === undefined) delete process.env.RETEST_MAILING_ADDRESS; else process.env.RETEST_MAILING_ADDRESS = address
})
const post = (token: string) => POST(new NextRequest('http://localhost/unsubscribe', { method: 'POST', body: new URLSearchParams({ token }) }))
test('reminders are paused without an unsubscribe secret or sender address', () => {
  expect(retestEmailReady()).toBe(true)
  delete process.env.RETEST_MAILING_ADDRESS
  expect(retestEmailReady()).toBe(false)
  process.env.RETEST_MAILING_ADDRESS = 'Test'
  delete process.env.RETEST_UNSUBSCRIBE_SECRET
  expect(retestEmailReady()).toBe(false)
})
test('a link preview displays confirmation without mutating an account', async () => {
  const token = retestUnsubscribeToken(userId)!
  const result = await GET(new NextRequest('http://localhost/unsubscribe?token=' + token))
  expect(result.status).toBe(200)
  expect(await result.text()).toContain('method="post"')
  expect(createAdminClient).not.toHaveBeenCalled()
})
test('only the signed account can be opted out, without logging in', async () => {
  const token = retestUnsubscribeToken(userId)!
  expect((await post('2' + token.slice(1))).status).toBe(400)
  expect(createAdminClient).not.toHaveBeenCalled()
  const eq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({ eq }))
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: () => ({ update }) })
  expect((await post(token)).status).toBe(200)
  expect(update).toHaveBeenCalledWith({ retest_email_opt_in: false })
  expect(eq).toHaveBeenCalledWith('id', userId)
})

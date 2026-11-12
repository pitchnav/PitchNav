import { NextRequest } from 'next/server'
import { GET } from './route'
import { createAdminClient } from '@/lib/supabase/server'
import { sendFollowupReminderEmail } from '@/lib/resend'
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/resend', () => ({ sendFollowupReminderEmail: jest.fn() }))
const uid = '12345678-1234-4123-a123-123456789abc'
const original = { cron: process.env.CRON_SECRET, token: process.env.RETEST_UNSUBSCRIBE_SECRET, address: process.env.RETEST_MAILING_ADDRESS }
beforeEach(() => {
  process.env.CRON_SECRET = 'local'
  process.env.RETEST_UNSUBSCRIBE_SECRET = 'mock-only-reminder-token-secret-1234567890'
  process.env.RETEST_MAILING_ADDRESS = 'Test address'
  jest.clearAllMocks()
})
afterAll(() => {
  for (const [key, value] of Object.entries({ CRON_SECRET: original.cron, RETEST_UNSUBSCRIBE_SECRET: original.token, RETEST_MAILING_ADDRESS: original.address })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
const req = () => new NextRequest('http://localhost/api/cron/retest-reminders', { headers: { authorization: 'Bearer local' } })
test('the cron cannot send when the scheduler or unsubscribe configuration is absent', async () => {
  delete process.env.CRON_SECRET
  expect((await GET(req())).status).toBe(401)
  process.env.CRON_SECRET = 'local'
  delete process.env.RETEST_MAILING_ADDRESS
  expect(await (await GET(req())).json()).toEqual({ sent: 0, paused: true })
  expect(createAdminClient).not.toHaveBeenCalled()
  expect(sendFollowupReminderEmail).not.toHaveBeenCalled()
})
test('only explicitly subscribed profiles receive a reminder; a refused send is not marked sent', async () => {
  const profiles = [false, true].map(value => ({ id: 'plan', user_id: uid, profiles: { email: 'user@example.test', retest_email_opt_in: value } }))
  const query = { eq: jest.fn(), lte: jest.fn(), is: jest.fn(), limit: jest.fn().mockResolvedValue({ data: profiles }) }
  query.eq.mockReturnValue(query)
  query.lte.mockReturnValue(query)
  query.is.mockReturnValue(query)
  const update = jest.fn()
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: () => ({ select: () => query, update }) })
  ;(sendFollowupReminderEmail as jest.Mock).mockResolvedValue({ success: false })
  expect(await (await GET(req())).json()).toEqual({ sent: 0 })
  expect(query.eq).toHaveBeenCalledWith('profiles.retest_email_opt_in', true)
  expect(sendFollowupReminderEmail).toHaveBeenCalledTimes(1)
  expect(update).not.toHaveBeenCalled()
})

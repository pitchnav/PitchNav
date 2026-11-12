import { NextRequest } from 'next/server'
import { POST } from './route'
import { resend } from '@/lib/resend'
jest.mock('@/lib/resend', () => ({ isResendConfigured: true, resend: { emails: { send: jest.fn() } } }))
const send = resend.emails.send as jest.Mock
const request = (body: unknown) => new NextRequest('http://localhost/api/contact', { method: 'POST', body: JSON.stringify(body) })
const valid = { email: 'user@example.test', subject: 'privacy', message: 'Please send a copy of my account information.' }
beforeEach(() => { send.mockReset(); send.mockResolvedValue({ data: { id: 'mock' }, error: null }) })
test('a privacy request works without a name, as plain text in the staff inbox only', async () => {
  expect((await POST(request(valid))).status).toBe(200)
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0][0]).toMatchObject({ replyTo: valid.email, text: expect.stringContaining(valid.message) })
  expect(send.mock.calls[0][0]).not.toHaveProperty('html')
})
test('provider refusal never produces a receipt', async () => {
  send.mockResolvedValue({ error: { message: 'mock refusal' } })
  expect((await POST(request(valid))).status).toBe(502)
})
test.each([null, { ...valid, message: [] }, { ...valid, message: 'x'.repeat(5001) }])('invalid input never generates mail', async input => {
  expect((await POST(request(input))).status).toBe(400)
  expect(send).not.toHaveBeenCalled()
})

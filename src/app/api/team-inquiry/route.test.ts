jest.mock('server-only', () => ({}), { virtual: true })
import { NextRequest } from 'next/server'
import { POST } from './route'
import { resend } from '@/lib/resend'
jest.mock('@/lib/resend', () => ({ isResendConfigured: true, resend: { emails: { send: jest.fn() } } }))
const send = resend.emails.send as jest.Mock
const base = { name: 'Coach', organization: 'Example', role: 'Coach', email: 'coach@example.com', pitcherCount: '20', programPlan: 'complete', billing: 'monthly' }
const request = (body: unknown) => new NextRequest('http://localhost/api/team-inquiry', {method:'POST',body:JSON.stringify(body)})
beforeEach(() => { send.mockReset(); send.mockResolvedValue({ data: {id:'test'}, error:null }) })
test('server ignores a forged total and sends the approved quote', async () => {
  const response = await POST(request({...base, dueNow: 1}))
  expect(response.status).toBe(200)
  const message = send.mock.calls[0][0].html
  expect(message).toContain('$1,644.60')
  expect(message).toContain('$744.80/month from month 2')
})
test.each([{...base,programPlan:'throwing'},{...base,billing:'weekly'},{...base,pitcherCount:'2.5'},null])('invalid request cannot send an enrollment quote', async body => {
  expect((await POST(request(body))).status).toBe(400)
  expect(send).not.toHaveBeenCalled()
})
test('annual quote uses the annual total and no monthly promotion', async () => {
  expect((await POST(request({...base,billing:'annual'}))).status).toBe(200)
  expect(send.mock.calls[0][0].html).toContain('$7,703.00')
})
test('email provider error is not reported as success', async () => {
  send.mockResolvedValue({error:{message:'unavailable'}})
  expect((await POST(request(base))).status).toBe(502)
})

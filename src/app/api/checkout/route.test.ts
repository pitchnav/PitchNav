import { NextRequest } from 'next/server'
import { POST } from './route'
const mockClient = jest.fn()
const mockSession = jest.fn()
const mockAdmin = jest.fn()
const mockRetrieve = jest.fn()
const mockExpire = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: () => mockClient(), createAdminClient: () => mockAdmin() }))
jest.mock('@/lib/stripe', () => ({ createCheckoutSession: (...args: unknown[]) => mockSession(...args), stripe: { checkout: { sessions: { retrieve: (...args: unknown[]) => mockRetrieve(...args), expire: (...args: unknown[]) => mockExpire(...args) } } } }))
function request(agent: string, acceptsRecurringBilling = true) {
  return new NextRequest('https://example.test/api/checkout', { headers: { 'user-agent': agent }, method: 'POST', body: JSON.stringify({ orderId: 'order', membershipTier: 'throwing', acceptsRecurringBilling }) })
}
function mockOrder(order: object) {
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: order }) }
  mockClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, rpc: async () => ({ data: 'profile' }), from: () => query })
}
beforeEach(() => { jest.resetAllMocks() })
test.each(['PitchNavIOS/2.0', 'PitchNavAndroid/1.0', 'PitchNavMobile/1.0'])('%s is rejected before auth, Stripe or database writes', async token => {
  const response = await POST(request(`Mozilla ${token} Mobile`))
  expect(response.status).toBe(403)
  expect((await response.json()).error).toBe('Purchases are unavailable in this mobile app.')
  expect(mockClient).not.toHaveBeenCalled()
  expect(mockSession).not.toHaveBeenCalled()
})
test('ordinary iPhone Safari follows web authentication', async () => {
  mockClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
  expect((await POST(request('Mozilla iPhone Safari'))).status).toBe(401)
})
test('closed orders cannot start another subscription', async () => {
  mockOrder({ status: 'refunded' })
  expect((await POST(request('Safari'))).status).toBe(409)
  expect(mockSession).not.toHaveBeenCalled()
})
test('reuses the saved open session for the exact user, order and tier', async () => {
  mockOrder({ status: 'awaiting_payment', athlete_profile_id: 'profile', stripe_checkout_session_id: 'session' })
  mockRetrieve.mockResolvedValue({ status: 'open', url: 'https://checkout.stripe.com/example', metadata: { user_id: 'owner', order_id: 'order', membership_tier: 'throwing' } })
  const result = await POST(request('Safari'))
  expect((await result.json()).url).toBe('https://checkout.stripe.com/example')
  expect(mockSession).not.toHaveBeenCalled()
})

test('requires renewal consent and a purchase eligible for video fulfillment', async () => {
  mockOrder({ status: 'awaiting_payment', athlete_profile_id: 'different-profile' })
  expect((await POST(request('Safari', false))).status).toBe(400)
  expect((await POST(request('Safari'))).status).toBe(409)
  expect(mockSession).not.toHaveBeenCalled()
})

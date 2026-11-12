import { NextRequest } from 'next/server'
import { POST } from './route'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/stripe', () => ({
  isStripeConfigured: true,
  stripe: { subscriptions: { retrieve: jest.fn(), update: jest.fn() }, checkout: { sessions: { retrieve: jest.fn() } } },
}))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

const orderId = 'ad251e2b-dd44-45e5-90d0-b607efb90888'
const sub = { id: 'sub_fixture', current_period_end: 1800000000, livemode: false, status: 'active',
  cancel_at_period_end: false, cancel_at: null, metadata: { order_id: orderId, user_id: 'owner' } }
const order = { id: orderId, stripe_payment_intent_id: sub.id, stripe_checkout_session_id: 'cs_test_fixture' }
const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() }
const getUser = jest.fn()
const getSubscription = stripe.subscriptions.retrieve as jest.Mock
const updateSubscription = stripe.subscriptions.update as jest.Mock
const getSession = stripe.checkout.sessions.retrieve as jest.Mock
const previousEnv = process.env

function post(values = { order: orderId, periodEnd: String(sub.current_period_end), confirm: 'end-of-period' }, origin = 'https://site.test') {
  return POST(new NextRequest('https://site.test/api/billing/cancel', {
    method: 'POST', headers: { origin }, body: new URLSearchParams(values),
  }))
}
beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...previousEnv, STRIPE_SECRET_KEY: 'sk_test_fixture', VERCEL_ENV: 'preview' }
  ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser }, from: () => query })
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } } })
  query.maybeSingle.mockResolvedValue({ data: order })
  getSubscription.mockResolvedValue(sub)
  updateSubscription.mockResolvedValue({ ...sub, cancel_at_period_end: true })
})
afterEach(() => { process.env = previousEnv })

test('a confirmed linked subscription stops at period end and redirects to a new status read', async () => {
  const response = await post()
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toContain('/billing/manage?order=' + orderId + '&result=confirmed')
  expect(query.eq.mock.calls).toEqual([['user_id', 'owner'], ['id', orderId]])
  expect(updateSubscription).toHaveBeenCalledWith(sub.id, { cancel_at_period_end: true, proration_behavior: 'none' })
})
test('sessions saved on old orders can resolve subscriptions after checking both ownership records', async () => {
  query.maybeSingle.mockResolvedValue({ data: { ...order, stripe_payment_intent_id: null } })
  getSession.mockResolvedValue({ livemode: false, metadata: sub.metadata, status: 'complete', mode: 'subscription', subscription: sub })
  expect((await post()).headers.get('location')).toContain('result=confirmed')
  expect(getSubscription).not.toHaveBeenCalled()
})
test('requires a signed-in owner, a current period and an explicit same-origin confirmation', async () => {
  expect((await post(undefined, 'https://other.test')).status).toBe(403)
  expect((await post({ order: orderId, periodEnd: String(sub.current_period_end), confirm: '' })).status).toBe(400)
  expect((await post({ order: orderId, periodEnd: '1234', confirm: 'end-of-period' })).headers.get('location')).toContain('result=changed')
  getUser.mockResolvedValue({ data: { user: null } })
  expect((await post()).headers.get('location')).toContain('/login?redirectTo=')
  getUser.mockResolvedValue({ data: { user: { id: 'other' } } })
  query.maybeSingle.mockResolvedValue({ data: null })
  expect((await post()).status).toBe(404)
  expect(updateSubscription).not.toHaveBeenCalled()
})
test('wrong metadata, wrong Stripe environment or provider failure never confirms a change', async () => {
  getSubscription.mockResolvedValue({ ...sub, metadata: { ...sub.metadata, user_id: 'different' } })
  expect((await post()).headers.get('location')).toContain('result=unconfirmed')
  process.env.VERCEL_ENV = 'production'
  getSubscription.mockResolvedValue(sub)
  expect((await post()).headers.get('location')).toContain('result=unconfirmed')
  expect(updateSubscription).not.toHaveBeenCalled()
  process.env.VERCEL_ENV = 'preview'
  updateSubscription.mockRejectedValue(new Error('unavailable'))
  expect((await post()).headers.get('location')).toContain('result=unconfirmed')
})
test.each([
  { status: 'canceled' }, { cancel_at_period_end: true }, { cancel_at: sub.current_period_end - 10 },
])('does not write for an already stopped subscription: %p', async patch => {
  getSubscription.mockResolvedValue({ ...sub, ...patch })
  expect((await post()).headers.get('location')).toContain('result=confirmed')
  expect(updateSubscription).not.toHaveBeenCalled()
})

test('production outside Vercel cannot manage a test subscription', async () => {
  delete process.env.VERCEL_ENV
  process.env = { ...process.env, NODE_ENV: 'production' }
  expect((await post()).headers.get('location')).toContain('result=unconfirmed')
  expect(getSubscription).not.toHaveBeenCalled()
  expect(updateSubscription).not.toHaveBeenCalled()
})

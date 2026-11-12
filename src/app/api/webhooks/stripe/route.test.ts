import { NextRequest } from 'next/server'
import { POST } from './route'
const mockEvent = jest.fn()
const mockAdmin = jest.fn()
const mockInvoice = jest.fn()
const mockEmail = jest.fn()
jest.mock('@/lib/stripe', () => ({ constructWebhookEvent: (...args: unknown[]) => mockEvent(...args), stripe: { invoices: { retrieve: (...args: unknown[]) => mockInvoice(...args) } } }))
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: () => mockAdmin() }))
jest.mock('@/lib/resend', () => ({ sendPaymentConfirmationEmail: (...args: unknown[]) => mockEmail(...args) }))

function event(type: string, object: object) {
  mockEvent.mockReturnValue({ type, data: { object } })
  return POST(new NextRequest('https://example.test/webhook', { method: 'POST', headers: { 'stripe-signature': 'unit-fixture' }, body: '{}' }))
}
const paid = { id: 'cs_1', currency: 'usd', payment_status: 'paid', mode: 'subscription', subscription: 'sub_1',
  amount_subtotal: 2500, amount_total: 2500, metadata: { order_id: 'order', user_id: 'owner', membership_tier: 'throwing' } }

function database(results: object[]) {
  const query = {
    eq: jest.fn().mockReturnThis(), is: jest.fn().mockReturnThis(), not: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(), insert: jest.fn().mockResolvedValue({}),
    maybeSingle: jest.fn().mockImplementation(async () => ({ data: results.shift() })),
  }
  mockAdmin.mockReturnValue({ from: () => query })
  return query
}
beforeEach(() => { jest.resetAllMocks() })
test('an unpaid checkout does not change an order', async () => {
  expect((await event('checkout.session.completed', { ...paid, payment_status: 'unpaid' })).status).toBe(200)
  expect(mockAdmin).not.toHaveBeenCalled()
})
test('records confirmed payment once and awaits the actual upload', async () => {
  const query = database([{ status: 'awaiting_payment', athlete_profiles: null, stripe_checkout_session_id: 'cs_1' }, { id: 'order' }])
  expect((await event('checkout.session.completed', paid)).status).toBe(200)
  expect(query.eq).toHaveBeenCalledWith('user_id', 'owner')
  expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'awaiting_videos', amount_paid_cents: 2500 }))
  expect(query.is).toHaveBeenCalledWith('payment_confirmed_at', null)
  expect(query.insert).toHaveBeenCalledTimes(1)
})
test('partial or later renewal refunds do not revoke the initial order', async () => {
  await event('charge.refunded', { refunded: false, metadata: { order_id: 'order' } })
  await event('charge.refunded', { refunded: true, invoice: { billing_reason: 'subscription_cycle', subscription_details: { metadata: { order_id: 'order' } } } })
  expect(mockAdmin).not.toHaveBeenCalled()
})
test('full first-invoice refund uses subscription metadata even if absent on the charge', async () => {
  mockInvoice.mockResolvedValue({ billing_reason: 'subscription_create', subscription_details: { metadata: { order_id: 'order', user_id: 'owner' } } })
  const query = database([{ id: 'order' }])
  expect((await event('charge.refunded', { refunded: true, invoice: 'in_first', metadata: {} })).status).toBe(200)
  expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
  expect(query.eq).toHaveBeenCalledWith('user_id', 'owner')
})
test('late checkout completion cannot restore a refunded order', async () => {
  const query = database([{ refunded_at: '2026-11-11', status: 'refunded' }])
  await event('checkout.session.completed', paid)
  expect(query.update).not.toHaveBeenCalled()
})

const mockPrice = jest.fn()
const mockSession = jest.fn()
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({ prices: { retrieve: mockPrice }, checkout: { sessions: { create: mockSession } } })))
const baseline = { active: true, currency: 'usd', billing_scheme: 'per_unit', unit_amount: 2500, recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } }
const argumentsForOrder = { orderId: 'order', userId: 'owner', membershipTier: 'throwing' as const, previousSessionId: null, successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/checkout' }
const originalEnvironment = process.env
beforeAll(() => { process.env = { ...originalEnvironment, STRIPE_SECRET_KEY: 'sk_test_example', STRIPE_THROWING_PRICE_ID: 'price_example' } })
afterAll(() => { process.env = originalEnvironment })
beforeEach(() => { mockSession.mockClear() })
test.each([{ active: false }, { currency: 'cad' }, { unit_amount: 2499 }, { recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' } }])('rejects misconfigured Stripe price before checkout', async (change) => {
  mockPrice.mockResolvedValue({ ...baseline, ...change })
  const { createCheckoutSession } = await import('./stripe')
  await expect(createCheckoutSession(argumentsForOrder)).rejects.toThrow('does not match')
  expect(mockSession).not.toHaveBeenCalled()
})
test('creates an idempotent session at the expected price with limited metadata', async () => {
  mockPrice.mockResolvedValue(baseline)
  const { createCheckoutSession } = await import('./stripe')
  await createCheckoutSession(argumentsForOrder)
  expect(mockSession.mock.calls[0][0].metadata.athlete_name).toBeUndefined()
  expect(mockSession.mock.calls[0][0].line_items).toEqual([{ price: 'price_example', quantity: 1 }])
  expect(mockSession.mock.calls[0][1].idempotencyKey).toBe('order:order:throwing:initial')
})

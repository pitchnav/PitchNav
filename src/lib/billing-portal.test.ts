import { billingPortalLogin } from './billing-portal'
import { stripe } from './stripe'

jest.mock('./stripe', () => ({ isStripeConfigured: true, stripe: { billingPortal: { configurations: { list: jest.fn() } } } }))
const list = stripe.billingPortal.configurations.list as unknown as jest.Mock
const sandboxUrl = 'https://billing.stripe.com/p/login/test_a123'
const liveUrl = 'https://billing.stripe.com/p/login/b456'
const previous = process.env
beforeEach(() => {
  process.env = { ...previous, STRIPE_SECRET_KEY: 'sk_test_fixture', VERCEL_ENV: 'development' }
  delete process.env.STRIPE_CUSTOMER_PORTAL_URL
  list.mockReset()
})
afterEach(() => { process.env = previous })
test('a reusable login works for the matching mode', async () => {
  const working = { livemode: false, features:{subscription_cancel:{enabled:true,mode:'at_period_end'}}, login_page:{enabled:true,url:sandboxUrl} }
  list.mockResolvedValue({ data: [working] })
  process.env.STRIPE_CUSTOMER_PORTAL_URL = sandboxUrl
  await expect(billingPortalLogin()).resolves.toBe(sandboxUrl)
  process.env.STRIPE_SECRET_KEY = 'sk_live_fixture'
  process.env.VERCEL_ENV = 'production'
  process.env.STRIPE_CUSTOMER_PORTAL_URL = liveUrl
  list.mockResolvedValue({ data: [{...working,livemode:true,login_page:{enabled:true,url:liveUrl}}] })
  await expect(billingPortalLogin()).resolves.toBe(liveUrl)
})
test.each([liveUrl, 'https://billing.stripe.com/p/session/bearer', sandboxUrl + '?secret=1', 'https://example.com/p/login/test_a123'])('does not publish the wrong mode, a customer session or a non-Stripe link', async url => {
  process.env.STRIPE_CUSTOMER_PORTAL_URL = url
  await expect(billingPortalLogin()).resolves.toBe(null)
})
test('production cannot present the sandbox, even if a test key and link were configured', async () => {
  process.env.VERCEL_ENV = 'production'
  process.env.STRIPE_CUSTOMER_PORTAL_URL = sandboxUrl
  await expect(billingPortalLogin()).resolves.toBe(null)
})
test('a preview cannot present a live portal, even if someone misconfigures its key', async () => {
  process.env.VERCEL_ENV = 'preview'
  process.env.STRIPE_SECRET_KEY = 'sk_live_fixture'
  process.env.STRIPE_CUSTOMER_PORTAL_URL = liveUrl
  await expect(billingPortalLogin()).resolves.toBe(null)
})
test('discovery selects a matching portal with cancellation at period end and login enabled', async () => {
  const config = { livemode: false, features: { subscription_cancel: { enabled: true, mode: 'at_period_end' } }, login_page: { enabled: true, url: sandboxUrl } }
  list.mockResolvedValue({ data: [ { ...config, features: { subscription_cancel: { enabled: false } } }, { ...config, login_page: { enabled: false } }, { ...config, features: { subscription_cancel: { enabled: true, mode: 'immediately' } } }, config ] })
  await expect(billingPortalLogin()).resolves.toBe(sandboxUrl)
  expect(list).toHaveBeenCalledWith({ active: true, limit: 100 }, { timeout: 1800, maxNetworkRetries: 0 })
})
test('support fallback stays available when discovery fails', async () => {
  list.mockImplementation(() => { throw new Error('offline') })
  await expect(billingPortalLogin()).resolves.toBe(null)
})

test('a configured login URL still must match an active cancellation-enabled configuration',async()=>{
  process.env.STRIPE_CUSTOMER_PORTAL_URL = sandboxUrl
  list.mockResolvedValue({ data: [{livemode:false,features:{subscription_cancel:{enabled:false,mode:'at_period_end'}},login_page:{enabled:true,url:sandboxUrl}}] })
  await expect(billingPortalLogin()).resolves.toBe(null)
})

test('a production server outside Vercel cannot publish a test portal', async () => {
  delete process.env.VERCEL_ENV
  process.env = { ...process.env, NODE_ENV: 'production' }
  await expect(billingPortalLogin()).resolves.toBe(null)
  expect(list).not.toHaveBeenCalled()
})

import { renderToStaticMarkup } from 'react-dom/server'
import IndividualCheckout from './page'

let mockUserAgent = ''
jest.mock('next/headers', () => ({ headers: async () => new Headers({ 'user-agent': mockUserAgent }) }))
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('not-found') } }))

async function page(plan: string, billing: string) {
  return renderToStaticMarkup(await IndividualCheckout({ searchParams: Promise.resolve({ plan, billing }) }))
}
describe('individual checkout disclosures', () => {
  const oldEnvironment = process.env
  beforeEach(() => {
    mockUserAgent = 'Safari'
    process.env = { ...oldEnvironment, INDIVIDUAL_CHECKOUT_READY: 'true', PITCH_TRACKING_SALES_READY: 'false' }
  })
  afterEach(() => { process.env = oldEnvironment })
  test('reviews the exact annual first payment and renewal before linking to the processor', async () => {
    process.env.STRIPE_CHECKOUT_COMPLETE_ANNUAL_URL = 'https://buy.stripe.com/test_annual'
    const html = await page('complete', 'annual')
    for (const term of ['$429.98', '$49.99', '$379.99', 'until canceled', '/billing', 'https://buy.stripe.com/test_annual']) expect(html).toContain(term)
  })
  test('no monthly fallback when an annual link is missing', async () => {
    process.env.STRIPE_CHECKOUT_THROWING_MONTHLY_URL = 'https://buy.stripe.com/test_monthly'
    delete process.env.STRIPE_CHECKOUT_THROWING_ANNUAL_URL
    expect(await page('throwing', 'annual')).not.toContain('buy.stripe.com')
  })
  test('payments remain unavailable until fulfillment is enabled', async () => {
    process.env.INDIVIDUAL_CHECKOUT_READY = 'false'
    process.env.STRIPE_CHECKOUT_ASSESSMENT_URL = 'https://buy.stripe.com/test_assessment'
    const html = await page('assessment', 'one-time')
    expect(html).not.toContain('buy.stripe.com')
    expect(html).toContain('No recurring charge')
  })
  test('tracking needs its own sales gate', async () => {
    process.env.STRIPE_CHECKOUT_METRICS_MONTHLY_URL = 'https://buy.stripe.com/test_metrics'
    expect(await page('metrics', 'monthly')).not.toContain('buy.stripe.com')
    process.env.PITCH_TRACKING_SALES_READY = 'true'
    expect(await page('metrics', 'monthly')).toContain('https://buy.stripe.com/test_metrics')
  })
  test('suppresses external purchasing inside the native wrapper only', async () => {
    process.env.STRIPE_CHECKOUT_ASSESSMENT_URL = 'https://buy.stripe.com/test_assessment'
    mockUserAgent = 'Mozilla iPhone PitchNavIOS/1.0 Mobile Safari'
    const html = await page('assessment', 'one-time')
    expect(html).not.toContain('buy.stripe.com')
    expect(html).toContain('Purchases are unavailable in this mobile app')
    mockUserAgent = 'Mozilla iPhone Mobile Safari'
    expect(await page('assessment', 'one-time')).toContain('buy.stripe.com')
  })
  test('rejects an unsupported product', async () => {
    await expect(page('teams', 'monthly')).rejects.toThrow('not-found')
  })
})

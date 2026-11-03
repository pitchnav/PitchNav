import IndividualCheckout from './page'
const mockRedirect = jest.fn((url: string) => { throw new Error(`redirect:${url}`) })
jest.mock('next/navigation', () => ({ redirect: (url: string) => mockRedirect(url), notFound: () => { throw new Error('not-found') } }))

describe('hosted individual checkout', () => {
  const oldEnvironment = { ...process.env }
  beforeEach(() => { jest.clearAllMocks(); process.env = { ...oldEnvironment }; delete process.env.INDIVIDUAL_CHECKOUT_READY; delete process.env.PITCH_TRACKING_SALES_READY })
  afterAll(() => { process.env = oldEnvironment })
  test('sends the chosen annual plan directly to its configured checkout', async () => {
    process.env.INDIVIDUAL_CHECKOUT_READY = 'true'
    process.env.STRIPE_CHECKOUT_COMPLETE_ANNUAL_URL = 'https://buy.stripe.com/test_annual'
    await expect(IndividualCheckout({ searchParams: Promise.resolve({plan:'complete',billing:'annual'}) })).rejects.toThrow('redirect:https://buy.stripe.com/test_annual')
  })
  test('does not fall back to monthly checkout when annual is missing', async () => {
    process.env.INDIVIDUAL_CHECKOUT_READY = 'true'
    process.env.STRIPE_CHECKOUT_THROWING_MONTHLY_URL = 'https://buy.stripe.com/test_monthly'
    delete process.env.STRIPE_CHECKOUT_THROWING_ANNUAL_URL
    await IndividualCheckout({ searchParams: Promise.resolve({plan:'throwing',billing:'annual'}) })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
  test('leaves payments closed until fulfillment is ready', async () => {
    process.env.STRIPE_CHECKOUT_ASSESSMENT_URL = 'https://buy.stripe.com/test_assessment'
    await IndividualCheckout({ searchParams: Promise.resolve({plan:'assessment',billing:'one-time'}) })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
  test('keeps unreleased tracking out of payment even when other plans are ready', async () => {
    process.env.INDIVIDUAL_CHECKOUT_READY = 'true'
    process.env.STRIPE_CHECKOUT_METRICS_MONTHLY_URL = 'https://buy.stripe.com/test_metrics'
    await IndividualCheckout({ searchParams: Promise.resolve({plan:'metrics',billing:'monthly'}) })
    expect(mockRedirect).not.toHaveBeenCalled()
    process.env.PITCH_TRACKING_SALES_READY = 'true'
    await expect(IndividualCheckout({ searchParams: Promise.resolve({plan:'metrics',billing:'monthly'}) })).rejects.toThrow('redirect:https://buy.stripe.com/test_metrics')
  })
  test('rejects team checkout requests', async () => {
    await expect(IndividualCheckout({ searchParams: Promise.resolve({plan:'teams',billing:'monthly'}) })).rejects.toThrow('not-found')
  })
})

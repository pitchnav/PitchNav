import { checkoutPath, getCheckoutOption, configuredCheckoutUrl } from './individual-checkout'

describe('individual checkout routing', () => {
  test.each([
    ['throwing', 'monthly', 2500, 'V2_THROWING_MONTHLY'],
    ['throwing', 'annual', 23999, 'V2_THROWING_ANNUAL'],
    ['complete', 'monthly', 4500, 'V2_COMPLETE_MONTHLY'],
    ['complete', 'annual', 37999, 'V2_COMPLETE_ANNUAL'],
    ['metrics', 'monthly', 1999, 'METRICS_MONTHLY'],
    ['metrics', 'annual', 23999, 'METRICS_ANNUAL'],
    ['assessment', 'one-time', 2000, 'V2_ASSESSMENT'],
  ])('%s / %s keeps its exact checkout and initial total', (plan, billing, total, key) => {
    const option = getCheckoutOption(plan as string, billing as string)!
    expect(option.initialTotal).toBe(total)
    expect(option.environmentKey).toBe(`STRIPE_CHECKOUT_${key}_URL`)
    expect(checkoutPath(plan as 'throwing', billing as 'monthly')).toContain(`plan=${plan}`)
    expect(checkoutPath(plan as 'throwing', billing as 'monthly')).toContain(`billing=${billing}`)
  })
  test('rejects team, unknown and mismatched selections', () => {
    for (const [plan, billing] of [['team', 'monthly'], ['fake', 'annual'], ['assessment', 'annual'], ['metrics', 'one-time']]) {
      expect(getCheckoutOption(plan, billing)).toBeNull()
    }
  })
  test('missing links never fall back to old prices or contact', () => {
    expect(configuredCheckoutUrl(undefined)).toBeNull()
    expect(configuredCheckoutUrl('')).toBeNull()
  })
  test('only accepts hosted Stripe payment links', () => {
    expect(configuredCheckoutUrl('https://buy.stripe.com/test_example')).toBe('https://buy.stripe.com/test_example')
    for (const url of ['javascript:alert(1)', 'http://buy.stripe.com/test_x', 'https://buy.stripe.com.evil.com/a', 'https://evil.com', 'https://user:pass@buy.stripe.com/a']) {
      expect(configuredCheckoutUrl(url)).toBeNull()
    }
  })
})

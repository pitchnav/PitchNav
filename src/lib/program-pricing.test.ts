jest.mock('server-only', () => ({}), { virtual: true })
import { quoteProgram, INDIVIDUAL_PLANS, PROGRAM_TIERS } from './program-pricing'

describe('approved pricing in integer cents', () => {
  test('individual launch prices and assessment are separate', () => {
    expect(INDIVIDUAL_PLANS.throwing).toMatchObject({ monthly: 2500, firstMonth: 2000, annual: 22500, assessment: 0 })
    expect(INDIVIDUAL_PLANS.metrics.assessment).toBe(0)
    expect(INDIVIDUAL_PLANS.complete).toMatchObject({ monthly: 4500, firstMonth: 4000, annual: 40500, assessment: 0 })
  })
  test('every individual plan and roster tier applies the offers independently', () => {
    const rates = [
      ...Object.values(INDIVIDUAL_PLANS),
      ...PROGRAM_TIERS.flatMap(tier => [tier.metrics, tier.complete]),
    ]
    for (const rate of rates) {
      expect(rate.firstMonth).toBe(rate.monthly - 500)
      expect(rate.annual).toBe(rate.monthly * 12 * 0.75)
    }
  })
  test('20 Complete players use graduated tiers and one assessment each', () => {
    expect(quoteProgram(20, 'complete', 'monthly')).toMatchObject({ monthly: 74480, annual: 670320, assessment: 99980, dueNow: 164460, recurring: 74480, firstYear: 983740 })
  })
  test('annual excludes the first-month discount and never repeats assessment', () => {
    expect(quoteProgram(20, 'complete', 'annual')).toMatchObject({ dueNow: 770300, recurring: 670320, firstYear: 770300 })
    expect(quoteProgram(1, 'metrics', 'annual')).toMatchObject({ dueNow: 22491, assessment: 0 })
  })
  test.each([[10,2199],[25,1899],[50,1699]])('player %i receives only the marginal tier discount', (n, increment) => {
    expect(quoteProgram(n, 'metrics', 'monthly').monthly-quoteProgram(n-1,'metrics','monthly').monthly).toBe(increment)
  })
  test.each([0, -1, 1.5, NaN, Infinity, 501])('rejects invalid roster %s', n => {
    expect(()=>quoteProgram(n,'metrics','monthly')).toThrow()
  })
  test('rejects unknown plan and billing at the server boundary', () => {
    expect(()=>quoteProgram(10,'fake' as 'metrics','monthly')).toThrow()
    expect(()=>quoteProgram(10,'metrics','weekly' as 'monthly')).toThrow()
  })
})

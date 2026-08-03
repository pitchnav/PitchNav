import { AGENTS, getAgent } from './registry'

describe('agent registry', () => {
  it('includes the analytics agent', () => {
    expect(getAgent('analytics')?.name).toBe('Analytics')
  })

  it('returns undefined for an unknown agent', () => {
    expect(getAgent('marketing')).toBeUndefined()
  })

  it('has unique ids', () => {
    const ids = AGENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

import { buildAthleteContext, calculateAge, totalHeightInches } from './athlete-context'

const NOW = new Date('2026-07-31T12:00:00Z')

describe('calculateAge', () => {
  it('computes age from a date of birth', () => {
    expect(calculateAge('2007-03-18', NOW)).toBe(19)
  })

  it('does not count a birthday that has not happened yet this year', () => {
    expect(calculateAge('2007-09-12', NOW)).toBe(18)
  })

  it('counts a birthday that lands exactly today', () => {
    expect(calculateAge('2008-07-31', NOW)).toBe(18)
  })

  it('returns null rather than guessing when the date is missing or unusable', () => {
    expect(calculateAge(null, NOW)).toBeNull()
    expect(calculateAge('not-a-date', NOW)).toBeNull()
  })
})

describe('totalHeightInches', () => {
  it('combines feet and inches', () => {
    expect(totalHeightInches(6, 1)).toBe(73)
    expect(totalHeightInches(5, 11)).toBe(71)
  })

  it('handles a missing inches value', () => {
    expect(totalHeightInches(6, null)).toBe(72)
  })

  it('returns null when height was never provided', () => {
    expect(totalHeightInches(null, null)).toBeNull()
  })
})

describe('velocity context', () => {
  it('tells the assessment to distrust very low scores for a hard thrower', () => {
    const context = buildAthleteContext({ current_avg_velocity: 90, current_max_velocity: 93 }, NOW)
    expect(context.performsAtHighLevel).toBe(true)
    expect(context.promptBlock).toContain('93 mph')
    expect(context.promptBlock).toContain('suspicion')
    expect(context.promptBlock).toContain('wall of 1s and 2s')
  })

  it('still allows a well-supported low score to stand', () => {
    const context = buildAthleteContext({ current_avg_velocity: 92 }, NOW)
    expect(context.promptBlock).toContain('If a low score IS well supported, keep it')
  })

  it('does not apply the high-performer caution to a developing athlete', () => {
    const context = buildAthleteContext({ current_avg_velocity: 68 }, NOW)
    expect(context.performsAtHighLevel).toBe(false)
    expect(context.promptBlock).not.toContain('wall of 1s and 2s')
  })

  it('flags a wide gap between best and typical velocity as a repeatability signal', () => {
    const context = buildAthleteContext({ current_avg_velocity: 80, current_max_velocity: 89 }, NOW)
    expect(context.velocitySpread).toBe(9)
    expect(context.promptBlock).toContain('repeatability problem')
  })

  it('does not invent a spread when only one velocity is known', () => {
    expect(buildAthleteContext({ current_avg_velocity: 80 }, NOW).velocitySpread).toBeNull()
  })
})

describe('age context', () => {
  it('adds a maturation caveat for a younger athlete', () => {
    const context = buildAthleteContext({ date_of_birth: '2011-05-02' }, NOW)
    expect(context.ageYears).toBe(15)
    expect(context.maturationCaution).toBe(true)
    expect(context.promptBlock).toContain('bones lengthen faster')
    expect(context.promptBlock).toContain('re-check it at the next assessment')
  })

  it('never lets growth be stated as an established fact about the athlete', () => {
    const context = buildAthleteContext({ date_of_birth: '2011-05-02' }, NOW)
    expect(context.promptBlock).toContain('Do not state anything about this athlete')
    expect(context.promptBlock).toContain('has not been measured')
  })

  it('does not add the caveat for an adult athlete', () => {
    const context = buildAthleteContext({ date_of_birth: '2001-05-02' }, NOW)
    expect(context.maturationCaution).toBe(false)
    expect(context.promptBlock).not.toContain('bones lengthen faster')
  })
})

describe('height context', () => {
  it('tells the assessment to expect long-lever mechanics from a tall pitcher', () => {
    const context = buildAthleteContext({ height_feet: 6, height_inches: 5 }, NOW)
    expect(context.heightInches).toBe(77)
    expect(context.promptBlock).toContain('long levers')
    expect(context.promptBlock).toContain('harder to repeat')
  })

  it('warns against prescribing a longer stride to a shorter pitcher on principle', () => {
    const context = buildAthleteContext({ height_feet: 5, height_inches: 7 }, NOW)
    expect(context.promptBlock).toContain('shorter levers')
    expect(context.promptBlock).toContain('Do not prescribe a longer stride')
  })

  it('says nothing about levers for an average height', () => {
    const context = buildAthleteContext({ height_feet: 6, height_inches: 0 }, NOW)
    expect(context.promptBlock).not.toContain('long levers')
    expect(context.promptBlock).not.toContain('shorter levers')
  })
})

describe('guardrails', () => {
  it('always forbids remarking on the athlete body', () => {
    const context = buildAthleteContext({ weight_lbs: 260, height_feet: 6, height_inches: 2 }, NOW)
    expect(context.promptBlock).toContain('Never comment on the athlete')
    expect(context.promptBlock).toContain('never as something to remark on')
  })

  it('forbids using context to invent findings', () => {
    expect(buildAthleteContext({}, NOW).promptBlock).toContain('licence to invent a finding')
  })

  it('degrades to "not provided" instead of failing when intake is empty', () => {
    const context = buildAthleteContext(null, NOW)
    expect(context.ageYears).toBeNull()
    expect(context.heightInches).toBeNull()
    expect(context.promptBlock).toContain('not provided')
  })

  it('surfaces what the athlete said they wanted and were worried about', () => {
    const context = buildAthleteContext(
      { main_goal: 'add velocity for showcases', mechanical_concern: 'arm feels late' },
      NOW,
    )
    expect(context.promptBlock).toContain('add velocity for showcases')
    expect(context.promptBlock).toContain('arm feels late')
  })
})

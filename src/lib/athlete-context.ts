/**
 * Athlete context for the assessment.
 *
 * The intake already collects age, height, weight, playing level and velocity,
 * but handing that to the model as a raw JSON blob does almost nothing: it has
 * to do date arithmetic to get an age, and it gets no guidance on how any of it
 * should change an interpretation. These same numbers should meaningfully move
 * how a finding is read.
 *
 * The two that matter most:
 *
 * AGE. An adolescent mid-growth-spurt commonly loses range temporarily,
 * because long bones outpace the soft tissue crossing them. A "limited"
 * hamstring in a 14-year-old who grew four inches this year is a very
 * different finding from the same number in a 22-year-old, and the training
 * response differs too. This is framed as a possibility to consider, never as
 * a determination about a specific athlete's growth or skeletal status.
 *
 * DEMONSTRATED VELOCITY. If an athlete verifiably throws hard, their delivery
 * is transferring force effectively at some level. A wall of 1/5 scores on a
 * pitcher who sits 90+ is far more likely a scoring artifact than a genuine
 * mechanical collapse. This does not inflate scores -- it raises the bar for
 * calling something a fault and requires the write-up to say so plainly.
 *
 * Nothing here diagnoses, comments on body composition, or draws conclusions
 * about maturity status. It supplies context and asks for appropriate caution.
 */

export type AthleteProfileInput = {
  date_of_birth?: string | null
  height_feet?: number | null
  height_inches?: number | null
  weight_lbs?: number | null
  throwing_hand?: string | null
  playing_level?: string | null
  current_avg_velocity?: number | null
  current_max_velocity?: number | null
  goal_velocity?: number | null
  main_goal?: string | null
  mechanical_concern?: string | null
  throwing_program?: string | null
  strength_program?: string | null
  bullpen_intensity?: string | null
  pitches_per_week?: number | null
}

export type AthleteContext = {
  ageYears: number | null
  heightInches: number | null
  weightLbs: number | null
  avgVelocity: number | null
  maxVelocity: number | null
  goalVelocity: number | null
  /** Gap between best and typical velocity, a rough consistency signal. */
  velocitySpread: number | null
  /** True when the athlete is young enough that growth may affect range. */
  maturationCaution: boolean
  /** True when demonstrated velocity is high enough to question very low scores. */
  performsAtHighLevel: boolean
  /** Assembled guidance for the assessment prompt. */
  promptBlock: string
}

export function calculateAge(dateOfBirth: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  let age = asOf.getFullYear() - born.getFullYear()
  const monthDelta = asOf.getMonth() - born.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < born.getDate())) age -= 1
  if (age < 0 || age > 120) return null
  return age
}

export function totalHeightInches(feet: number | null | undefined, inches: number | null | undefined): number | null {
  if (feet === null || feet === undefined) return null
  const whole = Number(feet)
  if (!Number.isFinite(whole)) return null
  const extra = Number(inches ?? 0)
  const total = whole * 12 + (Number.isFinite(extra) ? extra : 0)
  return total > 0 ? total : null
}

function describeHeight(totalInches: number | null): string {
  if (totalInches === null) return 'not provided'
  return `${Math.floor(totalInches / 12)} ft ${totalInches % 12} in (${totalInches} inches)`
}

/**
 * Age below which a growth spurt is common enough that a range-of-motion
 * finding deserves a maturation caveat. Deliberately generous: the cost of an
 * unnecessary caveat is far lower than the cost of programming aggressive
 * mobility work for a still-growing athlete.
 */
const MATURATION_CAUTION_AGE = 17

/**
 * Velocity at or above which a very low mechanics score should be treated with
 * suspicion rather than taken at face value.
 */
const HIGH_PERFORMANCE_VELOCITY = 85

export function buildAthleteContext(
  profile: AthleteProfileInput | null | undefined,
  asOf: Date = new Date(),
): AthleteContext {
  const source = profile ?? {}
  const ageYears = calculateAge(source.date_of_birth, asOf)
  const heightInches = totalHeightInches(source.height_feet, source.height_inches)
  const weightLbs = source.weight_lbs ?? null
  const avgVelocity = source.current_avg_velocity ?? null
  const maxVelocity = source.current_max_velocity ?? null
  const goalVelocity = source.goal_velocity ?? null
  const velocitySpread =
    avgVelocity !== null && maxVelocity !== null && maxVelocity >= avgVelocity ? maxVelocity - avgVelocity : null

  const maturationCaution = ageYears !== null && ageYears <= MATURATION_CAUTION_AGE
  const bestVelocity = Math.max(avgVelocity ?? 0, maxVelocity ?? 0)
  const performsAtHighLevel = bestVelocity >= HIGH_PERFORMANCE_VELOCITY

  const lines: string[] = [
    'ATHLETE CONTEXT. Use these to interpret the findings. They change how a measurement should be read, not what the measurement is.',
    `- Age: ${ageYears ?? 'not provided'}`,
    `- Height: ${describeHeight(heightInches)}`,
    `- Weight: ${weightLbs !== null ? `${weightLbs} lbs` : 'not provided'}`,
    `- Playing level: ${source.playing_level ?? 'not provided'}`,
    `- Throws: ${source.throwing_hand ?? 'not provided'}`,
    `- Velocity: typical ${avgVelocity ?? 'not provided'} mph, best ${maxVelocity ?? 'not provided'} mph, goal ${goalVelocity ?? 'not provided'} mph`,
    `- Current throwing program: ${source.throwing_program ?? 'not provided'}`,
    `- Current strength program: ${source.strength_program ?? 'not provided'}`,
    `- Bullpen intensity: ${source.bullpen_intensity ?? 'not provided'}; pitches per week: ${source.pitches_per_week ?? 'not provided'}`,
    `- Athlete's own stated goal: ${source.main_goal ?? 'not provided'}`,
    `- Athlete's own stated concern: ${source.mechanical_concern ?? 'not provided'}`,
    '',
    'How to use this context:',
  ]

  if (performsAtHighLevel) {
    lines.push(
      `- This athlete demonstrably throws ${bestVelocity} mph. A delivery producing that velocity is transferring force effectively, whatever its flaws. Treat a very low score (1 or 2) with real suspicion: check whether the measurement actually supports it, and if the evidence is thin, raise the score and say the video could not support a confident judgement. Do not hand a hard-throwing pitcher a wall of 1s and 2s built on weak evidence. If a low score IS well supported, keep it and state the specific measurement behind it.`,
    )
  } else if (avgVelocity !== null) {
    lines.push(
      `- Typical velocity is ${avgVelocity} mph. Judge the delivery on what the video shows rather than assuming velocity implies a fault; low velocity has many causes outside mechanics, including size, training age and strength.`,
    )
  }

  if (maturationCaution) {
    lines.push(
      `- This athlete is ${ageYears}. Athletes this age frequently pass through periods where bones lengthen faster than the muscles and tendons crossing them, which temporarily reduces range of motion. If a mobility screen comes back limited, note that ongoing growth is one possible contributor alongside training history, keep mobility work gentle and pain-free, and re-check it at the next assessment rather than treating it as a fixed deficit. Do not state anything about this athlete's growth or skeletal maturity as fact -- it has not been measured.`,
      `- Keep strength prescriptions conservative and technique-first for this age, and defer to the athlete's coach and any medical guidance on throwing workload.`,
    )
  }

  if (heightInches !== null && heightInches >= 74) {
    lines.push(
      `- At ${describeHeight(heightInches)} this athlete has long levers. Expect a longer stride and a slightly slower-looking tempo as normal rather than a fault, and remember that longer limbs are genuinely harder to repeat, so judge consistency against other tall pitchers rather than against a compact delivery.`,
    )
  } else if (heightInches !== null && heightInches <= 68) {
    lines.push(
      `- At ${describeHeight(heightInches)} this athlete has shorter levers, so a shorter stride and quicker tempo can be entirely appropriate. Do not prescribe a longer stride purely because the number looks small.`,
    )
  }

  if (velocitySpread !== null && velocitySpread >= 6) {
    lines.push(
      `- Best velocity sits ${velocitySpread} mph above typical velocity, which is a wide spread. That points toward a repeatability problem more than a peak-output problem, so weight consistency and timing over adding intent.`,
    )
  }

  lines.push(
    '- Never comment on the athlete\'s body weight or physique. Weight is here only to inform sensible loading, never as something to remark on.',
    '- Do not treat any of this context as licence to invent a finding the video and screens do not support.',
  )

  return {
    ageYears,
    heightInches,
    weightLbs,
    avgVelocity,
    maxVelocity,
    goalVelocity,
    velocitySpread,
    maturationCaution,
    performsAtHighLevel,
    promptBlock: lines.join('\n'),
  }
}

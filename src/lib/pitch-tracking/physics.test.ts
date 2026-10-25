import {
  releaseVelocityMph,
  arrivalVelocityMph,
  velocityErrorPerFrameMph,
  flightDistanceFt,
  dragParameter,
} from './physics'

/**
 * These check the model against published, independently-known baseball
 * physics rather than against footage, which is the point: the arithmetic can
 * be proven correct now, so that when real pitches and radar readings do
 * arrive, any disagreement is attributable to the ball *detector* and not to
 * the equations underneath it.
 */

describe('drag model matches known baseball behaviour', () => {
  it('loses roughly a tenth of its speed between release and the plate', () => {
    // The release-to-plate loss for a real pitch is commonly cited at about
    // 9-10%. This is the single best end-to-end check on the drag parameter:
    // get Cd, mass, area or air density materially wrong and this moves.
    const release = releaseVelocityMph(55, 0.42)!
    const arrival = arrivalVelocityMph(release, 55)!
    const lossFraction = (release - arrival) / release

    expect(lossFraction).toBeGreaterThan(0.08)
    expect(lossFraction).toBeLessThan(0.11)
  })

  it('puts a ~0.42s flight in the low-90s, where a real fastball sits', () => {
    // A mid-90s four-seam fastball reaches the plate in roughly 0.4s. If the
    // inversion were wrong -- for instance reporting average speed over the
    // flight instead of speed at release -- this would land near 89 instead.
    const mph = releaseVelocityMph(55, 0.42)!
    expect(mph).toBeGreaterThan(92)
    expect(mph).toBeLessThan(96)
  })

  it('reports release speed, not average speed, and the two differ materially', () => {
    // Average speed over the flight is just distance/time. Quoting that as
    // "velocity" would understate a 90 mph pitch by several mph -- the exact
    // size of error D-010 removed the old system for.
    const flightFt = 55
    const flightTime = 0.42
    const release = releaseVelocityMph(flightFt, flightTime)!
    const averageMph = (flightFt / flightTime) * 0.681818 // ft/s -> mph

    expect(release).toBeGreaterThan(averageMph + 3)
  })

  it('scales with air density, so altitude is a real input and not decoration', () => {
    // Denver air is roughly 82% of sea-level density. Thinner air means less
    // drag, so the same time of flight implies a slightly lower release speed.
    const seaLevel = releaseVelocityMph(55, 0.42)!
    const denver = releaseVelocityMph(55, 0.42, { airDensityKgM3: 1.0 })!

    expect(denver).toBeLessThan(seaLevel)
    expect(dragParameter({ airDensityKgM3: 1.0 })).toBeLessThan(dragParameter())
  })
})

describe('timing resolution sets the accuracy floor', () => {
  // This is the finding that should drive the capture spec. Release and
  // plate-crossing are each located to within about a frame, so this error
  // enters roughly twice, before the detector contributes anything at all.
  it('shows 60 fps cannot support a credible velocity claim on its own', () => {
    const perFrame = velocityErrorPerFrameMph(55, 0.42, 60)!
    // Over 3 mph from a single frame of ambiguity -- larger than the entire
    // error budget a velocity number shown to a college coach can carry.
    expect(perFrame).toBeGreaterThan(3)
  })

  it('shows 240 fps brings one frame of ambiguity under a mph', () => {
    const perFrame = velocityErrorPerFrameMph(55, 0.42, 240)!
    expect(perFrame).toBeLessThan(1)
  })

  it('improves roughly in proportion to frame rate', () => {
    const at60 = velocityErrorPerFrameMph(55, 0.42, 60)!
    const at240 = velocityErrorPerFrameMph(55, 0.42, 240)!
    // Four times the frame rate, about a quarter of the per-frame error.
    expect(at60 / at240).toBeGreaterThan(3.5)
    expect(at60 / at240).toBeLessThan(4.5)
  })
})

describe('flight distance accounts for release extension', () => {
  it('subtracts extension from the rubber-to-plate distance', () => {
    expect(flightDistanceFt('mlb', 6.5)).toBeCloseTo(54, 5)
    expect(flightDistanceFt('littleLeagueMajors', 4)).toBeCloseTo(42, 5)
  })

  it('shows why assuming a league-average extension caps accuracy', () => {
    // A foot of extension error on an otherwise perfect measurement. Real
    // per-pitcher extension varies by well over a foot, so this is not a
    // worst case -- it is ordinary.
    const assumed = releaseVelocityMph(flightDistanceFt('mlb', 6.5)!, 0.42)!
    const actual = releaseVelocityMph(flightDistanceFt('mlb', 5.5)!, 0.42)!

    expect(Math.abs(assumed - actual)).toBeGreaterThan(1.5)
  })

  it('refuses impossible geometry instead of returning a number', () => {
    expect(flightDistanceFt('littleLeagueMajors', 50)).toBeNull()
    expect(flightDistanceFt('mlb', -1)).toBeNull()
  })
})

describe('refuses inputs that cannot describe a pitch', () => {
  it('returns null rather than a value for impossible timing or distance', () => {
    expect(releaseVelocityMph(55, 0)).toBeNull()
    expect(releaseVelocityMph(0, 0.42)).toBeNull()
    expect(releaseVelocityMph(-55, 0.42)).toBeNull()
    expect(releaseVelocityMph(55, NaN)).toBeNull()
    expect(arrivalVelocityMph(0, 55)).toBeNull()
    expect(velocityErrorPerFrameMph(55, 0.42, 0)).toBeNull()
  })
})

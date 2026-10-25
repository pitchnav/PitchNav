/**
 * Ball-flight physics for video-based pitch velocity.
 *
 * This is the deterministic half of the velocity track (D-012). It converts a
 * measured time of flight over a known distance into a release velocity, which
 * is the number baseball actually quotes -- radar guns, Trackman and scouts all
 * report velocity *at release*, not the average over the flight or the speed at
 * the plate. Those differ by roughly 9-10% at pitching speeds, so reporting the
 * wrong one is a 8-9 mph error on a 90 mph fastball, which is the entire
 * difference D-010 was written about.
 *
 * Nothing here needs a trained model or any footage: given (distance, time) it
 * is closed-form. That is deliberate. The hard, data-hungry part of the system
 * is detecting *when* the ball left the hand and *when* it crossed the plate;
 * everything downstream of those two timestamps is the arithmetic below, and
 * it can be verified today against published physics rather than waiting on a
 * bullpen session.
 *
 * NOT a measurement of anything on its own. Feeding it wrong timestamps
 * produces a confident wrong number exactly as fast as right ones.
 */

/** Regulation baseball mass. MLB rule 3.01: 5 to 5.25 oz; 0.145 kg is the midpoint. */
const BALL_MASS_KG = 0.145

/** Regulation baseball diameter. MLB rule 3.01: 2.86-2.94 in; 0.0739 m is the midpoint. */
const BALL_DIAMETER_M = 0.0739

/**
 * Drag coefficient for a baseball at pitching speeds.
 *
 * A baseball at 80-100 mph sits around Reynolds 1.5x10^5, past the drag crisis,
 * where Cd is commonly taken as 0.33-0.35 for a four-seam orientation. Seam
 * orientation and spin move this a few percent, which is one reason the output
 * here carries an uncertainty band rather than a bare number.
 */
const DRAG_COEFFICIENT = 0.33

/** Dry air at sea level, 15 C. */
const AIR_DENSITY_SEA_LEVEL_KG_M3 = 1.225

const MPH_PER_M_S = 2.236936
const M_PER_FT = 0.3048

export interface FlightConditions {
  /** Air density in kg/m^3. Defaults to sea level, 15 C. */
  airDensityKgM3?: number
}

/**
 * Drag parameter k, in units of 1/metre, such that dv/dt = -k*v^2.
 *
 * k = (rho * Cd * A) / (2 * m), with A the ball's cross-section.
 */
export function dragParameter(conditions: FlightConditions = {}): number {
  const rho = conditions.airDensityKgM3 ?? AIR_DENSITY_SEA_LEVEL_KG_M3
  const radius = BALL_DIAMETER_M / 2
  const area = Math.PI * radius * radius
  return (rho * DRAG_COEFFICIENT * area) / (2 * BALL_MASS_KG)
}

/**
 * Release velocity (mph) from a measured time of flight over a known distance.
 *
 * With quadratic drag and no thrust, dv/dt = -k*v^2 integrates to
 * x(t) = ln(1 + k*v0*t) / k, so a known distance and time invert to
 * v0 = (e^(k*D) - 1) / (k*T).
 *
 * Gravity is deliberately excluded. It acts perpendicular to the flight path
 * and changes path *length* by well under a percent over a pitch, while adding
 * a second-order term to an equation whose real error is dominated by frame
 * timing and release-point location. Including it would add precision the
 * inputs do not have.
 *
 * Returns null rather than a number for inputs that cannot describe a pitch,
 * so a caller cannot accidentally publish a value derived from a bad track.
 */
export function releaseVelocityMph(
  flightDistanceFt: number,
  flightTimeSeconds: number,
  conditions: FlightConditions = {},
): number | null {
  if (!Number.isFinite(flightDistanceFt) || !Number.isFinite(flightTimeSeconds)) return null
  if (flightDistanceFt <= 0 || flightTimeSeconds <= 0) return null

  const k = dragParameter(conditions)
  const distanceM = flightDistanceFt * M_PER_FT
  const v0 = (Math.exp(k * distanceM) - 1) / (k * flightTimeSeconds)
  if (!Number.isFinite(v0) || v0 <= 0) return null

  return v0 * MPH_PER_M_S
}

/**
 * Speed (mph) remaining when the ball arrives, given its release speed.
 *
 * Useful as an internal plausibility check: the release-to-plate loss for a
 * real pitch sits near 9-10%, so a pair of numbers far outside that is a sign
 * the track or the distance is wrong rather than that the pitcher is unusual.
 */
export function arrivalVelocityMph(
  releaseMph: number,
  flightDistanceFt: number,
  conditions: FlightConditions = {},
): number | null {
  if (!Number.isFinite(releaseMph) || releaseMph <= 0) return null
  if (!Number.isFinite(flightDistanceFt) || flightDistanceFt <= 0) return null

  const k = dragParameter(conditions)
  const distanceM = flightDistanceFt * M_PER_FT
  // v(x) = v0 * e^(-k*x) follows from dv/dx = -k*v.
  return releaseMph * Math.exp(-k * distanceM)
}

/**
 * How much a one-frame timing error moves the reported velocity, in mph.
 *
 * This is the single most important number for deciding whether a given
 * capture frame rate is good enough, and it is why the capture guidance will
 * demand high frame rates: release and plate-crossing are each detected to
 * within about a frame, so the error below enters roughly twice.
 *
 * At 60 fps over a 55 ft flight, one frame is worth well over a mph; at 240 fps
 * it is a few tenths. Any claim about this system's accuracy has to clear this
 * floor before anything about the detector matters.
 */
export function velocityErrorPerFrameMph(
  flightDistanceFt: number,
  flightTimeSeconds: number,
  captureFps: number,
  conditions: FlightConditions = {},
): number | null {
  if (!Number.isFinite(captureFps) || captureFps <= 0) return null
  const base = releaseVelocityMph(flightDistanceFt, flightTimeSeconds, conditions)
  const offByOne = releaseVelocityMph(flightDistanceFt, flightTimeSeconds + 1 / captureFps, conditions)
  if (base === null || offByOne === null) return null
  return Math.abs(base - offByOne)
}

/**
 * Standard pitching distances, rubber to the back of home plate.
 *
 * The *flight* distance is shorter than this: a pitcher releases the ball well
 * in front of the rubber. See `flightDistanceFt`.
 */
export const RUBBER_TO_PLATE_FT = {
  mlb: 60.5,
  highSchool: 60.5,
  littleLeagueMajors: 46,
  littleLeagueIntermediate: 50,
  softballFastpitch: 43,
} as const

export type PitchingDistance = keyof typeof RUBBER_TO_PLATE_FT

/**
 * Actual ball-flight distance, after subtracting how far in front of the
 * rubber the ball is released.
 *
 * Release extension is a real, measured, per-pitcher quantity -- MLB average is
 * around 6.5 ft and the spread across pitchers is well over a foot. Over a
 * ~54 ft flight, a foot of extension error is close to 2%, or about 1.7 mph on
 * a 90 mph pitch. That is large enough that assuming a league-average value
 * silently caps this system's accuracy, which is why extension is an explicit
 * argument here and must eventually be measured from the video rather than
 * guessed.
 */
export function flightDistanceFt(distance: PitchingDistance, releaseExtensionFt: number): number | null {
  const full = RUBBER_TO_PLATE_FT[distance]
  if (full === undefined) return null
  if (!Number.isFinite(releaseExtensionFt) || releaseExtensionFt < 0) return null
  const flight = full - releaseExtensionFt
  return flight > 0 ? flight : null
}

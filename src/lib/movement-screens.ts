/**
 * Pitch Nav movement screens.
 *
 * Why these exist: the mechanics assessment can see *what* breaks in a
 * delivery, but it cannot see *why*. Reading "thoracic mobility limitation"
 * off a 90mph blur is a guess. These screens turn that guess into a measured
 * number that can be re-measured in two weeks.
 *
 * Why these specific screens: every one is slow, held, and moves mostly in a
 * plane that faces the camera. That is the one situation where single-camera
 * 2D pose estimation is genuinely reliable. High-speed rotational movement --
 * the pitch itself -- is the hardest case for 2D and is exactly what we do NOT
 * rely on for physical findings. Each screen carries an explicit reliability
 * tier so a moderate-confidence proxy is never presented as a hard number.
 *
 * These are movement-capacity measurements for training decisions. They are
 * not a medical examination, they do not diagnose pathology, and nothing here
 * may be presented as clinical range-of-motion testing.
 */

export type ScreenReliability = 'High' | 'Moderate'

export type ScreenSide = 'left' | 'right' | 'single'

export type LandmarkPoint = { x: number; y: number; visibility?: number }

export type ScreenMeasurement = {
  /** Primary measured value, in degrees unless the screen says otherwise. */
  value: number | null
  /** Landmark visibility across the joints this screen depends on, 0-1. */
  confidence: number
  /** Set when the frame cannot support an honest measurement. */
  problem?: string
}

export type ScreenBand = {
  /** At or above this value is unrestricted for pitching purposes. */
  clear: number
  /** Below this value is a meaningful limitation worth programming for. */
  limited: number
}

export type MovementScreen = {
  id: string
  name: string
  /** Plain-language reason this matters for a pitcher. */
  whyItMatters: string
  /** How the athlete sets the phone up. */
  cameraSetup: string
  /** How the athlete gets into position. */
  position: string
  /** What the athlete does while filming. */
  action: string
  /** Measured separately per side, or a single whole-body value. */
  bilateral: boolean
  /**
   * Part of the standard athlete battery. Kept deliberately small: a long
   * screening session gets abandoned or rushed, and a rushed screen produces
   * a worse number than no screen at all. The five core screens are chosen to
   * span the kinetic chain and to cover all three delivery signals the
   * cross-check can test against. The rest remain defined and tested so staff
   * can request one when a specific question comes up.
   */
  core: boolean
  /**
   * True when a limitation on this screen should produce a signature visible
   * in the delivery, so it can be cross-checked against the pitch. Capacity
   * screens that do not predict one specific mechanical fault set this false
   * rather than having a prediction invented for them.
   */
  predictsMechanics: boolean
  reliability: ScreenReliability
  /** Why the reliability is what it is, in plain language. */
  reliabilityNote: string
  unit: 'degrees' | 'ratio'
  band: ScreenBand
  /** Higher is better for most screens; false where lower is better. */
  higherIsBetter: boolean
  /**
   * How the frames of one clip become a single measurement.
   *  - 'best'    the end position reached, for range-of-motion screens.
   *  - 'median'  the steady value of a hold, so one wobble cannot define a
   *              control screen.
   *  - 'rotationFromRange' the athlete's own neutral and rotated frames are
   *              both inside the clip, so rotation is recovered from how much
   *              the shoulders foreshorten between them.
   */
  aggregate: 'best' | 'median' | 'rotationFromRange'
  measure: (landmarks: LandmarkPoint[], side: ScreenSide) => ScreenMeasurement
}

const LEFT = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, foot: 31 }
const RIGHT = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 }

function sideJoints(side: ScreenSide) {
  return side === 'left' ? LEFT : RIGHT
}

function visibilityOf(landmarks: LandmarkPoint[], indices: number[]): number {
  const values = indices.map((index) => landmarks[index]?.visibility ?? 0)
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function present(landmarks: LandmarkPoint[], indices: number[]): boolean {
  return indices.every((index) => Boolean(landmarks[index]))
}

/** Angle at `vertex` between the two rays, 0-180 degrees. */
function jointAngle(a: LandmarkPoint, vertex: LandmarkPoint, b: LandmarkPoint): number | null {
  const ax = a.x - vertex.x
  const ay = a.y - vertex.y
  const bx = b.x - vertex.x
  const by = b.y - vertex.y
  const magnitude = Math.hypot(ax, ay) * Math.hypot(bx, by)
  if (!magnitude) return null
  const cosine = Math.max(-1, Math.min(1, (ax * bx + ay * by) / magnitude))
  return (Math.acos(cosine) * 180) / Math.PI
}

/**
 * Angle of the segment from `from` to `to` measured off vertical, 0-180.
 * Image y grows downward, so "up" is negative y.
 */
function angleFromVertical(from: LandmarkPoint, to: LandmarkPoint): number | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (!Math.hypot(dx, dy)) return null
  // Vertical reference points up the image.
  return (Math.acos(Math.max(-1, Math.min(1, -dy / Math.hypot(dx, dy)))) * 180) / Math.PI
}

/** Angle of the segment off horizontal, signed so positive means the `to` end sits higher. */
function angleFromHorizontal(from: LandmarkPoint, to: LandmarkPoint): number | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (!Math.hypot(dx, dy)) return null
  return (Math.atan2(-dy, Math.abs(dx) || 1e-6) * 180) / Math.PI
}

function insufficient(confidence: number): ScreenMeasurement {
  return {
    value: null,
    confidence,
    problem: 'The joints needed for this screen were not clearly visible. Re-record with the whole body in frame and better lighting.',
  }
}

export const MOVEMENT_SCREENS: MovementScreen[] = [
  {
    id: 'active_straight_leg_raise',
    name: 'Active Straight Leg Raise',
    whyItMatters:
      'This is the most direct check of how much your hamstring lets your leg travel. A tight or weak hamstring is one of the common reasons a lead leg keeps drifting forward at foot strike instead of blocking and letting the hips rotate around it.',
    cameraSetup: 'Lie on the floor. Put the phone on the ground about 6 feet away, level with your hips, filming your whole body from the side.',
    position: 'Lie flat on your back with both legs straight and both arms at your sides.',
    action: 'Keeping both knees straight and the down leg flat on the floor, raise one leg as high as you can without pain. Hold it at the top for 3 seconds.',
    bilateral: true,
    core: true,
    predictsMechanics: true,
    reliability: 'High',
    reliabilityNote: 'This movement happens in a flat plane facing the camera, so the 2D measurement is dependable.',
    unit: 'degrees',
    band: { clear: 70, limited: 55 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const down = side === 'left' ? RIGHT : LEFT
      const needed = [joints.hip, joints.ankle, down.hip, down.ankle]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      // Measure the raised leg against the down leg rather than against the
      // image horizontal, so a phone that is not perfectly level does not
      // silently add or remove range.
      const raised = jointAngle(landmarks[joints.ankle], landmarks[joints.hip], landmarks[down.ankle])
      return { value: raised, confidence }
    },
  },
  {
    id: 'overhead_reach',
    name: 'Overhead Reach',
    whyItMatters:
      'This shows how far your arm can travel overhead before your back has to arch to help. When it is limited, the upper back and shoulder often have to borrow range from somewhere else during the throw.',
    cameraSetup: 'Stand side-on to the phone, about 8 feet away, with the camera at chest height and your whole body in frame.',
    position: 'Stand with your back against a wall, feet a few inches out, and your low back flat against the wall.',
    action: 'Keeping your low back flat on the wall and your elbow straight, raise one arm overhead as far as it goes. Hold for 3 seconds.',
    bilateral: true,
    core: false,
    predictsMechanics: true,
    reliability: 'High',
    reliabilityNote: 'Filmed from the side, the arm swings straight across the camera view, which 2D measurement handles well.',
    unit: 'degrees',
    band: { clear: 165, limited: 140 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const needed = [joints.hip, joints.shoulder, joints.wrist]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      const value = jointAngle(landmarks[joints.hip], landmarks[joints.shoulder], landmarks[joints.wrist])
      return { value, confidence }
    },
  },
  {
    id: 'ankle_dorsiflexion',
    name: 'Ankle Bend (Knee-to-Wall)',
    whyItMatters:
      'This is how far your shin can travel over your foot. The lead ankle has to absorb landing. When this is limited, the landing force usually has to go somewhere less useful, and the front side can give way early.',
    cameraSetup: 'Place the phone on the floor about 4 feet to the side of your front foot, filming your lower leg from the side.',
    position: 'Stand facing a wall in a short split stance with the front toe a few inches from the wall.',
    action: 'Keeping your front heel flat on the ground, drive your front knee forward toward the wall as far as it goes. Hold for 3 seconds.',
    bilateral: true,
    core: true,
    predictsMechanics: true,
    reliability: 'High',
    reliabilityNote: 'The shin travels straight across the camera view, so this is a dependable 2D measurement.',
    unit: 'degrees',
    band: { clear: 35, limited: 25 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const needed = [joints.knee, joints.ankle]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      // Shin lean off vertical: ankle -> knee.
      const value = angleFromVertical(landmarks[joints.ankle], landmarks[joints.knee])
      return { value, confidence }
    },
  },
  {
    id: 'seated_hip_rotation',
    name: 'Seated Hip Rotation',
    whyItMatters:
      'Pitching asks both hips to rotate a long way in opposite directions. When one hip is short on rotation, that range is usually taken from the low back or the front leg instead, and it often shows up as a side-to-side difference.',
    cameraSetup: 'Sit on a table or bench with your shins hanging free. Put the phone about 6 feet in front of you at knee height, filming you straight on.',
    position: 'Sit tall with your knees bent 90 degrees and your thighs together, shins hanging straight down.',
    action: 'Keeping your thigh still and your hips level on the bench, swing one shin outward as far as it goes. Hold for 3 seconds. This measures inward rotation of that hip.',
    bilateral: true,
    core: true,
    predictsMechanics: true,
    reliability: 'Moderate',
    reliabilityNote:
      'The shin swings mostly across the camera, but small trunk lean or hip lift can add apparent range. Treat this as a comparison between your own sides and your own follow-ups, not an exact clinical number.',
    unit: 'degrees',
    band: { clear: 35, limited: 22 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const needed = [joints.knee, joints.ankle]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      const value = angleFromVertical(landmarks[joints.knee], landmarks[joints.ankle])
      return { value, confidence }
    },
  },
  {
    id: 'seated_trunk_rotation',
    name: 'Seated Trunk Rotation',
    whyItMatters:
      'This is how far your upper back rotates when your hips cannot help. Pitching separates the shoulders from the hips, so when upper-back rotation is short, the shoulder and elbow usually end up covering the difference.',
    cameraSetup: 'Sit on a chair with the phone about 6 feet in front of you at chest height, filming you straight on.',
    position: 'Sit tall with your arms crossed over your chest and a ball or rolled towel squeezed between your knees to keep your hips square.',
    action: 'Keeping your hips square and the ball squeezed, rotate your shoulders as far as you can to one side. Hold for 3 seconds.',
    bilateral: true,
    core: true,
    predictsMechanics: true,
    reliability: 'Moderate',
    reliabilityNote:
      'Rotation toward or away from a single camera is the hardest thing for 2D video to see. This estimates rotation from how much narrower your shoulders become versus your hips, so it is useful for tracking your own change over time and side-to-side differences, but it is not an exact rotation measurement.',
    unit: 'degrees',
    band: { clear: 40, limited: 25 },
    higherIsBetter: true,
    aggregate: 'rotationFromRange',
    measure(landmarks, side) {
      const needed = [LEFT.shoulder, RIGHT.shoulder, LEFT.hip, RIGHT.hip]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      const shoulderWidth = Math.hypot(
        landmarks[LEFT.shoulder].x - landmarks[RIGHT.shoulder].x,
        landmarks[LEFT.shoulder].y - landmarks[RIGHT.shoulder].y,
      )
      const hipWidth = Math.hypot(
        landmarks[LEFT.hip].x - landmarks[RIGHT.hip].x,
        landmarks[LEFT.hip].y - landmarks[RIGHT.hip].y,
      )
      if (!hipWidth || !shoulderWidth) return insufficient(confidence)
      // With the hips held square, the shoulders foreshorten as the trunk
      // turns away from the camera. Normalizing against hip width keeps the
      // estimate stable if the athlete sits closer or further away than
      // expected. The neutral shoulder:hip ratio is captured on the athlete's
      // own neutral frame, so this returns the raw ratio and the caller
      // converts it against that baseline.
      const ratio = shoulderWidth / hipWidth
      return { value: ratio, confidence }
    },
  },
  {
    id: 'single_leg_stance',
    name: 'Single-Leg Stance',
    whyItMatters:
      'Standing on one leg shows whether your pelvis stays level when only one hip is holding you up. A hip that drops here is often the same hip that lets the front side give way after landing.',
    cameraSetup: 'Put the phone about 8 feet in front of you at hip height, filming you straight on with your whole body in frame.',
    position: 'Stand tall on one leg with your hands on your hips and the other knee lifted to about hip height.',
    action: 'Hold as still as you can for 10 seconds. Do not let your standing-side hip drop.',
    bilateral: true,
    core: false,
    predictsMechanics: true,
    reliability: 'High',
    reliabilityNote: 'Pelvic drop happens side-to-side across the camera view, which 2D measurement reads well from the front.',
    unit: 'degrees',
    band: { clear: 3, limited: 6 },
    higherIsBetter: false,
    aggregate: 'median',
    measure(landmarks) {
      const needed = [LEFT.hip, RIGHT.hip]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      const tilt = angleFromHorizontal(landmarks[LEFT.hip], landmarks[RIGHT.hip])
      return { value: tilt === null ? null : Math.abs(tilt), confidence }
    },
  },
]

MOVEMENT_SCREENS.push(
  {
    id: 'shoulder_external_rotation',
    name: 'Shoulder Lay-Back',
    whyItMatters:
      'This is how far your throwing shoulder can rotate back into the cocked position. It is the single most throwing-specific thing on this list. When it is short, the trunk and elbow usually make up the difference, and that is a change you can see in the delivery.',
    cameraSetup: 'Stand side-on to the phone, about 6 feet away, camera at shoulder height, filming your throwing arm.',
    position: 'Stand tall with your upper arm out to the side at shoulder height and your elbow bent 90 degrees, forearm pointing straight forward.',
    action: 'Keeping your upper arm level and your back flat, rotate your hand back and up as far as it goes without pain. Hold for 3 seconds.',
    bilateral: true,
    core: true,
    predictsMechanics: true,
    reliability: 'Moderate',
    reliabilityNote:
      'The forearm swings across the camera, which reads well, but the upper arm drifting out of position adds apparent range. Treat this as a comparison against your other side and your own follow-ups, not an exact clinical number.',
    unit: 'degrees',
    band: { clear: 85, limited: 60 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const needed = [joints.elbow, joints.wrist]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      // Forearm pointing straight forward reads 0; rotating the hand up and
      // back raises the wrist above the elbow and increases the angle.
      const value = angleFromHorizontal(landmarks[joints.elbow], landmarks[joints.wrist])
      return { value: value === null ? null : value + 90, confidence }
    },
  },
  {
    id: 'cross_body_reach',
    name: 'Cross-Body Reach',
    whyItMatters:
      'This shows how freely your throwing arm can travel across your body. That is the range your arm has to give up after release while it slows down, so when it is tight the trunk usually has to move instead.',
    cameraSetup: 'Face the phone from about 8 feet away, camera at chest height, with your head and both shoulders in frame.',
    position: 'Stand tall facing the camera with your throwing arm straight out in front at shoulder height.',
    action: 'Keeping your shoulders square to the camera and your chest still, pull your straight arm across your body as far as it goes. Hold for 3 seconds.',
    bilateral: true,
    core: false,
    predictsMechanics: true,
    reliability: 'Moderate',
    reliabilityNote:
      'Filmed from the front this reads well, but turning your chest instead of moving the arm adds apparent range. Use it as a comparison between your sides and against your own follow-ups rather than an exact measurement.',
    unit: 'degrees',
    band: { clear: 40, limited: 60 },
    higherIsBetter: false,
    aggregate: 'median',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const opposite = side === 'left' ? RIGHT : LEFT
      const needed = [joints.shoulder, joints.elbow, opposite.shoulder]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      // Angle at the throwing shoulder between the opposite shoulder and the
      // elbow. Arm straight out to the side reads near 180; pulling it across
      // the chest drives it down, so a smaller number is more range.
      const value = jointAngle(landmarks[opposite.shoulder], landmarks[joints.shoulder], landmarks[joints.elbow])
      return { value, confidence }
    },
  },
  {
    id: 'hip_extension',
    name: 'Hip Extension',
    whyItMatters:
      'This is how far the front of your hip lets your thigh travel backward. The back leg needs that range to drive down the mound, and when it is short the low back usually arches to make up for it.',
    cameraSetup: 'Put the phone about 6 feet to your side at hip height, filming your whole body from the side.',
    position: 'Lie on your back at the very end of a bed or bench so that one leg can hang freely off the edge from the hip down.',
    action: 'Pull one knee to your chest and hold it there. Let the other leg relax and hang down as far as it goes. Hold for 3 seconds.',
    bilateral: true,
    core: false,
    predictsMechanics: true,
    reliability: 'High',
    reliabilityNote: 'The hanging thigh moves straight across the camera view, so this is a dependable 2D measurement.',
    unit: 'degrees',
    band: { clear: 0, limited: -10 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks, side) {
      const joints = sideJoints(side)
      const needed = [joints.hip, joints.knee]
      const confidence = visibilityOf(landmarks, needed)
      if (!present(landmarks, needed)) return insufficient(confidence)
      const fromHorizontal = angleFromHorizontal(landmarks[joints.hip], landmarks[joints.knee])
      // Positive means the thigh dropped below level, which is the range we
      // are looking for. A thigh that stays propped above level reads negative.
      return { value: fromHorizontal === null ? null : -fromHorizontal, confidence }
    },
  },
  {
    id: 'squat_depth',
    name: 'Squat Depth',
    whyItMatters:
      'This is a whole lower-body check in one movement: ankles, knees, and hips together. It will not tell you which one is short on its own, but a shallow squat alongside a limited ankle or hip screen tells you the restriction is real and not a one-off.',
    cameraSetup: 'Put the phone about 8 feet to your side at hip height, filming your whole body from the side.',
    position: 'Stand with your feet about shoulder-width apart and your arms out in front for balance.',
    action: 'Squat down as far as you comfortably can while keeping your heels on the floor. Hold the bottom for 3 seconds.',
    bilateral: false,
    core: false,
    // A shallow squat is a combined result of several joints, so on its own it
    // does not predict one specific fault in the delivery. It is used as
    // supporting evidence for the joint-specific screens instead.
    predictsMechanics: false,
    reliability: 'High',
    reliabilityNote: 'Squatting happens straight across the camera view from the side, so the depth measurement is dependable.',
    unit: 'degrees',
    band: { clear: 110, limited: 80 },
    higherIsBetter: true,
    aggregate: 'best',
    measure(landmarks) {
      // Use whichever leg is tracked more clearly; from a side view the near
      // leg is usually far more visible than the far one.
      const leftVisibility = visibilityOf(landmarks, [LEFT.hip, LEFT.knee, LEFT.ankle])
      const rightVisibility = visibilityOf(landmarks, [RIGHT.hip, RIGHT.knee, RIGHT.ankle])
      const joints = leftVisibility >= rightVisibility ? LEFT : RIGHT
      const confidence = Math.max(leftVisibility, rightVisibility)
      const needed = [joints.hip, joints.knee, joints.ankle]
      if (!present(landmarks, needed)) return insufficient(confidence)
      const kneeAngle = jointAngle(landmarks[joints.hip], landmarks[joints.knee], landmarks[joints.ankle])
      // Report depth achieved rather than the raw knee angle, so a deeper
      // squat is a larger number like every other higher-is-better screen.
      return { value: kneeAngle === null ? null : 180 - kneeAngle, confidence }
    },
  },
)

export function getMovementScreen(id: string): MovementScreen | undefined {
  return MOVEMENT_SCREENS.find((screen) => screen.id === id)
}

export type ScreenClassification = 'clear' | 'watch' | 'limited' | 'unmeasured'

/**
 * Buckets a measured value against the screen's reference band. Deliberately
 * coarse: these bands guide training emphasis, and pretending a 2D video can
 * separate 61 degrees from 64 degrees would be dishonest precision.
 */
export function classifyScreenValue(screen: MovementScreen, value: number | null): ScreenClassification {
  if (value === null || !Number.isFinite(value)) return 'unmeasured'
  if (screen.higherIsBetter) {
    if (value >= screen.band.clear) return 'clear'
    if (value >= screen.band.limited) return 'watch'
    return 'limited'
  }
  if (value <= screen.band.clear) return 'clear'
  if (value <= screen.band.limited) return 'watch'
  return 'limited'
}

/**
 * Side-to-side difference matters as much as the raw number: a pitcher whose
 * lead hip rotates 20 degrees less than the trail hip has an asymmetry worth
 * programming for even when both sides sit inside the "clear" band.
 */
export function asymmetryDegrees(left: number | null, right: number | null): number | null {
  if (left === null || right === null) return null
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  return Math.abs(left - right)
}

/** Above this side-to-side gap, the asymmetry itself is the finding. */
export const NOTABLE_ASYMMETRY_DEGREES = 12

/**
 * Collapses one clip's per-frame values into the single measurement for that
 * screen. Kept here beside the screen definitions so the capture UI cannot
 * drift from what each screen actually means.
 */
export function aggregateScreenSamples(screen: MovementScreen, samples: number[]): number | null {
  const values = samples.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (!values.length) return null

  if (screen.aggregate === 'rotationFromRange') {
    // The clip contains the athlete's own neutral (shoulders square to the
    // camera, widest projection) and their rotated end position (narrowest).
    // Rotation is recovered from how far the shoulders foreshorten between
    // the two, which makes this the athlete's own baseline rather than an
    // assumed one -- a naturally broad-shouldered athlete is not penalised.
    const widest = values[values.length - 1]
    const narrowest = values[0]
    if (!widest || widest <= 0) return null
    const cosine = Math.max(-1, Math.min(1, narrowest / widest))
    return (Math.acos(cosine) * 180) / Math.PI
  }

  if (screen.aggregate === 'median') {
    return values[Math.floor(values.length / 2)]
  }

  // 'best': the end position reached, which depends on which way is better.
  return screen.higherIsBetter ? values[values.length - 1] : values[0]
}

/** One measured screen, as stored in movement_screen_sessions.results. */
export type ScreenResult = {
  screen_id: string
  side: ScreenSide
  value: number | null
  unit: 'degrees' | 'ratio'
  confidence: number
  classification: ScreenClassification
  reliability: ScreenReliability
  storage_path?: string | null
  problem?: string | null
}

export type ScreenFindingKind = 'limitation' | 'asymmetry' | 'unmeasured'

export type ScreenFinding = {
  screen_id: string
  screen_name: string
  kind: ScreenFindingKind
  /** Plain-language statement of what was measured. */
  detail: string
  reliability: ScreenReliability
  /** Sorting weight — a hard limitation outranks a watch-level result. */
  weight: number
}

export type ScreenSessionSummary = {
  findings: ScreenFinding[]
  measured_count: number
  limitation_count: number
  asymmetry_count: number
  unmeasured_count: number
  /** True when too little was measured to reason from these screens at all. */
  insufficient: boolean
}

function describeValue(screen: MovementScreen, value: number): string {
  return screen.unit === 'degrees' ? `${Math.round(value)}°` : value.toFixed(2)
}

function sideLabel(side: ScreenSide): string {
  return side === 'single' ? '' : side === 'left' ? 'left ' : 'right '
}

/**
 * Converts raw screen measurements into findings the assessment can reason
 * from. This is deliberately mechanical: the numbers and the side-to-side
 * gaps are computed here, so the model receives measured facts to interpret
 * rather than being asked to infer a physical limitation from pitch footage.
 */
export function summarizeScreenSession(results: ScreenResult[]): ScreenSessionSummary {
  const findings: ScreenFinding[] = []
  let measured = 0

  for (const screen of MOVEMENT_SCREENS) {
    const forScreen = results.filter((item) => item.screen_id === screen.id)
    if (!forScreen.length) continue

    for (const result of forScreen) {
      if (result.value === null || !Number.isFinite(result.value)) {
        findings.push({
          screen_id: screen.id,
          screen_name: screen.name,
          kind: 'unmeasured',
          detail: `${screen.name}${result.side === 'single' ? '' : ` (${result.side} side)`} could not be measured from the video that was recorded.`,
          reliability: screen.reliability,
          weight: 0,
        })
        continue
      }
      measured += 1
      const classification = classifyScreenValue(screen, result.value)
      if (classification === 'limited' || classification === 'watch') {
        const severity = classification === 'limited' ? 'clearly limited' : 'below the range we would like to see'
        findings.push({
          screen_id: screen.id,
          screen_name: screen.name,
          kind: 'limitation',
          detail: `${screen.name}: ${sideLabel(result.side)}measured ${describeValue(screen, result.value)}, which is ${severity}.`,
          reliability: screen.reliability,
          weight: classification === 'limited' ? 3 : 2,
        })
      }
    }

    if (screen.bilateral) {
      const left = forScreen.find((item) => item.side === 'left')?.value ?? null
      const right = forScreen.find((item) => item.side === 'right')?.value ?? null
      const gap = asymmetryDegrees(left, right)
      if (gap !== null && gap >= NOTABLE_ASYMMETRY_DEGREES && screen.unit === 'degrees') {
        const shorter = (left as number) < (right as number) ? 'left' : 'right'
        findings.push({
          screen_id: screen.id,
          screen_name: screen.name,
          kind: 'asymmetry',
          detail: `${screen.name}: ${Math.round(gap)}° difference between sides (${shorter} side is the shorter one, ${describeValue(screen, Math.min(left as number, right as number))} versus ${describeValue(screen, Math.max(left as number, right as number))}).`,
          reliability: screen.reliability,
          weight: 2.5,
        })
      }
    }
  }

  findings.sort((a, b) => b.weight - a.weight)

  const limitation_count = findings.filter((item) => item.kind === 'limitation').length
  const asymmetry_count = findings.filter((item) => item.kind === 'asymmetry').length
  const unmeasured_count = findings.filter((item) => item.kind === 'unmeasured').length

  return {
    findings,
    measured_count: measured,
    limitation_count,
    asymmetry_count,
    unmeasured_count,
    // Fewer than half the expected measurements is not enough to base a
    // physical explanation on. The assessment must fall back to saying the
    // screens were incomplete rather than quietly reasoning from two numbers.
    insufficient: measured < 4,
  }
}

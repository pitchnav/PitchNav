import {
  MOVEMENT_SCREENS,
  getMovementScreen,
  classifyScreenValue,
  asymmetryDegrees,
  summarizeScreenSession,
  NOTABLE_ASYMMETRY_DEGREES,
  type LandmarkPoint,
  type ScreenResult,
} from './movement-screens'

/**
 * These tests check the screen math against hand-built geometry with a known
 * answer. The whole point of the movement screens is that they produce a
 * trustworthy number, so the angle math is verified rather than assumed.
 *
 * Coordinate convention matches MediaPipe normalized landmarks: x grows to the
 * right, y grows DOWNWARD, so "up" in the image is negative y.
 */

const LEFT = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 }
const RIGHT = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 }

/** Builds a landmark array where every referenced joint is fully visible. */
function frame(points: Record<number, [number, number]>): LandmarkPoint[] {
  const landmarks: LandmarkPoint[] = []
  for (const [index, [x, y]] of Object.entries(points)) {
    landmarks[Number(index)] = { x, y, visibility: 1 }
  }
  return landmarks
}

function screen(id: string) {
  const found = getMovementScreen(id)
  if (!found) throw new Error(`Missing screen ${id}`)
  return found
}

describe('active straight leg raise', () => {
  it('measures a 45 degree raise against the down leg', () => {
    const landmarks = frame({
      [LEFT.hip]: [0.5, 0.5],
      // Raised 45 degrees: equal rightward and upward travel from the hip.
      [LEFT.ankle]: [0.7, 0.3],
      [RIGHT.hip]: [0.5, 0.5],
      // Down leg lies flat along the floor.
      [RIGHT.ankle]: [0.9, 0.5],
    })
    const result = screen('active_straight_leg_raise').measure(landmarks, 'left')
    expect(result.value).toBeCloseTo(45, 1)
    expect(result.confidence).toBe(1)
  })

  it('measures a 90 degree raise', () => {
    const landmarks = frame({
      [LEFT.hip]: [0.5, 0.5],
      [LEFT.ankle]: [0.5, 0.2],
      [RIGHT.hip]: [0.5, 0.5],
      [RIGHT.ankle]: [0.9, 0.5],
    })
    expect(screen('active_straight_leg_raise').measure(landmarks, 'left').value).toBeCloseTo(90, 1)
  })

  it('is measured against the down leg so a tilted phone does not add range', () => {
    // Whole athlete rotated 10 degrees: a horizontal-referenced measurement
    // would report 55, but the down-leg reference should still read 45.
    const rotate = ([x, y]: [number, number]): [number, number] => {
      const angle = (10 * Math.PI) / 180
      const dx = x - 0.5
      const dy = y - 0.5
      return [0.5 + dx * Math.cos(angle) - dy * Math.sin(angle), 0.5 + dx * Math.sin(angle) + dy * Math.cos(angle)]
    }
    const landmarks = frame({
      [LEFT.hip]: rotate([0.5, 0.5]),
      [LEFT.ankle]: rotate([0.7, 0.3]),
      [RIGHT.hip]: rotate([0.5, 0.5]),
      [RIGHT.ankle]: rotate([0.9, 0.5]),
    })
    expect(screen('active_straight_leg_raise').measure(landmarks, 'left').value).toBeCloseTo(45, 1)
  })

  it('reports a problem instead of a number when joints are missing', () => {
    const landmarks = frame({ [LEFT.hip]: [0.5, 0.5] })
    const result = screen('active_straight_leg_raise').measure(landmarks, 'left')
    expect(result.value).toBeNull()
    expect(result.problem).toContain('not clearly visible')
  })
})

describe('overhead reach', () => {
  it('reads 180 degrees when the arm is straight overhead in line with the trunk', () => {
    const landmarks = frame({
      [RIGHT.hip]: [0.5, 0.7],
      [RIGHT.shoulder]: [0.5, 0.4],
      [RIGHT.wrist]: [0.5, 0.1],
    })
    expect(screen('overhead_reach').measure(landmarks, 'right').value).toBeCloseTo(180, 1)
  })

  it('reads 90 degrees when the arm is straight out in front', () => {
    const landmarks = frame({
      [RIGHT.hip]: [0.5, 0.7],
      [RIGHT.shoulder]: [0.5, 0.4],
      [RIGHT.wrist]: [0.8, 0.4],
    })
    expect(screen('overhead_reach').measure(landmarks, 'right').value).toBeCloseTo(90, 1)
  })
})

describe('ankle dorsiflexion', () => {
  it('reads 0 degrees with a vertical shin', () => {
    const landmarks = frame({
      [LEFT.ankle]: [0.5, 0.8],
      [LEFT.knee]: [0.5, 0.5],
    })
    expect(screen('ankle_dorsiflexion').measure(landmarks, 'left').value).toBeCloseTo(0, 1)
  })

  it('reads 30 degrees when the knee travels forward over the foot', () => {
    const landmarks = frame({
      [LEFT.ankle]: [0.5, 0.8],
      // 30 degrees off vertical, length 0.3
      [LEFT.knee]: [0.5 + 0.3 * Math.sin(Math.PI / 6), 0.8 - 0.3 * Math.cos(Math.PI / 6)],
    })
    expect(screen('ankle_dorsiflexion').measure(landmarks, 'left').value).toBeCloseTo(30, 1)
  })
})

describe('single-leg stance', () => {
  it('reads no pelvic tilt when the hips are level', () => {
    const landmarks = frame({
      [LEFT.hip]: [0.4, 0.5],
      [RIGHT.hip]: [0.6, 0.5],
    })
    expect(screen('single_leg_stance').measure(landmarks, 'single').value).toBeCloseTo(0, 2)
  })

  it('reports the magnitude of a dropped hip regardless of which side drops', () => {
    const dropRight = frame({
      [LEFT.hip]: [0.4, 0.5],
      [RIGHT.hip]: [0.6, 0.55],
    })
    const dropLeft = frame({
      [LEFT.hip]: [0.4, 0.55],
      [RIGHT.hip]: [0.6, 0.5],
    })
    const a = screen('single_leg_stance').measure(dropRight, 'single').value
    const b = screen('single_leg_stance').measure(dropLeft, 'single').value
    expect(a).toBeCloseTo(14.04, 1)
    expect(b).toBeCloseTo(14.04, 1)
  })
})

describe('seated trunk rotation', () => {
  it('returns the shoulder-to-hip width ratio for comparison against neutral', () => {
    const landmarks = frame({
      [LEFT.shoulder]: [0.35, 0.3],
      [RIGHT.shoulder]: [0.65, 0.3],
      [LEFT.hip]: [0.4, 0.6],
      [RIGHT.hip]: [0.6, 0.6],
    })
    // shoulder width 0.30, hip width 0.20
    expect(screen('seated_trunk_rotation').measure(landmarks, 'left').value).toBeCloseTo(1.5, 3)
  })

  it('is unaffected by how far the athlete sits from the camera', () => {
    const near = frame({
      [LEFT.shoulder]: [0.35, 0.3],
      [RIGHT.shoulder]: [0.65, 0.3],
      [LEFT.hip]: [0.4, 0.6],
      [RIGHT.hip]: [0.6, 0.6],
    })
    // Same posture, uniformly scaled to half size around the frame centre.
    const far = frame({
      [LEFT.shoulder]: [0.425, 0.4],
      [RIGHT.shoulder]: [0.575, 0.4],
      [LEFT.hip]: [0.45, 0.55],
      [RIGHT.hip]: [0.55, 0.55],
    })
    const a = screen('seated_trunk_rotation').measure(near, 'left').value
    const b = screen('seated_trunk_rotation').measure(far, 'left').value
    expect(a).toBeCloseTo(b as number, 3)
  })
})

describe('classification bands', () => {
  it('buckets a higher-is-better screen correctly', () => {
    const aslr = screen('active_straight_leg_raise')
    expect(classifyScreenValue(aslr, 80)).toBe('clear')
    expect(classifyScreenValue(aslr, 70)).toBe('clear')
    expect(classifyScreenValue(aslr, 60)).toBe('watch')
    expect(classifyScreenValue(aslr, 40)).toBe('limited')
    expect(classifyScreenValue(aslr, null)).toBe('unmeasured')
  })

  it('inverts the bands for a lower-is-better screen', () => {
    const stance = screen('single_leg_stance')
    expect(classifyScreenValue(stance, 2)).toBe('clear')
    expect(classifyScreenValue(stance, 5)).toBe('watch')
    expect(classifyScreenValue(stance, 9)).toBe('limited')
  })

  it('treats a non-finite measurement as unmeasured rather than clear', () => {
    expect(classifyScreenValue(screen('overhead_reach'), Number.NaN)).toBe('unmeasured')
  })
})

describe('asymmetry', () => {
  it('reports the absolute side-to-side gap', () => {
    expect(asymmetryDegrees(70, 52)).toBe(18)
    expect(asymmetryDegrees(52, 70)).toBe(18)
  })

  it('is null when either side was not measured', () => {
    expect(asymmetryDegrees(70, null)).toBeNull()
    expect(asymmetryDegrees(null, null)).toBeNull()
  })

  it('flags a gap that matters even when both sides sit inside the clear band', () => {
    const aslr = screen('active_straight_leg_raise')
    const left = 88
    const right = 72
    expect(classifyScreenValue(aslr, left)).toBe('clear')
    expect(classifyScreenValue(aslr, right)).toBe('clear')
    expect(asymmetryDegrees(left, right)).toBeGreaterThan(NOTABLE_ASYMMETRY_DEGREES)
  })
})

describe('shoulder lay-back', () => {
  it('reads 90 when the forearm points straight forward from the elbow', () => {
    const landmarks = frame({
      [RIGHT.elbow]: [0.5, 0.5],
      [RIGHT.wrist]: [0.8, 0.5],
    })
    expect(screen('shoulder_external_rotation').measure(landmarks, 'right').value).toBeCloseTo(90, 1)
  })

  it('increases as the hand rotates up and back', () => {
    const landmarks = frame({
      [RIGHT.elbow]: [0.5, 0.5],
      [RIGHT.wrist]: [0.7, 0.3],
    })
    const value = screen('shoulder_external_rotation').measure(landmarks, 'right').value as number
    expect(value).toBeGreaterThan(90)
    expect(value).toBeCloseTo(135, 1)
  })
})

describe('cross-body reach', () => {
  it('reads near 180 with the arm straight out to the side', () => {
    const landmarks = frame({
      [LEFT.shoulder]: [0.4, 0.4],
      [RIGHT.shoulder]: [0.6, 0.4],
      [RIGHT.elbow]: [0.9, 0.4],
    })
    expect(screen('cross_body_reach').measure(landmarks, 'right').value).toBeCloseTo(180, 1)
  })

  it('drops toward zero as the arm is pulled across the chest', () => {
    const landmarks = frame({
      [LEFT.shoulder]: [0.4, 0.4],
      [RIGHT.shoulder]: [0.6, 0.4],
      [RIGHT.elbow]: [0.3, 0.4],
    })
    expect(screen('cross_body_reach').measure(landmarks, 'right').value).toBeCloseTo(0, 1)
  })

  it('treats more reach across the body as better', () => {
    const item = screen('cross_body_reach')
    expect(item.higherIsBetter).toBe(false)
    expect(classifyScreenValue(item, 30)).toBe('clear')
    expect(classifyScreenValue(item, 80)).toBe('limited')
  })
})

describe('hip extension', () => {
  it('reads positive when the thigh hangs below level', () => {
    const landmarks = frame({
      [LEFT.hip]: [0.5, 0.5],
      // Knee sits below and forward of the hip.
      [LEFT.knee]: [0.7, 0.6],
    })
    const value = screen('hip_extension').measure(landmarks, 'left').value as number
    expect(value).toBeGreaterThan(0)
    expect(classifyScreenValue(screen('hip_extension'), value)).toBe('clear')
  })

  it('reads negative when the thigh stays propped above level', () => {
    const landmarks = frame({
      [LEFT.hip]: [0.5, 0.5],
      [LEFT.knee]: [0.7, 0.4],
    })
    const value = screen('hip_extension').measure(landmarks, 'left').value as number
    expect(value).toBeLessThan(0)
    expect(classifyScreenValue(screen('hip_extension'), value)).toBe('limited')
  })
})

describe('squat depth', () => {
  it('reports greater depth for a deeper squat', () => {
    const shallow = frame({
      [LEFT.hip]: [0.5, 0.4],
      [LEFT.knee]: [0.5, 0.6],
      [LEFT.ankle]: [0.5, 0.8],
      [RIGHT.hip]: [0.5, 0.4],
      [RIGHT.knee]: [0.5, 0.6],
      [RIGHT.ankle]: [0.5, 0.8],
    })
    const deep = frame({
      [LEFT.hip]: [0.55, 0.62],
      [LEFT.knee]: [0.4, 0.6],
      [LEFT.ankle]: [0.5, 0.8],
      [RIGHT.hip]: [0.55, 0.62],
      [RIGHT.knee]: [0.4, 0.6],
      [RIGHT.ankle]: [0.5, 0.8],
    })
    const shallowValue = screen('squat_depth').measure(shallow, 'single').value as number
    const deepValue = screen('squat_depth').measure(deep, 'single').value as number
    expect(shallowValue).toBeCloseTo(0, 1)
    expect(deepValue).toBeGreaterThan(shallowValue)
  })

  it('is not cross-checked against the delivery, since several joints produce it', () => {
    expect(screen('squat_depth').predictsMechanics).toBe(false)
  })
})

describe('session summary', () => {
  function result(over: Partial<ScreenResult> & Pick<ScreenResult, 'screen_id' | 'side' | 'value'>): ScreenResult {
    return {
      unit: 'degrees',
      confidence: 0.95,
      classification: 'clear',
      reliability: 'High',
      ...over,
    }
  }

  const fullyClear: ScreenResult[] = [
    result({ screen_id: 'active_straight_leg_raise', side: 'left', value: 80 }),
    result({ screen_id: 'active_straight_leg_raise', side: 'right', value: 78 }),
    result({ screen_id: 'overhead_reach', side: 'left', value: 172 }),
    result({ screen_id: 'overhead_reach', side: 'right', value: 170 }),
    result({ screen_id: 'ankle_dorsiflexion', side: 'left', value: 40 }),
    result({ screen_id: 'ankle_dorsiflexion', side: 'right', value: 39 }),
  ]

  it('reports no findings when everything measures clear and symmetric', () => {
    const summary = summarizeScreenSession(fullyClear)
    expect(summary.limitation_count).toBe(0)
    expect(summary.asymmetry_count).toBe(0)
    expect(summary.measured_count).toBe(6)
    expect(summary.insufficient).toBe(false)
  })

  it('surfaces a hard limitation with the measured number in plain language', () => {
    const summary = summarizeScreenSession([
      ...fullyClear.slice(2),
      result({ screen_id: 'active_straight_leg_raise', side: 'left', value: 42 }),
      result({ screen_id: 'active_straight_leg_raise', side: 'right', value: 44 }),
    ])
    const finding = summary.findings.find((item) => item.kind === 'limitation')
    expect(finding).toBeDefined()
    expect(finding?.detail).toContain('42°')
    expect(finding?.detail).toContain('clearly limited')
  })

  it('flags a side-to-side gap even when both sides are inside the clear band', () => {
    const summary = summarizeScreenSession([
      result({ screen_id: 'active_straight_leg_raise', side: 'left', value: 90 }),
      result({ screen_id: 'active_straight_leg_raise', side: 'right', value: 72 }),
      ...fullyClear.slice(2),
    ])
    expect(summary.limitation_count).toBe(0)
    const asym = summary.findings.find((item) => item.kind === 'asymmetry')
    expect(asym).toBeDefined()
    expect(asym?.detail).toContain('18°')
    expect(asym?.detail).toContain('right side is the shorter one')
  })

  it('names the shorter side correctly when the left side is shorter', () => {
    const summary = summarizeScreenSession([
      result({ screen_id: 'active_straight_leg_raise', side: 'left', value: 70 }),
      result({ screen_id: 'active_straight_leg_raise', side: 'right', value: 90 }),
      ...fullyClear.slice(2),
    ])
    expect(summary.findings.find((item) => item.kind === 'asymmetry')?.detail).toContain('left side is the shorter one')
  })

  it('records unmeasured screens instead of silently dropping them', () => {
    const summary = summarizeScreenSession([
      ...fullyClear,
      result({ screen_id: 'seated_hip_rotation', side: 'left', value: null, problem: 'not visible' }),
    ])
    expect(summary.unmeasured_count).toBe(1)
    expect(summary.findings.some((item) => item.kind === 'unmeasured')).toBe(true)
  })

  it('marks a nearly empty session insufficient so nothing is inferred from it', () => {
    const summary = summarizeScreenSession([
      result({ screen_id: 'active_straight_leg_raise', side: 'left', value: 80 }),
      result({ screen_id: 'active_straight_leg_raise', side: 'right', value: 78 }),
    ])
    expect(summary.insufficient).toBe(true)
  })

  it('ranks hard limitations above watch-level results', () => {
    const summary = summarizeScreenSession([
      result({ screen_id: 'overhead_reach', side: 'left', value: 150 }),
      result({ screen_id: 'ankle_dorsiflexion', side: 'left', value: 18 }),
      ...fullyClear.slice(0, 2),
      result({ screen_id: 'ankle_dorsiflexion', side: 'right', value: 38 }),
      result({ screen_id: 'overhead_reach', side: 'right', value: 168 }),
    ])
    const kinds = summary.findings.filter((item) => item.kind === 'limitation')
    expect(kinds[0].detail).toContain('Ankle')
  })

  it('carries the reliability tier through so a proxy is never shown as a hard number', () => {
    const summary = summarizeScreenSession([
      ...fullyClear,
      result({ screen_id: 'seated_hip_rotation', side: 'left', value: 15, reliability: 'Moderate' }),
      result({ screen_id: 'seated_hip_rotation', side: 'right', value: 38 }),
    ])
    const finding = summary.findings.find((item) => item.screen_id === 'seated_hip_rotation')
    expect(finding?.reliability).toBe('Moderate')
  })

  it('ignores results whose screen id is not in the catalogue', () => {
    const summary = summarizeScreenSession([
      ...fullyClear,
      result({ screen_id: 'not_a_real_screen', side: 'left', value: 1 }),
    ])
    expect(summary.measured_count).toBe(6)
  })
})

describe('screen catalogue integrity', () => {
  it('gives every screen the athlete-facing setup text it needs', () => {
    for (const item of MOVEMENT_SCREENS) {
      expect(item.id).toMatch(/^[a-z_]+$/)
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.whyItMatters.length).toBeGreaterThan(40)
      expect(item.cameraSetup.length).toBeGreaterThan(20)
      expect(item.position.length).toBeGreaterThan(20)
      expect(item.action.length).toBeGreaterThan(20)
      expect(item.reliabilityNote.length).toBeGreaterThan(20)
    }
  })

  it('keeps every moderate-reliability screen honest about its limits', () => {
    for (const item of MOVEMENT_SCREENS.filter((entry) => entry.reliability === 'Moderate')) {
      expect(item.reliabilityNote.toLowerCase()).toMatch(/not an exact|comparison|estimate/)
    }
  })

  it('keeps the athlete-facing battery to five screens', () => {
    // Deliberate product constraint: a long screening session gets abandoned
    // or rushed, and a rushed screen is worse than no screen.
    expect(MOVEMENT_SCREENS.filter((item) => item.core)).toHaveLength(5)
  })

  it('spans the kinetic chain rather than clustering on one region', () => {
    const core = MOVEMENT_SCREENS.filter((item) => item.core).map((item) => item.id)
    expect(core).toEqual(
      expect.arrayContaining([
        'active_straight_leg_raise',
        'ankle_dorsiflexion',
        'seated_hip_rotation',
        'seated_trunk_rotation',
        'shoulder_external_rotation',
      ]),
    )
  })

  it('gives every core screen a prediction to cross-check against the delivery', () => {
    for (const item of MOVEMENT_SCREENS.filter((entry) => entry.core)) {
      expect(item.predictsMechanics).toBe(true)
    }
  })

  it('uses unique ids', () => {
    const ids = MOVEMENT_SCREENS.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('orders every band so clear and limited are on the correct sides', () => {
    for (const item of MOVEMENT_SCREENS) {
      if (item.higherIsBetter) expect(item.band.clear).toBeGreaterThan(item.band.limited)
      else expect(item.band.clear).toBeLessThan(item.band.limited)
    }
  })
})

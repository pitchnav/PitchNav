import {
  buildConvergenceReport,
  screensWithoutPredictions,
  type DeliveryMetrics,
} from './screen-mechanics-convergence'
import type { ScreenResult } from './movement-screens'

/**
 * The central property under test: a prediction must be able to FAIL. A
 * convergence system that always agrees with itself is worse than no system,
 * because it produces confident agreement that proves nothing.
 */

function screen(screen_id: string, side: 'left' | 'right' | 'single', value: number | null): ScreenResult {
  return {
    screen_id,
    side,
    value,
    unit: 'degrees',
    confidence: 0.9,
    classification: 'clear',
    reliability: 'High',
  }
}

/** Enough clear screens to clear the "insufficient" gate. */
const FILLER: ScreenResult[] = [
  screen('overhead_reach', 'left', 172),
  screen('overhead_reach', 'right', 171),
  screen('ankle_dorsiflexion', 'left', 40),
  screen('ankle_dorsiflexion', 'right', 41),
]

const NEUTRAL_DELIVERY: DeliveryMetrics = {
  kneeChangeAfterStride: 15,
  trunkTiltChange: 10,
  elbowChange: 40,
  peakSeparation: 38,
  peakSeparationTime: 2.7,
  strideTime: 2.6,
}

describe('forward direction: limitation predicts a delivery signature', () => {
  it('confirms a tight upper back when separation is small', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', 20), screen('seated_trunk_rotation', 'right', 22)],
      { ...NEUTRAL_DELIVERY, peakSeparation: 18 },
    )
    const check = report.checks.find((item) => item.screen_id === 'seated_trunk_rotation')
    expect(check?.outcome).toBe('confirmed')
    expect(check?.observed).toContain('18°')
    expect(check?.implication).toContain('trained first')
  })

  it('confirms a tight upper back when the trunk opens before the front foot lands', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', 20), screen('seated_trunk_rotation', 'right', 22)],
      { ...NEUTRAL_DELIVERY, peakSeparation: 40, peakSeparationTime: 2.3, strideTime: 2.6 },
    )
    const check = report.checks.find((item) => item.screen_id === 'seated_trunk_rotation')
    expect(check?.outcome).toBe('confirmed')
    expect(check?.observed).toContain('before the front foot landed')
  })

  // The load-bearing test for the whole design.
  it('reports NOT SHOWING when the limitation is real but the delivery does not pay for it', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', 20), screen('seated_trunk_rotation', 'right', 22)],
      { ...NEUTRAL_DELIVERY, peakSeparation: 38, peakSeparationTime: 2.7, strideTime: 2.6 },
    )
    const check = report.checks.find((item) => item.screen_id === 'seated_trunk_rotation')
    expect(check?.outcome).toBe('not_showing')
    expect(check?.implication).toContain('lower priority')
  })

  it('never describes a limitation that is not showing as ruled out', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', 20), screen('seated_trunk_rotation', 'right', 22)],
      { ...NEUTRAL_DELIVERY, peakSeparation: 38 },
    )
    for (const check of report.checks) {
      expect(check.implication.toLowerCase()).not.toContain('ruled out')
      expect(check.implication.toLowerCase()).not.toContain('not a problem')
    }
  })

  it('returns inconclusive rather than forcing a verdict in the middle band', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', 20), screen('seated_trunk_rotation', 'right', 22)],
      { ...NEUTRAL_DELIVERY, peakSeparation: 27, peakSeparationTime: 2.7, strideTime: 2.6 },
    )
    expect(report.checks.find((item) => item.screen_id === 'seated_trunk_rotation')?.outcome).toBe('inconclusive')
  })

  it('returns inconclusive when the delivery measurement is missing entirely', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('single_leg_stance', 'left', 9), screen('single_leg_stance', 'right', 8)],
      { ...NEUTRAL_DELIVERY, trunkTiltChange: null },
    )
    expect(report.checks.find((item) => item.screen_id === 'single_leg_stance')?.outcome).toBe('inconclusive')
  })

  it('only predicts for screens that actually measured limited', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', 60), screen('seated_trunk_rotation', 'right', 58)],
      NEUTRAL_DELIVERY,
    )
    expect(report.checks.find((item) => item.screen_id === 'seated_trunk_rotation')).toBeUndefined()
  })

  it('confirms an ankle limitation when the lead knee keeps changing after landing', () => {
    const report = buildConvergenceReport(
      [
        screen('overhead_reach', 'left', 172),
        screen('overhead_reach', 'right', 171),
        screen('ankle_dorsiflexion', 'left', 18),
        screen('ankle_dorsiflexion', 'right', 19),
      ],
      { ...NEUTRAL_DELIVERY, kneeChangeAfterStride: 48 },
    )
    const check = report.checks.find((item) => item.screen_id === 'ankle_dorsiflexion')
    expect(check?.outcome).toBe('confirmed')
    expect(check?.observed).toContain('48°')
  })

  it('ranks confirmed findings above findings that are not showing', () => {
    const report = buildConvergenceReport(
      [
        screen('overhead_reach', 'left', 130),
        screen('overhead_reach', 'right', 132),
        screen('ankle_dorsiflexion', 'left', 18),
        screen('ankle_dorsiflexion', 'right', 19),
      ],
      { ...NEUTRAL_DELIVERY, kneeChangeAfterStride: 48, trunkTiltChange: 8 },
    )
    expect(report.checks[0].outcome).toBe('confirmed')
    expect(report.checks[report.checks.length - 1].outcome).toBe('not_showing')
  })
})

describe('reverse direction: a fault with no physical explanation', () => {
  it('flags a weak category that no measured limitation accounts for', () => {
    const report = buildConvergenceReport(FILLER, NEUTRAL_DELIVERY, [
      { category: 'Release Consistency', score: 2 },
    ])
    const fault = report.unexplained.find((item) => item.category === 'Release Consistency')
    expect(fault).toBeDefined()
    expect(fault?.implication).toContain('timing or skill')
    expect(fault?.implication).toContain('before adding more lifting')
  })

  it('does not flag a weak category that a measured limitation does explain', () => {
    const report = buildConvergenceReport(
      [
        screen('overhead_reach', 'left', 172),
        screen('overhead_reach', 'right', 171),
        screen('ankle_dorsiflexion', 'left', 18),
        screen('ankle_dorsiflexion', 'right', 19),
      ],
      { ...NEUTRAL_DELIVERY, kneeChangeAfterStride: 48 },
      [{ category: 'Front-Side Stability', score: 2 }],
    )
    expect(report.unexplained).toHaveLength(0)
  })

  it('leaves categories that scored acceptably alone', () => {
    const report = buildConvergenceReport(FILLER, NEUTRAL_DELIVERY, [{ category: 'Posture', score: 4 }])
    expect(report.unexplained).toHaveLength(0)
  })
})

describe('guards', () => {
  it('refuses to compare when too few screens were measured', () => {
    const report = buildConvergenceReport(
      [screen('seated_trunk_rotation', 'left', 20), screen('seated_trunk_rotation', 'right', 20)],
      NEUTRAL_DELIVERY,
    )
    expect(report.insufficient).toBe(true)
    expect(report.checks).toHaveLength(0)
  })

  it('refuses to compare when the delivery produced no usable measurements', () => {
    const report = buildConvergenceReport(FILLER, {
      kneeChangeAfterStride: null,
      trunkTiltChange: null,
      elbowChange: null,
      peakSeparation: null,
      peakSeparationTime: null,
      strideTime: null,
    })
    expect(report.insufficient).toBe(true)
  })

  it('ignores screens whose measurement failed', () => {
    const report = buildConvergenceReport(
      [...FILLER, screen('seated_trunk_rotation', 'left', null), screen('seated_trunk_rotation', 'right', null)],
      NEUTRAL_DELIVERY,
    )
    expect(report.checks.find((item) => item.screen_id === 'seated_trunk_rotation')).toBeUndefined()
  })

  it('has a prediction defined for every screen in the catalogue', () => {
    // A screen added without deciding what it predicts would silently never
    // participate in convergence.
    expect(screensWithoutPredictions()).toEqual([])
  })
})

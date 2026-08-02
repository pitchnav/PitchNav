import {
  calculateMetrics,
  buildCategoryFeedback,
  peakIsPhysicallySupported,
  motionTimeScale,
  type FrameMetrics,
  type ClipSummary,
} from './MotionAnalysisStudio'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * A pitcher throwing from the stretch/windup routinely has the lead ankle or
 * knee briefly hidden behind the trail leg or the mound. MediaPipe can still
 * report a high "visibility" for the 11 other tracked landmarks in that same
 * frame, so a blended 12-point average confidence stays well above threshold
 * even though the one landmark that determines the lead-knee angle is wrong.
 */
function landmarks(overrides: Record<number, Partial<NormalizedLandmark>>): NormalizedLandmark[] {
  const base: NormalizedLandmark = { x: 0.5, y: 0.5, z: 0, visibility: 0.9 }
  const points: NormalizedLandmark[] = []
  for (let i = 0; i <= 32; i++) points[i] = { ...base }
  for (const [index, value] of Object.entries(overrides)) {
    points[Number(index)] = { ...points[Number(index)], ...value }
  }
  return points
}

describe('calculateMetrics per-joint confidence', () => {
  it('flags low confidence on the lead knee even when the blended frame average is high', () => {
    // Right-handed pitcher: lead leg (the glove-side leg) is hip 23 / knee 25 / ankle 27.
    // Only the lead knee (25) is poorly tracked; everything else is clean.
    const frame = calculateMetrics(
      landmarks({
        25: { visibility: 0.1, x: 0.9, y: 0.1 }, // knee landmark jumps to a bad spot
      }),
      1.0,
      'right'
    )
    expect(frame.confidence).toBeGreaterThanOrEqual(0.45)
    expect(frame.leadKneeConfidence).toBeLessThan(0.45)
  })
})

describe('buildCategoryFeedback Front-Side Stability scoring', () => {
  const summary: ClipSummary = {
    frames: 3,
    averageConfidence: 0.85,
    elbowRange: null,
    kneeRange: null,
    trunkTiltRange: null,
    peakLegLiftTime: 0,
    widestStrideTime: 0.2,
    maxExternalRotationTime: null,
    ballReleaseTime: null,
    peakSeparation: null,
    peakSeparationTime: null,
    leadKneeChangeAfterStride: null,
    deliveryShapeValid: true,
  }

  function goodFrame(time: number, leadKnee: number): FrameMetrics {
    return {
      time,
      confidence: 0.85,
      throwingElbow: 90,
      leadKnee,
      trunkTilt: 20,
      hipShoulderSeparation: 10,
      strideWidth: 0.3,
      legLift: 0.1,
      leadKneeConfidence: 0.9,
      throwingElbowConfidence: 0.9,
      trunkConfidence: 0.9,
    }
  }

  it('does not let one frame with a badly-tracked knee tank the score', () => {
    const frames: FrameMetrics[] = [
      goodFrame(0.2, 150),
      goodFrame(0.3, 155),
      // High blended confidence (0.85, same as the good frames), but the
      // lead-knee landmark itself was garbage -- this is what actually
      // happens on real footage when the trail leg briefly occludes it.
      {
        ...goodFrame(0.4, 5), // physiologically implausible swing if trusted
        leadKneeConfidence: 0.1,
      },
    ]

    const feedback = buildCategoryFeedback(frames, summary)
    const frontSideStability = feedback.find((item) => item.category === 'Front-Side Stability')

    expect(frontSideStability?.score).toBeGreaterThanOrEqual(4)
  })

  // Real measurements, not invented ones: MediaPipe heavy-model output for a
  // minor-league pitcher's side-view delivery, frames from foot strike
  // through the finish. The frame at 7.71s is the failure this whole fix
  // exists for -- the lead leg was momentarily unreadable, MediaPipe
  // correctly reported near-zero confidence for it (0.03), and the angle it
  // produced (12.9 deg) is not a knee position that occurs in a delivery.
  // Including it swings the spread to 166.5 deg and forces the worst score.
  const realDelivery: Array<[number, number, number]> = [
    // [time, leadKnee, leadKneeConfidence]
    [7.34, 143.5, 0.95], [7.38, 133.3, 0.99], [7.42, 136.9, 1.0],
    [7.46, 160.1, 0.74], [7.50, 152.1, 0.83], [7.54, 179.0, 0.87],
    [7.58, 173.1, 0.94], [7.62, 175.1, 0.98], [7.66, 138.6, 0.60],
    [7.71, 12.9, 0.03], // unreadable leg, correctly low confidence
    [7.75, 178.8, 0.97], [7.83, 164.6, 0.29], [7.87, 155.7, 0.09],
    [7.91, 178.6, 0.99], [7.95, 174.3, 0.98], [7.99, 179.4, 0.96],
    [8.03, 178.4, 0.93], [8.07, 179.3, 0.77], [8.11, 174.7, 0.70],
  ]

  it('excludes the unreadable-leg frame from a real delivery instead of scoring 1', () => {
    const frames: FrameMetrics[] = realDelivery.map(([time, knee, conf]) => ({
      ...goodFrame(time, knee),
      leadKneeConfidence: conf,
    }))

    const feedback = buildCategoryFeedback(frames, summary)
    const frontSideStability = feedback.find((item) => item.category === 'Front-Side Stability')

    // Lands at 143.5 and folds no further than 133.3, so collapse is 10.2 deg
    // -> firm. If the 0.03-confidence frame were trusted the knee would read
    // 12.9 deg, a collapse of 130.6 deg -> worst band.
    expect(frontSideStability?.score).toBe(5)
  })

  it('does not score Upper-Half Timing from a whole-clip elbow range that every delivery saturates', () => {
    // Measured on the same real minor-league delivery: the throwing elbow
    // reads ~10 deg at the set position (hands together) and ~180 deg
    // extended through release. Every genuine pitch therefore produces a
    // whole-clip elbow spread near 180 deg, which the old thresholds
    // (35 / 65) score as 1. A metric that cannot return a good score for a
    // good delivery is not measuring anything, so it must not emit a
    // confident number.
    const realElbow = [10.2, 9.0, 11.3, 12.4, 75.8, 178.5, 174.2, 179.0, 176.1, 91.1, 147.1, 164.6]
    const frames: FrameMetrics[] = realElbow.map((elbow, i) => ({
      ...goodFrame(0.2 + i * 0.05, 150),
      throwingElbow: elbow,
    }))

    const feedback = buildCategoryFeedback(frames, summary)
    const upperHalf = feedback.find((item) => item.category === 'Upper-Half Timing')

    expect(upperHalf?.score).not.toBe(1)
    expect(upperHalf?.confidence).toBe('Low')
  })

  it('keeps the genuine deepest-flex frame, which is the signal for this category', () => {
    // The deepest lead-knee flexion after landing is exactly what
    // "front-side stability" is about, so a high-confidence extreme must
    // survive into the reported evidence. Percentile trimming would discard
    // 133.3 deg here even though MediaPipe reported it at 0.99 confidence,
    // and the collapse would be understated as 6.6 deg instead of 10.2.
    const frames: FrameMetrics[] = realDelivery.map(([time, knee, conf]) => ({
      ...goodFrame(time, knee),
      leadKneeConfidence: conf,
    }))

    const feedback = buildCategoryFeedback(frames, summary)
    const evidence = feedback.find((item) => item.category === 'Front-Side Stability')?.evidence ?? ''

    expect(evidence).toContain('10 more degrees')
  })
})

describe('phase-peak trustworthiness', () => {
  it('rejects a single-frame spike in the trunk-rotation signal', () => {
    // Real hip-shoulder separation from the minor-league clip, 30fps, one
    // value per frame. Trunk coil cannot physically go 7 -> 83 -> 8 degrees
    // in 66ms; from a side view the shoulder and hip lines are nearly
    // end-on to the lens, so this reading is landmark jitter. Treating its
    // maximum as "maximum external rotation" is what puts the MER phase
    // photo after the ball has already left the hand.
    const noisy = [4, 12, 10, 6, 1, 34, 74, 46, 4, 56, 38, 4, 6, 1, 34, 5, 7, 83, 8, 45, 38, 31, 20]
    const peakIndex = noisy.indexOf(83)

    expect(peakIsPhysicallySupported(noisy, peakIndex)).toBe(false)
  })

  it('accepts a peak whose neighbouring frames agree with it', () => {
    // What a real trunk-coil peak looks like when the landmarks track well:
    // it builds, crests, and collapses over several frames.
    const clean = [12, 20, 31, 44, 55, 62, 66, 64, 58, 47, 33, 19, 8]
    const peakIndex = clean.indexOf(66)

    expect(peakIsPhysicallySupported(clean, peakIndex)).toBe(true)
  })

  it('rejects a peak sitting at the very edge of the window, where nothing supports it', () => {
    const edge = [70, 12, 9, 8, 6, 5]

    expect(peakIsPhysicallySupported(edge, 0)).toBe(false)
  })
})

describe('trunk tilt geometry', () => {
  it('does not fold a trunk bent past horizontal back into a small angle', () => {
    // Deep follow-through: the shoulders are forward of AND below the hips.
    // Measured from vertical this is ~117 deg. Folding every angle into
    // 0-90 reports it as ~63 deg, so the most extreme posture in the whole
    // delivery reads as a moderate one.
    const frame = calculateMetrics(
      landmarks({
        11: { x: 0.70, y: 0.60 }, 12: { x: 0.70, y: 0.60 }, // shoulders
        23: { x: 0.50, y: 0.50 }, 24: { x: 0.50, y: 0.50 }, // hips
      }),
      1.0,
      'right'
    )
    expect(frame.trunkTilt).toBeGreaterThan(90)
  })

  it('still reports an upright trunk as near zero', () => {
    const frame = calculateMetrics(
      landmarks({
        11: { x: 0.50, y: 0.30 }, 12: { x: 0.50, y: 0.30 },
        23: { x: 0.50, y: 0.50 }, 24: { x: 0.50, y: 0.50 },
      }),
      1.0,
      'right'
    )
    expect(frame.trunkTilt).toBeLessThan(2)
  })
})

describe('structurally predetermined categories', () => {
  const base: ClipSummary = {
    frames: 10, averageConfidence: 0.9,
    elbowRange: null, kneeRange: null, trunkTiltRange: null,
    peakLegLiftTime: 0.5, widestStrideTime: 1.0,
    maxExternalRotationTime: null, ballReleaseTime: null,
    peakSeparation: null, peakSeparationTime: null,
    leadKneeChangeAfterStride: null, deliveryShapeValid: true,
  }
  function frame(time: number, over: Partial<FrameMetrics> = {}): FrameMetrics {
    return {
      time, confidence: 0.9, throwingElbow: 90, leadKnee: 150, trunkTilt: 20,
      hipShoulderSeparation: 10, strideWidth: 0.3, legLift: 0.1,
      leadKneeConfidence: 0.9, throwingElbowConfidence: 0.9, trunkConfidence: 0.9,
      ...over,
    }
  }

  it('does not hand out Lower-Half Sequencing 4 just because leg lift precedes the stride', () => {
    // peakLegLift is only ever searched among frames at or before the widest
    // stride, so the gap is >= 0 by construction and this category returned
    // 4 for every delivery ever analysed. A score every athlete gets is not
    // a measurement.
    const frames = [frame(0.5), frame(1.0), frame(1.5)]
    const lowerHalf = buildCategoryFeedback(frames, base)
      .find((item) => item.category === 'Lower-Half Sequencing')

    expect(lowerHalf?.confidence).toBe('Low')
  })

  it('does not score Posture from a whole-clip trunk range every delivery saturates', () => {
    // Real trunk tilt from the minor-league clip: upright at the set
    // position, tilted well over 40 deg through the finish. That span is
    // inherent to pitching, so a whole-clip range scored against 12/25
    // thresholds marks every athlete down.
    const realTrunk = [0.6, 0.5, 0.4, 1.4, 3.7, 11.2, 15.7, 16.4, 21.6, 32.0, 42.1, 49.3]
    const frames = realTrunk.map((trunkTilt, i) => frame(0.2 + i * 0.05, { trunkTilt }))
    const posture = buildCategoryFeedback(frames, base).find((item) => item.category === 'Posture')

    expect(posture?.score).not.toBe(1)
    expect(posture?.score).not.toBe(2)
    expect(posture?.confidence).toBe('Low')
  })
})

describe('Front-Side Stability distinguishes blocking from collapsing', () => {
  const base: ClipSummary = {
    frames: 10, averageConfidence: 0.9,
    elbowRange: null, kneeRange: null, trunkTiltRange: null,
    peakLegLiftTime: 0.2, widestStrideTime: 1.0,
    maxExternalRotationTime: null, ballReleaseTime: null,
    peakSeparation: null, peakSeparationTime: null,
    leadKneeChangeAfterStride: null, deliveryShapeValid: true,
  }
  function kneeFrames(values: number[]): FrameMetrics[] {
    return values.map((leadKnee, i) => ({
      time: 1.0 + i * 0.03, confidence: 0.9, throwingElbow: 90, leadKnee,
      trunkTilt: 20, hipShoulderSeparation: 10, strideWidth: 0.3, legLift: 0.1,
      leadKneeConfidence: 0.9, throwingElbowConfidence: 0.9, trunkConfidence: 0.9,
    }))
  }

  it('rewards a front leg that extends into a firm block', () => {
    // The real minor-league pitcher: lands at 143, gives 10 deg, then drives
    // up to 179. That extension IS the block -- good mechanics -- but the
    // old total-range metric charged him 46 deg for it.
    const stability = buildCategoryFeedback(kneeFrames([143, 138, 133, 145, 160, 175, 179]), base)
      .find((item) => item.category === 'Front-Side Stability')

    expect(stability?.score).toBeGreaterThanOrEqual(4)
  })

  it('penalises a front knee that collapses after landing', () => {
    // Lands at 165 and keeps folding to 110: the leg never becomes a post.
    const stability = buildCategoryFeedback(kneeFrames([165, 158, 146, 132, 120, 114, 110]), base)
      .find((item) => item.category === 'Front-Side Stability')

    expect(stability?.score).toBeLessThanOrEqual(2)
  })
})

describe('scores stay within what the measurement can resolve', () => {
  const base: ClipSummary = {
    frames: 10, averageConfidence: 0.9,
    elbowRange: null, kneeRange: null, trunkTiltRange: null,
    peakLegLiftTime: 0.2, widestStrideTime: 1.0,
    maxExternalRotationTime: null, ballReleaseTime: null,
    peakSeparation: null, peakSeparationTime: null,
    leadKneeChangeAfterStride: null, deliveryShapeValid: true,
  }
  function collapseOf(values: number[]) {
    const frames: FrameMetrics[] = values.map((leadKnee, i) => ({
      time: 1.0 + i * 0.03, confidence: 0.9, throwingElbow: 90, leadKnee,
      trunkTilt: 20, hipShoulderSeparation: 10, strideWidth: 0.3, legLift: 0.1,
      leadKneeConfidence: 0.9, throwingElbowConfidence: 0.9, trunkConfidence: 0.9,
    }))
    return buildCategoryFeedback(frames, base).find((i) => i.category === 'Front-Side Stability')?.score
  }

  // Measured noise floor: with the leg motionless and every landmark above
  // 0.9 confidence, the knee angle still reads 179.2 +/- 1.0 deg with a
  // 4.5 deg spread across 22 frames. Collapse is a difference of two
  // extremes, so it carries roughly +/- 5 deg of noise. Bands must therefore
  // be far enough apart that a boundary is not decided by jitter.
  it('does not split two deliveries whose collapse differs by less than the noise', () => {
    expect(collapseOf([150, 146, 145])).toBe(collapseOf([150, 143, 142]))
  })

  it('still separates a firm front leg from one that clearly folds', () => {
    expect(collapseOf([150, 145, 148])).toBeGreaterThan(collapseOf([150, 110, 108]) as number)
  })
})

describe('slow-motion timelines', () => {
  it('stretches real-world timings by the slow-motion factor', () => {
    // An iPhone Slo-mo export captured at 240 FPS is written as a ~30 FPS
    // timeline, so one second of file is one eighth of a second of pitching.
    expect(motionTimeScale(240, 30)).toBe(8)
    expect(motionTimeScale(120, 30)).toBe(4)
  })

  it('leaves real-time video alone', () => {
    expect(motionTimeScale(30, 30)).toBe(1)
    expect(motionTimeScale(60, 60)).toBe(1)
  })

  it('falls back to real time when the rates are unknown or implausible', () => {
    expect(motionTimeScale(null, 30)).toBe(1)
    expect(motionTimeScale(240, null)).toBe(1)
    expect(motionTimeScale(240, 0)).toBe(1)
    // Never shrink: a timeline faster than capture would squash the windows.
    expect(motionTimeScale(30, 240)).toBe(1)
  })
})

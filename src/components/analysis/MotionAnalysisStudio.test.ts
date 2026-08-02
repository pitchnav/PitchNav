import {
  calculateMetrics,
  buildCategoryFeedback,
  peakIsPhysicallySupported,
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

    // Confidence-filtered spread is 179.4 - 133.3 = 46.1 deg -> score 3.
    // Unfiltered it would be 166.5 deg -> score 1.
    expect(frontSideStability?.score).toBe(3)
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
    // 133.3 deg here even though MediaPipe reported it at 0.99 confidence.
    const frames: FrameMetrics[] = realDelivery.map(([time, knee, conf]) => ({
      ...goodFrame(time, knee),
      leadKneeConfidence: conf,
    }))

    const feedback = buildCategoryFeedback(frames, summary)
    const evidence = feedback.find((item) => item.category === 'Front-Side Stability')?.evidence ?? ''

    expect(evidence).toContain('46 degrees')
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

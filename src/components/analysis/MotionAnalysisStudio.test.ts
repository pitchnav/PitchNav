import { calculateMetrics, buildCategoryFeedback, type FrameMetrics, type ClipSummary } from './MotionAnalysisStudio'
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
})

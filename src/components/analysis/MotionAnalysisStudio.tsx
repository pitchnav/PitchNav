'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Download, Pause, Play, RotateCcw, Upload, Video } from 'lucide-react'
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision'
import { createClient } from '@/lib/supabase/client'
import { buildBaseballPerformancePlan } from '@/lib/performance-plan'
import { buildEightWeekThrowingPlan } from '@/lib/throwing-plan'

type Handedness = 'right' | 'left'
type SelectionMode = 'calibrationA' | 'calibrationB' | 'ballStart' | 'ballEnd' | null
type VideoPoint = { x: number; y: number; time: number }

type FrameMetrics = {
  time: number
  confidence: number
  throwingElbow: number | null
  leadKnee: number | null
  trunkTilt: number | null
  hipShoulderSeparation: number | null
  strideWidth: number | null
  legLift: number | null
}

type ClipSummary = {
  frames: number
  averageConfidence: number
  elbowRange: [number, number] | null
  kneeRange: [number, number] | null
  trunkTiltRange: [number, number] | null
  peakLegLiftTime: number | null
  widestStrideTime: number | null
  maxExternalRotationTime: number | null
  ballReleaseTime: number | null
  // Peak leg-lift and widest-stride are each just the single frame with the
  // highest value for that joint across the whole clip. On one continuous
  // pitch that's a reasonable proxy for those real phases. On anything else
  // in frame (walking, warming up, multiple pitches), the global max can land
  // anywhere -- including near the very end -- so this checks that the two
  // detected moments actually fall in a plausible single-delivery order and
  // position before any score gets built from them.
  deliveryShapeValid: boolean
}

type CategoryFeedback = {
  category: string
  score: number
  confidence: 'Low' | 'Moderate' | 'High'
  strength: string
  development: string
  evidence: string
}

const CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29],
  [29, 31], [27, 31], [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
]

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function angle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark) {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  if (!denominator) return null
  const cosine = clamp((ab.x * cb.x + ab.y * cb.y) / denominator, -1, 1)
  return (Math.acos(cosine) * 180) / Math.PI
}

function lineAngle(a: NormalizedLandmark, b: NormalizedLandmark) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

function normalizeAcuteAngle(value: number) {
  let result = Math.abs(value) % 180
  if (result > 90) result = 180 - result
  return result
}

function range(values: Array<number | null>): [number, number] | null {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (!valid.length) return null
  return [Math.min(...valid), Math.max(...valid)]
}

function buildCategoryFeedback(frames: FrameMetrics[], summary: ClipSummary): CategoryFeedback[] {
  const spread = (values: Array<number | null>) => {
    const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
    if (valid.length < 2) return 0
    return Math.max(...valid) - Math.min(...valid)
  }
  // A single low-confidence frame (motion blur, brief occlusion — common in
  // real phone video) can misplace a joint and swing its angle estimate to
  // an extreme. Spread is just max-min, so one bad frame among many good
  // ones would otherwise tank a score that should reflect the real pitch.
  // The displayed elbow/knee/trunk ranges elsewhere already filter on this
  // same confidence threshold; the scorecard needs the same filter.
  const reliableFrames = frames.filter((frame) => frame.confidence >= 0.45)
  // Pose-tracking confidence only measures whether a body was visible and
  // trackable -- it says nothing about whether the clip actually shows one
  // complete pitching delivery. A clear walking video scores High confidence
  // here just as easily as a real pitch, so the shape check caps confidence
  // separately from tracking quality.
  const quality: CategoryFeedback['confidence'] = !summary.deliveryShapeValid
    ? 'Low'
    : summary.averageConfidence >= 0.8 ? 'High' : summary.averageConfidence >= 0.6 ? 'Moderate' : 'Low'
  const peak = summary.peakLegLiftTime
  const stride = summary.widestStrideTime
  const sequenceGap = peak !== null && stride !== null ? stride - peak : null
  const trunkSpread = spread(reliableFrames.map((frame) => frame.trunkTilt))
  const kneeSpread = spread(reliableFrames.filter((frame) => stride === null || frame.time >= stride).map((frame) => frame.leadKnee))
  const elbowSpread = spread(reliableFrames.map((frame) => frame.throwingElbow))
  const score = (value: number, good: number, fair: number) =>
    value <= good ? 5 : value <= fair ? 4 : value <= fair * 1.5 ? 3 : value <= fair * 2 ? 2 : 1

  return [
    {
      category: 'Direction',
      score: 3,
      confidence: 'Low',
      strength: 'Your full body stayed in the frame from leg lift through the finish. That gives us a clean look at the length and timing of your move down the mound.',
      development: 'This side view does not clearly show if your front foot drifts left or right of the target line. Do not force your stride to change from this score alone. At the two-week check, use a visible tape line from the rubber toward the target so your landing direction is easier to compare.',
      evidence: 'The lead foot is visible when it lands, but the target line is not marked in the video. That means we can see the stride happen without pretending we know the exact amount of side-to-side drift.',
    },
    {
      category: 'Lower-Half Sequencing',
      score: !summary.deliveryShapeValid ? 3 : sequenceGap !== null && sequenceGap > 0 ? 4 : 2,
      confidence: quality,
      strength: !summary.deliveryShapeValid
        ? 'A body stayed visible through the clip, so pose tracking had something to follow.'
        : sequenceGap !== null && sequenceGap > 0
          ? 'Your leg lift reached its highest point before your stride opened all the way. That order gives your lower body time to start moving before the rest of the pitch speeds up.'
          : 'Your hips, knees, and feet stayed visible through most of the delivery. That makes it possible to find the timing problem once the key moments are clearer.',
      development: !summary.deliveryShapeValid
        ? 'Automatic timing detection could not confirm a single, clean leg-lift-to-stride sequence in this clip. This usually means the video shows more than one motion (for example, walking, warming up, or several pitches) rather than one continuous delivery. A coach must watch the source video and confirm it shows one complete pitch before trusting any score below.'
        : sequenceGap !== null && sequenceGap > 0
          ? 'The order is good, but you still need to prove that it stays the same at higher effort. On the next check, compare the time from peak leg lift to foot contact on several pitches. If that time changes a lot, slow the drill down and make the move repeatable before adding intent.'
          : 'The video did not give us two clear timing points, so we cannot tell whether your lower half starts in the right order. Record your full body in brighter light and keep both feet in the frame. We need to see peak leg lift and front-foot landing in the same pitch before changing your sequence.',
      evidence: !summary.deliveryShapeValid
        ? `The detected peak leg-lift moment (${formatTime(peak)}) and widest-stride moment (${formatTime(stride)}) do not fall in a plausible single-delivery order and position within this clip. Treat every score in this report as unverified until a coach confirms the source video shows one complete pitch.`
        : sequenceGap === null
          ? 'Peak leg lift or the widest part of the stride could not be found clearly. Without both moments, the timing gap cannot be measured honestly.'
          : `The video shows ${sequenceGap.toFixed(2)} seconds from peak leg lift to the widest part of the stride. Use the same camera angle and effort at each two-week check so that number can be compared fairly.`,
    },
    {
      category: 'Upper-Half Timing',
      score: score(elbowSpread, 35, 65),
      confidence: quality,
      strength: 'Your throwing shoulder, elbow, and wrist stayed visible through the arm action. That lets us follow the arm from hand break into the forward throw instead of guessing through a blocked frame.',
      development: elbowSpread > 65
        ? 'Your elbow position changes a lot during this pitch, which can make the arm arrive late or early when the front foot lands. Work on a smooth hand break and let the arm move with the lower body instead of yanking it into place. Check the arm position again at front-foot landing in two weeks.'
        : 'Your arm path looks controlled in this clip, but one pitch does not prove the timing repeats. Keep the hand break smooth and avoid forcing a certain elbow height. Use the two-week video check to see if the arm arrives in the same place when the front foot lands.',
      evidence: `The estimated throwing-elbow range in this clip is ${Math.round(elbowSpread)} degrees. This is a video estimate used to compare your own follow-ups, not a perfect joint measurement.`,
    },
    {
      category: 'Front-Side Stability',
      score: score(kneeSpread, 18, 35),
      confidence: quality,
      strength: kneeSpread <= 35
        ? 'Your front knee stayed fairly controlled after the stride opened. That gives your body a steadier base as the chest and throwing arm move forward.'
        : 'Your front leg stayed visible from landing through the finish. We can see where the leg starts to give way instead of losing it outside the frame.',
      development: kneeSpread > 35
        ? 'Your front knee keeps changing after landing instead of giving you a steady base. That can make your chest move around the front leg instead of over it. Use controlled lead-leg holds and stop before the knee locks hard or causes pain.'
        : 'Your front leg holds up well in this pitch, but it still needs to repeat when effort goes up. Keep a firm base without snapping the knee straight. Compare the knee from landing through release at the next two-week check.',
      evidence: `The estimated front-knee change after the stride is ${Math.round(kneeSpread)} degrees. The important part is whether this range gets smaller and more repeatable in the same camera setup.`,
    },
    {
      category: 'Posture',
      score: score(trunkSpread, 12, 25),
      confidence: quality,
      strength: trunkSpread <= 25
        ? 'Your head and chest stayed fairly controlled during this pitch. You did not make a large early lean just to create a lower arm slot.'
        : 'Your head, shoulders, and hips stayed in the frame through the finish. That lets us see when the upper body begins to tip instead of guessing from one freeze-frame.',
      development: trunkSpread > 25
        ? 'Your upper body changes angle too much during the pitch, and the biggest lean needs to happen later and under control. Keep your head moving with your hips instead of falling away early. Use the wall posture drill at low speed, then test the same move in a bullpen.'
        : 'Your posture is controlled in this clip, but the next job is keeping it at game speed. Do not try to stay stiff and upright. Let the chest move forward after the front foot lands while the head stays balanced over the base.',
      evidence: `The estimated trunk-angle change in this clip is ${Math.round(trunkSpread)} degrees. Compare that range only against videos recorded from the same angle and at a similar effort.`,
    },
    {
      category: 'Release Consistency',
      score: 3,
      confidence: 'Low',
      strength: 'Your throwing hand stays visible as the ball reaches the release area. That gives us one clear release window to use as the starting point for future comparisons.',
      development: 'One pitch cannot show whether your release is consistent, so this part is not proven yet. At the two-week check, record at least three pitches without moving the camera. We want the hand and ball to pass through nearly the same window without you steering the ball.',
      evidence: 'This review contains one usable release, not a group of repeated pitches. Consistency means the same pattern shows up several times, so the next video must give us more than one example.',
    },
  ]
}

function formatAngle(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}°`
}

function formatTime(value: number | null) {
  if (value === null) return '—'
  return `${value.toFixed(2)}s`
}

function qualityLabel(value: number) {
  return value >= 0.8 ? 'High' : value >= 0.6 ? 'Moderate' : 'Limited'
}

function describeSupabaseError(reason: unknown): string {
  console.error('Motion review save failed', reason)
  // Errors thrown deliberately in this file (cooldown messages, missing
  // phase frames, etc.) already have a specific, human-readable message —
  // showing it instead of a generic fallback is the difference between
  // "Could not save your review" and "your membership allows one analysis
  // every two weeks, next available 7/29".
  if (reason instanceof Error && reason.message) return reason.message
  if (reason && typeof reason === 'object' && 'message' in reason && typeof (reason as { message?: unknown }).message === 'string') {
    return (reason as { message: string }).message
  }
  return 'Could not save your review. Please try again.'
}

function isMissingRpcError(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') return false
  const error = reason as { code?: string; message?: string }
  return error.code === 'PGRST202'
    || error.code === '42883'
    || error.message?.includes('Could not find the function') === true
}

function calculateMetrics(
  landmarks: NormalizedLandmark[],
  time: number,
  handedness: Handedness
): FrameMetrics {
  const throwing = handedness === 'right'
    ? { shoulder: 12, elbow: 14, wrist: 16 }
    : { shoulder: 11, elbow: 13, wrist: 15 }
  const lead = handedness === 'right'
    ? { hip: 23, knee: 25, ankle: 27 }
    : { hip: 24, knee: 26, ankle: 28 }

  const tracked = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
  const confidence = tracked.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / tracked.length
  const shoulderMid = {
    x: (landmarks[11].x + landmarks[12].x) / 2,
    y: (landmarks[11].y + landmarks[12].y) / 2,
    z: 0,
    visibility: Math.min(landmarks[11].visibility ?? 0, landmarks[12].visibility ?? 0),
  }
  const hipMid = {
    x: (landmarks[23].x + landmarks[24].x) / 2,
    y: (landmarks[23].y + landmarks[24].y) / 2,
    z: 0,
    visibility: Math.min(landmarks[23].visibility ?? 0, landmarks[24].visibility ?? 0),
  }
  const trunkFromVertical = normalizeAcuteAngle(lineAngle(hipMid, shoulderMid) + 90)
  const shoulderLine = lineAngle(landmarks[11], landmarks[12])
  const hipLine = lineAngle(landmarks[23], landmarks[24])
  const separation = normalizeAcuteAngle(shoulderLine - hipLine)
  const ankleDistance = Math.abs(landmarks[27].x - landmarks[28].x)
  const elevatedKnee = Math.min(landmarks[25].y, landmarks[26].y)
  const hipHeight = (landmarks[23].y + landmarks[24].y) / 2

  return {
    time,
    confidence,
    throwingElbow: angle(landmarks[throwing.shoulder], landmarks[throwing.elbow], landmarks[throwing.wrist]),
    leadKnee: angle(landmarks[lead.hip], landmarks[lead.knee], landmarks[lead.ankle]),
    trunkTilt: trunkFromVertical,
    hipShoulderSeparation: separation,
    strideWidth: ankleDistance,
    legLift: hipHeight - elevatedKnee,
  }
}

function drawAnatomicalSkeleton(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number
) {
  const point = (index: number) => ({
    x: landmarks[index].x * width,
    y: landmarks[index].y * height,
    visibility: landmarks[index].visibility ?? 0,
  })
  const midpoint = (a: ReturnType<typeof point>, b: ReturnType<typeof point>) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  })
  const distance = (a: ReturnType<typeof point>, b: ReturnType<typeof point>) => Math.hypot(a.x - b.x, a.y - b.y)
  const shoulders = [point(11), point(12)]
  const hips = [point(23), point(24)]
  const shoulderMid = midpoint(shoulders[0], shoulders[1])
  const hipMid = midpoint(hips[0], hips[1])
  const scale = Math.max(0.75, Math.min(1.35, Math.min(width, height) / 650))

  // A single tapered long bone: two rounded end-caps (epiphyses) joined by a
  // narrower shaft, filled with a soft glow, so limbs read as real bones
  // instead of a thin wireframe outline.
  const longBone = (startIndex: number, endIndex: number, capScale = 1) => {
    const start = point(startIndex)
    const end = point(endIndex)
    if (Math.min(start.visibility, end.visibility) < 0.45) return
    const length = Math.max(1, distance(start, end))
    const capRadius = Math.max(2.6, Math.min(length * 0.17, scale * 11)) * capScale
    const shaftHalf = capRadius * 0.36
    const ux = (end.x - start.x) / length
    const uy = (end.y - start.y) / length
    const px = -uy
    const py = ux
    const inset = capRadius * 0.6
    const s = { x: start.x + ux * inset, y: start.y + uy * inset }
    const e = { x: end.x - ux * inset, y: end.y - uy * inset }
    context.save()
    context.shadowColor = 'rgba(125, 211, 252, 0.5)'
    context.shadowBlur = scale * 5
    const grad = context.createLinearGradient(start.x, start.y, end.x, end.y)
    grad.addColorStop(0, 'rgba(248, 250, 252, 0.97)')
    grad.addColorStop(0.5, 'rgba(220, 229, 240, 0.86)')
    grad.addColorStop(1, 'rgba(248, 250, 252, 0.97)')
    context.fillStyle = grad
    context.beginPath()
    context.moveTo(s.x + px * shaftHalf, s.y + py * shaftHalf)
    context.lineTo(e.x + px * shaftHalf, e.y + py * shaftHalf)
    context.lineTo(e.x - px * shaftHalf, e.y - py * shaftHalf)
    context.lineTo(s.x - px * shaftHalf, s.y - py * shaftHalf)
    context.closePath()
    context.fill()
    const capAngle = Math.atan2(uy, ux) + Math.PI / 2
    context.beginPath()
    context.ellipse(start.x, start.y, capRadius, capRadius * 0.8, capAngle, 0, Math.PI * 2)
    context.fill()
    context.beginPath()
    context.ellipse(end.x, end.y, capRadius, capRadius * 0.8, capAngle, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.strokeStyle = 'rgba(51, 75, 105, 0.4)'
    context.lineWidth = Math.max(0.6, scale * 0.5)
    context.stroke()
    context.restore()
  }

  // A glowing ball-joint at each major articulation point.
  const joint = (index: number, radius = 1) => {
    const p = point(index)
    if (p.visibility < 0.45) return
    const jointRadius = Math.max(3, scale * 5.2 * radius)
    context.save()
    context.shadowColor = 'rgba(125, 211, 252, 0.75)'
    context.shadowBlur = scale * 8
    const grad = context.createRadialGradient(
      p.x - jointRadius * 0.3, p.y - jointRadius * 0.3, jointRadius * 0.1,
      p.x, p.y, jointRadius
    )
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
    grad.addColorStop(0.55, 'rgba(191, 219, 254, 0.9)')
    grad.addColorStop(1, 'rgba(96, 165, 250, 0.55)')
    context.fillStyle = grad
    context.beginPath()
    context.arc(p.x, p.y, jointRadius, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  // Skull, sized from the detected shoulder width so it remains visually
  // stable when facial landmarks are partially hidden.
  const nose = point(0)
  const earLeft = point(7)
  const earRight = point(8)
  const headCenter = midpoint(earLeft, earRight)
  if (nose.visibility >= 0.45 || headCenter.visibility >= 0.45) {
    const shoulderWidth = distance(shoulders[0], shoulders[1])
    const bodyReference = distance(shoulderMid, hipMid)
    const headWidth = Math.max(distance(earLeft, earRight) * 1.45, shoulderWidth * 0.3, bodyReference * 0.24)
    const headHeight = headWidth * 1.22
    context.save()
    context.translate(headCenter.x, headCenter.y)
    context.rotate(Math.atan2(earRight.y - earLeft.y, earRight.x - earLeft.x))
    context.shadowColor = 'rgba(125, 211, 252, 0.45)'
    context.shadowBlur = scale * 6
    const skullGrad = context.createRadialGradient(
      -headWidth * 0.1, -headHeight * 0.15, headWidth * 0.1,
      0, 0, headWidth * 0.6
    )
    skullGrad.addColorStop(0, 'rgba(248, 250, 252, 0.95)')
    skullGrad.addColorStop(1, 'rgba(203, 213, 225, 0.55)')
    context.fillStyle = skullGrad
    context.beginPath()
    context.ellipse(0, -headHeight * 0.04, headWidth / 2, headHeight * 0.47, 0, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = 'rgba(51, 75, 105, 0.45)'
    context.lineWidth = Math.max(0.7, scale * 0.6)
    context.stroke()
    // Mandible and a short facial plane make the head read as a side-view
    // anatomical reference without inventing facial detail.
    const faceDirection = nose.x >= headCenter.x ? 1 : -1
    context.beginPath()
    context.moveTo(faceDirection * headWidth * 0.46, -headHeight * 0.08)
    context.lineTo(faceDirection * headWidth * 0.56, headHeight * 0.05)
    context.lineTo(faceDirection * headWidth * 0.36, headHeight * 0.26)
    context.quadraticCurveTo(0, headHeight * 0.47, -faceDirection * headWidth * 0.24, headHeight * 0.25)
    context.stroke()
    // A small dark eye socket reads as an anatomical reference point.
    context.shadowBlur = 0
    context.fillStyle = 'rgba(10, 16, 28, 0.7)'
    context.beginPath()
    context.ellipse(faceDirection * headWidth * 0.16, -headHeight * 0.1, headWidth * 0.1, headHeight * 0.08, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  if (shoulderMid.visibility >= 0.45 && hipMid.visibility >= 0.45) {
    const torsoLength = distance(shoulderMid, hipMid)
    const neckTop = { x: headCenter.x, y: headCenter.y + torsoLength * 0.1, visibility: headCenter.visibility }

    // Spine: a stacked column of short vertebral discs rather than a single
    // rod or a stack of closed rings, so it reads as a vertebral column
    // instead of a floating line or a coiled spring.
    context.save()
    context.shadowColor = 'rgba(125, 211, 252, 0.4)'
    context.shadowBlur = scale * 3
    context.fillStyle = 'rgba(226, 232, 240, 0.85)'
    context.strokeStyle = 'rgba(51, 75, 105, 0.35)'
    context.lineWidth = Math.max(0.5, scale * 0.4)
    const vertebraeCount = 8
    for (let i = 0; i <= vertebraeCount; i += 1) {
      const t = i / vertebraeCount
      const x = neckTop.x + (hipMid.x - neckTop.x) * t
      const y = neckTop.y + (hipMid.y - neckTop.y) * t
      const discRadius = Math.max(1.6, scale * 2.1)
      context.beginPath()
      context.ellipse(x, y, discRadius, discRadius * 0.8, 0, 0, Math.PI * 2)
      context.fill()
      context.stroke()
    }
    context.restore()

    // Rib cage: open arcs that curve from the spine around to a front
    // sternum bar. A closed ring at each height reads as a coiled spring, so
    // each rib only sweeps the front and sides of the torso.
    const shoulderWidth = Math.max(distance(shoulders[0], shoulders[1]), torsoLength * 0.34)
    const torsoAngle = Math.atan2(hipMid.y - shoulderMid.y, hipMid.x - shoulderMid.x) - Math.PI / 2
    context.save()
    context.translate((shoulderMid.x + hipMid.x) / 2, (shoulderMid.y + hipMid.y) / 2)
    context.rotate(torsoAngle)
    context.shadowColor = 'rgba(125, 211, 252, 0.35)'
    context.shadowBlur = scale * 3
    context.strokeStyle = 'rgba(226, 232, 240, 0.82)'
    context.lineCap = 'round'
    const ribCount = 7
    for (let rib = 0; rib < ribCount; rib += 1) {
      const t = rib / (ribCount - 1)
      const y = -torsoLength * 0.36 + t * torsoLength * 0.5
      const taper = 1 - Math.abs(t - 0.45) * 0.5
      const rx = shoulderWidth * 0.56 * taper
      const ry = torsoLength * 0.09
      context.lineWidth = Math.max(0.7, scale * 0.72 * taper)
      context.beginPath()
      context.ellipse(0, y, rx, ry, 0, Math.PI * 0.06, Math.PI * 0.94)
      context.stroke()
    }
    // Sternum.
    context.lineWidth = Math.max(0.85, scale * 0.85)
    context.beginPath()
    context.moveTo(0, -torsoLength * 0.38)
    context.lineTo(0, torsoLength * 0.12)
    context.stroke()
    context.restore()

    // Pelvis: filled ilium wings meeting a sacrum, so it reads as a solid
    // basin rather than a thin outline. Sized to stay visible around the hip
    // ball-joints drawn on top of it later, instead of being swallowed by them.
    context.save()
    context.shadowColor = 'rgba(125, 211, 252, 0.4)'
    context.shadowBlur = scale * 4
    const pelvisHalfWidth = Math.max(distance(hips[0], hips[1]) / 2 + scale * 7, torsoLength * 0.22)
    const pelvisGrad = context.createLinearGradient(hipMid.x - pelvisHalfWidth, hipMid.y, hipMid.x + pelvisHalfWidth, hipMid.y)
    pelvisGrad.addColorStop(0, 'rgba(226, 232, 240, 0.75)')
    pelvisGrad.addColorStop(0.5, 'rgba(248, 250, 252, 0.92)')
    pelvisGrad.addColorStop(1, 'rgba(226, 232, 240, 0.75)')
    context.fillStyle = pelvisGrad
    context.beginPath()
    context.moveTo(hipMid.x - pelvisHalfWidth, hipMid.y - torsoLength * 0.07)
    context.quadraticCurveTo(hipMid.x - pelvisHalfWidth * 1.08, hipMid.y + torsoLength * 0.08, hipMid.x - pelvisHalfWidth * 0.5, hipMid.y + torsoLength * 0.17)
    context.quadraticCurveTo(hipMid.x, hipMid.y + torsoLength * 0.24, hipMid.x + pelvisHalfWidth * 0.5, hipMid.y + torsoLength * 0.17)
    context.quadraticCurveTo(hipMid.x + pelvisHalfWidth * 1.08, hipMid.y + torsoLength * 0.08, hipMid.x + pelvisHalfWidth, hipMid.y - torsoLength * 0.07)
    context.quadraticCurveTo(hipMid.x, hipMid.y - torsoLength * 0.02, hipMid.x - pelvisHalfWidth, hipMid.y - torsoLength * 0.07)
    context.closePath()
    context.fill()
    context.strokeStyle = 'rgba(51, 75, 105, 0.4)'
    context.lineWidth = Math.max(0.6, scale * 0.55)
    context.stroke()
    context.restore()
  }

  // Upper/lower arms and legs as real long bones.
  ;[[11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]].forEach(
    ([start, end]) => longBone(start, end)
  )
  ;[11, 12, 13, 14, 25, 26, 27, 28].forEach((index) => joint(index))
  ;[23, 24].forEach((index) => joint(index, 0.72))
  ;[15, 16].forEach((index) => joint(index, 0.85))

  // Hands and fingers as slimmer bones.
  ;[[15, 17], [15, 19], [15, 21], [17, 19], [16, 18], [16, 20], [16, 22], [18, 20]].forEach(
    ([start, end]) => longBone(start, end, 0.45)
  )
  // Feet, heels and toes.
  ;[[27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]].forEach(
    ([start, end]) => longBone(start, end, 0.55)
  )
}

function drawScientificMound(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // The export pose is normalized to this fixed stage. Anchoring the floor to
  // noisy foot landmarks made the mound jump and the athlete appear to float.
  const footX = width * 0.50
  const footY = height * 0.80

  context.save()
  const ground = context.createLinearGradient(0, footY - height * 0.08, 0, height)
  ground.addColorStop(0, 'rgba(20, 29, 42, 0.1)')
  ground.addColorStop(0.25, 'rgba(17, 24, 39, 0.94)')
  ground.addColorStop(1, '#05070b')
  context.fillStyle = ground
  context.fillRect(0, footY - height * 0.03, width, height - footY + height * 0.03)

  // Orthographic side-view measurement grid and baseline. Parallel reference
  // lines keep this a sports-science stage rather than a decorative 3D scene.
  context.strokeStyle = 'rgba(56, 189, 248, 0.16)'
  context.lineWidth = Math.max(0.7, width / 1500)
  for (let row = 0; row <= 6; row += 1) {
    const t = row / 6
    const y = footY + t * (height - footY)
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke()
  }
  for (let column = 0; column <= 16; column += 1) {
    const x = (column / 16) * width
    context.beginPath(); context.moveTo(x, footY); context.lineTo(x, height); context.stroke()
  }
  context.strokeStyle = 'rgba(186, 230, 253, 0.42)'
  context.lineWidth = Math.max(0.9, width / 1100)
  context.beginPath(); context.moveTo(0, footY); context.lineTo(width, footY); context.stroke()

  // Side-view mound profile. The plateau and downslope run left-to-right to
  // match the required open-side camera instead of facing the viewer.
  const moundWidth = width * 0.74
  const moundHeight = height * 0.058
  const moundLeft = footX - moundWidth * 0.44
  const moundRight = footX + moundWidth * 0.56
  const moundTopY = footY - moundHeight * 0.22
  const moundBaseY = footY + moundHeight
  const moundGradient = context.createLinearGradient(0, footY - moundHeight, 0, footY + moundHeight)
  moundGradient.addColorStop(0, '#59412e')
  moundGradient.addColorStop(0.55, '#2f241c')
  moundGradient.addColorStop(1, '#120f0c')
  context.fillStyle = moundGradient
  context.beginPath()
  context.moveTo(moundLeft, moundBaseY)
  context.quadraticCurveTo(moundLeft + moundWidth * 0.12, moundTopY + moundHeight * 0.16, footX - moundWidth * 0.1, moundTopY)
  context.lineTo(footX + moundWidth * 0.055, moundTopY)
  context.bezierCurveTo(
    footX + moundWidth * 0.16, moundTopY + moundHeight * 0.04,
    footX + moundWidth * 0.34, moundTopY + moundHeight * 0.72,
    moundRight, moundBaseY
  )
  context.closePath(); context.fill()
  context.strokeStyle = 'rgba(180, 135, 91, 0.35)'
  context.lineWidth = Math.max(1, width / 1100)
  context.beginPath()
  context.moveTo(moundLeft + moundWidth * 0.08, moundTopY + moundHeight * 0.32)
  context.quadraticCurveTo(footX + moundWidth * 0.20, moundTopY + moundHeight * 0.38, moundRight - moundWidth * 0.08, moundBaseY - moundHeight * 0.16)
  context.stroke()
  // Compact contact shadows sit directly beneath the normalized feet. They
  // visually lock the tracked athlete to the mound without moving the stage.
  context.fillStyle = 'rgba(0,0,0,0.48)'
  context.beginPath(); context.ellipse(footX, footY + height * 0.003, width * 0.065, height * 0.006, 0, 0, Math.PI * 2); context.fill()
  context.fillStyle = '#d7d8d5'
  context.fillRect(footX - width * 0.042, moundTopY - height * 0.006, width * 0.084, Math.max(3, height * 0.008))
  context.strokeStyle = 'rgba(125, 211, 252, 0.56)'
  context.lineWidth = Math.max(0.7, width / 1450)
  for (let tick = -4; tick <= 4; tick += 1) {
    const x = footX + tick * width * 0.04
    context.beginPath()
    context.moveTo(x, moundBaseY + height * 0.006)
    context.lineTo(x, moundBaseY + height * (tick % 2 === 0 ? 0.018 : 0.013))
    context.stroke()
  }
  context.restore()
}

type ExportFrameTransform = {
  sourceCenterX: number
  sourceFootY: number
  scale: number
}

function createExportFrameTransform(landmarks: NormalizedLandmark[]): ExportFrameTransform | null {
  const tracked = landmarks.filter((point, index) => index <= 32 && (point.visibility ?? 0) >= 0.35)
  if (tracked.length < 12) return null
  const minX = Math.min(...tracked.map((point) => point.x))
  const maxX = Math.max(...tracked.map((point) => point.x))
  const minY = Math.min(...tracked.map((point) => point.y))
  const maxY = Math.max(...tracked.map((point) => point.y))
  const poseWidth = Math.max(0.08, maxX - minX)
  const poseHeight = Math.max(0.18, maxY - minY)
  return {
    sourceCenterX: (minX + maxX) / 2,
    sourceFootY: maxY,
    // One fixed transform is used for the entire export. Recalculating the
    // bounding box every frame caused the skeleton to jump, resize, and float.
    scale: Math.min(0.62 / poseWidth, 0.66 / poseHeight, 3.6),
  }
}

function framePoseForExport(landmarks: NormalizedLandmark[], transform: ExportFrameTransform): NormalizedLandmark[] {
  const targetCenterX = 0.50
  const targetFootY = 0.79
  return landmarks.map((point) => ({
    ...point,
    x: targetCenterX + (point.x - transform.sourceCenterX) * transform.scale,
    y: targetFootY + (point.y - transform.sourceFootY) * transform.scale,
  }))
}

function smoothPose(previous: NormalizedLandmark[] | null, current: NormalizedLandmark[]) {
  if (!previous || previous.length !== current.length) return current
  const coreJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
  const visibleCoreJoints = coreJoints.filter((index) => (current[index]?.visibility ?? 0) >= 0.55).length
  // Do not render a newly invented body configuration when the model loses
  // most of the athlete. Holding the last accepted frame is less misleading
  // than allowing occlusion noise to create stretched or detached limbs.
  if (visibleCoreJoints < 7) return previous.map((point) => ({ ...point }))
  const corrected = current.map((point) => ({ ...point }))
  // Select the left/right assignment with the smallest change from the prior
  // accepted frame. This suppresses the most distracting pose-model swap.
  const pairs: Array<[number, number]> = [[11, 12], [13, 14], [15, 16], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32]]
  for (const [left, right] of pairs) {
    const normal = Math.hypot(corrected[left].x - previous[left].x, corrected[left].y - previous[left].y)
      + Math.hypot(corrected[right].x - previous[right].x, corrected[right].y - previous[right].y)
    const swapped = Math.hypot(corrected[right].x - previous[left].x, corrected[right].y - previous[left].y)
      + Math.hypot(corrected[left].x - previous[right].x, corrected[left].y - previous[right].y)
    if (swapped + 0.025 < normal) [corrected[left], corrected[right]] = [corrected[right], corrected[left]]
  }
  const responsiveness = 0.45
  const maximumStep = 0.03
  const smoothed = corrected.map((point, index) => ({
    ...point,
    // Hold low-confidence landmarks and cap one-frame jumps. This suppresses
    // common left/right swaps and occlusion spikes without inventing joints.
    x: (point.visibility ?? 0) < 0.55 ? previous[index].x : previous[index].x + Math.max(-maximumStep, Math.min(maximumStep, point.x - previous[index].x)) * responsiveness,
    y: (point.visibility ?? 0) < 0.55 ? previous[index].y : previous[index].y + Math.max(-maximumStep, Math.min(maximumStep, point.y - previous[index].y)) * responsiveness,
    z: previous[index].z + Math.max(-maximumStep, Math.min(maximumStep, point.z - previous[index].z)) * responsiveness,
  }))

  // Reject impossible one-frame bone-length changes while preserving genuine
  // perspective foreshortening over multiple frames. This is a temporal 2D
  // consistency guard, not an anatomical or 3D reconstruction claim.
  const segments: Array<[number, number]> = [
    [11, 13], [13, 15], [12, 14], [14, 16],
    [23, 25], [25, 27], [24, 26], [26, 28],
    [27, 31], [28, 32],
  ]
  for (const [parentIndex, childIndex] of segments) {
    if ((current[parentIndex]?.visibility ?? 0) < 0.55 || (current[childIndex]?.visibility ?? 0) < 0.55) continue
    const previousLength = Math.hypot(
      previous[childIndex].x - previous[parentIndex].x,
      previous[childIndex].y - previous[parentIndex].y
    )
    const deltaX = smoothed[childIndex].x - smoothed[parentIndex].x
    const deltaY = smoothed[childIndex].y - smoothed[parentIndex].y
    const currentLength = Math.hypot(deltaX, deltaY)
    if (previousLength < 0.008 || currentLength < 0.008) continue
    const constrainedLength = Math.max(previousLength * 0.72, Math.min(previousLength * 1.28, currentLength))
    if (Math.abs(constrainedLength - currentLength) < 0.001) continue
    smoothed[childIndex].x = smoothed[parentIndex].x + (deltaX / currentLength) * constrainedLength
    smoothed[childIndex].y = smoothed[parentIndex].y + (deltaY / currentLength) * constrainedLength
  }
  return smoothed
}

type InitialVideo = {
  signedUrl: string
  fileName: string
  mimeType: string
  storagePath: string
  orderId: string
  ownerUserId?: string
  staffProcessing?: boolean
  trimStartSecs?: number | null
  trimEndSecs?: number | null
  captureFps?: number | null
  amountPaidCents?: number | null
  athleteProfileId: string | null
  handedness: Handedness
} | null

type AutomaticStage = 'loading' | 'analyzing' | 'saving' | 'complete' | 'error'

export function MotionAnalysisStudio({
  initialVideo = null,
  autoProcess = false,
}: {
  initialVideo?: InitialVideo
  autoProcess?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationRef = useRef<number | null>(null)
  const samplesRef = useRef<FrameMetrics[]>([])
  const lastSampleTimeRef = useRef(-1)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const analyzingRef = useRef(false)
  const exportingRef = useRef(false)
  const exportStyleRef = useRef(false)
  const exportWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedFileRef = useRef<File | null>(null)
  const renderedBlobRef = useRef<Blob | null>(null)
  const trackedBlobRef = useRef<Blob | null>(null)
  const existingSourcePathRef = useRef<string | null>(initialVideo?.storagePath ?? null)
  const initialVideoLoadedRef = useRef(false)
  const analysisStartRef = useRef(Math.max(0, initialVideo?.trimStartSecs ?? 0))
  const analysisEndRef = useRef<number | null>(initialVideo?.trimEndSecs ?? null)
  const exportPoseRef = useRef<NormalizedLandmark[] | null>(null)
  const exportFrameTransformRef = useRef<ExportFrameTransform | null>(null)
  const watermarkRef = useRef<HTMLCanvasElement | null>(null)
  const autoAnalyzeStartedRef = useRef(false)
  const autoSaveStartedRef = useRef(false)
  // Stable across retries so a save that fails partway through (e.g. after
  // phase screenshots upload but before the database insert) resumes the
  // same analysis id on retry instead of orphaning the first attempt's
  // uploaded files under an abandoned id.
  const analysisIdRef = useRef<string | null>(null)

  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loadingInitialVideo, setLoadingInitialVideo] = useState(Boolean(initialVideo))
  const [videoReady, setVideoReady] = useState(false)
  const [automaticStage, setAutomaticStage] = useState<AutomaticStage>('loading')
  const [fileName, setFileName] = useState('')
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [playing, setPlaying] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [handedness, setHandedness] = useState<Handedness>('right')
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null)
  const [summary, setSummary] = useState<ClipSummary | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null)
  const [calibrationA, setCalibrationA] = useState<VideoPoint | null>(null)
  const [calibrationB, setCalibrationB] = useState<VideoPoint | null>(null)
  const [ballStart, setBallStart] = useState<VideoPoint | null>(null)
  const [ballEnd, setBallEnd] = useState<VideoPoint | null>(null)
  const [calibrationFeet, setCalibrationFeet] = useState(6)
  const [captureFps, setCaptureFps] = useState(() =>
    initialVideo?.captureFps && [60, 120, 240].includes(initialVideo.captureFps)
      ? initialVideo.captureFps
      : 240
  )
  const [playbackSpeed, setPlaybackSpeed] = useState(0.25)
  const playbackSpeedRef = useRef(0.25)
  const [detectedPlaybackFps, setDetectedPlaybackFps] = useState<number | null>(null)
  const [detectingFps, setDetectingFps] = useState(false)
  const [setupConfirmed, setSetupConfirmed] = useState(false)
  const planWeeks = 8 as const
  const [savingAnalysis, setSavingAnalysis] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed])

  useEffect(() => {
    const image = new Image()
    image.src = '/pitch-nav-logo-source.png'
    image.onload = () => {
      const sourceX = image.naturalWidth * 0.075
      const sourceY = image.naturalHeight * 0.245
      const sourceWidth = image.naturalWidth * 0.86
      const sourceHeight = image.naturalHeight * 0.36
      const logo = document.createElement('canvas')
      logo.width = 1200
      logo.height = 430
      const logoContext = logo.getContext('2d', { willReadFrequently: true })
      if (!logoContext) return
      logoContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, logo.width, logo.height)
      const pixels = logoContext.getImageData(0, 0, logo.width, logo.height)
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index]
        const green = pixels.data[index + 1]
        const blue = pixels.data[index + 2]
        const darkness = 255 - Math.min(red, green, blue)
        if (red > 225 && green > 225 && blue > 225) {
          pixels.data[index + 3] = 0
          continue
        }
        const isBlue = blue > red * 1.18 && blue > green * 1.03
        pixels.data[index] = isBlue ? 24 : 248
        pixels.data[index + 1] = isBlue ? 135 : 250
        pixels.data[index + 2] = isBlue ? 255 : 252
        pixels.data[index + 3] = Math.min(255, Math.max(0, darkness * 2.4))
      }
      logoContext.putImageData(pixels, 0, 0)
      watermarkRef.current = logo
    }
  }, [])

  const initializeModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    setModelStatus('loading')
    setError('')
    try {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      )
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      })
      setModelStatus('ready')
      return landmarkerRef.current
    } catch (reason) {
      console.error(reason)
      setModelStatus('error')
      setError('Could not start video tracking. Check your connection and try again.')
      return null
    }
  }, [])

  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current
    if (!video || !canvas || !landmarker || video.readyState < 2) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, width, height)
    if (exportStyleRef.current) {
      // A clean coaching visualization, not a reconstructed 3D laboratory model.
      const background = context.createLinearGradient(0, 0, 0, height)
      background.addColorStop(0, '#070a12')
      background.addColorStop(1, '#111827')
      context.fillStyle = background
      context.fillRect(0, 0, width, height)

      context.fillStyle = 'rgba(255,255,255,0.92)'
      context.font = `700 ${Math.max(18, width / 42)}px sans-serif`
      context.fillText('PITCH NAV MOTION CAPTURE', width * 0.035, height * 0.07)
      context.fillStyle = 'rgba(148,163,184,0.9)'
      context.font = `500 ${Math.max(12, width / 70)}px sans-serif`
      context.fillText('Estimated 2D pose visualization', width * 0.035, height * 0.105)
    } else {
      context.drawImage(video, 0, 0, width, height)
    }

    const result = landmarker.detectForVideo(video, performance.now())
    const landmarks = result.landmarks[0]
    if (landmarks) {
      const current = calculateMetrics(landmarks, video.currentTime, handedness)
      setMetrics(current)

      if (analyzingRef.current && video.currentTime - lastSampleTimeRef.current >= 1 / 30) {
        samplesRef.current.push(current)
        lastSampleTimeRef.current = video.currentTime
      }

      if (exportStyleRef.current) {
        if (!exportFrameTransformRef.current) {
          exportFrameTransformRef.current = createExportFrameTransform(landmarks)
        }
        const framed = exportFrameTransformRef.current
          ? framePoseForExport(landmarks, exportFrameTransformRef.current)
          : landmarks
        const presentationPose = smoothPose(exportPoseRef.current, framed)
        exportPoseRef.current = presentationPose
        drawScientificMound(context, width, height)
        drawAnatomicalSkeleton(context, presentationPose, width, height)
        context.save()
        context.fillStyle = 'rgba(148,163,184,.82)'
        context.font = `500 ${Math.max(10, width / 92)}px sans-serif`
        context.fillText('Side-view motion overlay · video-based coaching view', width * 0.035, height * 0.135)
        context.restore()
        if (watermarkRef.current) {
          const logoWidth = width * 0.24
          const logoHeight = logoWidth * (watermarkRef.current.height / watermarkRef.current.width)
          context.save()
          context.globalAlpha = 0.82
          context.drawImage(watermarkRef.current, width - logoWidth - width * 0.035, height - logoHeight - height * 0.035, logoWidth, logoHeight)
          context.restore()
        }
      } else {
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.shadowBlur = 12
        context.shadowColor = '#2563eb'
        for (const [start, end] of CONNECTIONS) {
          const a = landmarks[start]
          const b = landmarks[end]
          const visibility = Math.min(a.visibility ?? 0, b.visibility ?? 0)
          if (visibility < 0.45) continue
          context.beginPath()
          context.moveTo(a.x * width, a.y * height)
          context.lineTo(b.x * width, b.y * height)
          context.strokeStyle = visibility > 0.75 ? '#38bdf8' : '#facc15'
          context.lineWidth = Math.max(3, width / 350)
          context.stroke()
        }
        context.shadowBlur = 8
        landmarks.forEach((landmark) => {
          if ((landmark.visibility ?? 0) < 0.45) return
          context.beginPath()
          context.arc(landmark.x * width, landmark.y * height, Math.max(3, width / 260), 0, Math.PI * 2)
          context.fillStyle = (landmark.visibility ?? 0) > 0.75 ? '#ffffff' : '#facc15'
          context.fill()
        })
      }
      context.shadowBlur = 0
    }

    const markers: Array<{ point: VideoPoint | null; color: string; label: string }> = [
      { point: calibrationA, color: '#22c55e', label: 'CAL A' },
      { point: calibrationB, color: '#22c55e', label: 'CAL B' },
      { point: ballStart, color: '#f97316', label: 'BALL 1' },
      { point: ballEnd, color: '#ef4444', label: 'BALL 2' },
    ]
    for (const marker of markers) {
      if (!marker.point || exportStyleRef.current) continue
      context.save()
      context.strokeStyle = marker.color
      context.fillStyle = marker.color
      context.lineWidth = Math.max(2, width / 500)
      context.beginPath()
      context.arc(marker.point.x, marker.point.y, Math.max(8, width / 100), 0, Math.PI * 2)
      context.stroke()
      context.font = `700 ${Math.max(12, width / 70)}px sans-serif`
      context.fillText(marker.label, marker.point.x + 12, marker.point.y - 12)
      context.restore()
    }

    const start = analysisStartRef.current
    const end = Math.min(video.duration, analysisEndRef.current ?? video.duration)
    setProgress(end > start ? Math.max(0, Math.min(1, (video.currentTime - start) / (end - start))) : 0)
  }, [handedness, calibrationA, calibrationB, ballStart, ballEnd])

  const renderLoop = useCallback(() => {
    drawFrame()
    const video = videoRef.current
    const end = video ? Math.min(video.duration || Infinity, analysisEndRef.current ?? Infinity) : Infinity
    if (video && !video.paused && video.currentTime >= end - 0.003) {
      video.pause()
      setPlaying(false)
      if (analyzingRef.current) finishAnalysis()
      if (exportingRef.current && recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      return
    }
    if (video && !video.paused && !video.ended) {
      // requestAnimationFrame is throttled -- sometimes almost to a full
      // stop -- for a backgrounded or occluded tab. That silently starved
      // automatic analysis down to just a couple of sampled frames when the
      // tab lost focus mid-run, which can produce an unreliable score or a
      // false "this doesn't look like one complete pitch" flag on a real,
      // clean delivery. requestVideoFrameCallback fires once per actually
      // decoded video frame regardless of tab visibility, so prefer it.
      if ('requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(renderLoop)
      } else {
        animationRef.current = requestAnimationFrame(renderLoop)
      }
    }
  }, [drawFrame])

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (exportWatchdogRef.current) clearTimeout(exportWatchdogRef.current)
      landmarkerRef.current?.close()
    }
  }, [])

  async function handleFile(file: File) {
    if (!file.type.startsWith('video/')) {
      setError('Choose a supported video file.')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('Video must be smaller than 500 MB.')
      return
    }
    // Chrome (unlike Safari) cannot decode the QuickTime/.mov container at
    // all in an HTML5 <video> element, regardless of the codec inside. An
    // iPhone recording an unconverted .mov silently hangs every downstream
    // step (pose model, skeleton export, staff review) with no error,
    // because the "loaded" events this whole pipeline waits on simply never
    // fire. Catch it here instead of hanging later.
    if (file.type === 'video/quicktime' || /\.mov$/i.test(file.name)) {
      setError('This video is a QuickTime (.mov) file, which cannot be automatically processed in this browser. On iPhone, go to Settings → Camera → Formats and choose "Most Compatible" (this saves as .mp4), then re-record or export and upload again.')
      if (autoProcess) setAutomaticStage('error')
      return
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setVideoReady(false)
    setFileUrl(URL.createObjectURL(file))
    selectedFileRef.current = file
    renderedBlobRef.current = null
    trackedBlobRef.current = null
    analysisIdRef.current = null
    setFileName(file.name)
    analyzingRef.current = false
    exportingRef.current = false
    setAnalyzing(false)
    setExporting(false)
    setSummary(null)
    setMetrics(null)
    setProgress(0)
    setSelectionMode(null)
    setCalibrationA(null)
    setCalibrationB(null)
    setBallStart(null)
    setBallEnd(null)
    setError('')
    await initializeModel()
  }

  useEffect(() => {
    if (!initialVideo || initialVideoLoadedRef.current) return
    initialVideoLoadedRef.current = true
    setHandedness(initialVideo.handedness)
    if (initialVideo.captureFps && [60, 120, 240].includes(initialVideo.captureFps)) {
      setCaptureFps(initialVideo.captureFps)
    }
    existingSourcePathRef.current = initialVideo.storagePath
    setLoadingInitialVideo(true)
    // PoseLandmarker reliably accepts a same-origin Blob URL. Feeding the
    // private cross-origin signed URL directly into the WebGL model caused
    // valid clips to return zero landmarks even though playback still worked.
    fetch(initialVideo.signedUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('The secure video link expired. Return to the order and open Motion Lab again.')
        return response.blob()
      })
      .then((blob) => handleFile(new File([blob], initialVideo.fileName, {
        type: initialVideo.mimeType || blob.type || 'video/mp4',
      })))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load the submitted video.'))
      .finally(() => setLoadingInitialVideo(false))
  // Load the selected private submission only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVideo?.signedUrl])

  async function detectVideoFrameRate(video: HTMLVideoElement) {
    if (!('requestVideoFrameCallback' in video) || !video.duration) {
      setDetectedPlaybackFps(null)
      return
    }
    setDetectingFps(true)
    const wasPaused = video.paused
    const originalTime = video.currentTime
    const originalRate = video.playbackRate
    const mediaTimes: number[] = []
    try {
      video.pause()
      video.playbackRate = 1
      if (video.currentTime > Math.max(0.25, video.duration - 1)) video.currentTime = 0
      await video.play()
      await new Promise<void>((resolve) => {
        let finished = false
        const finish = () => {
          if (finished) return
          finished = true
          resolve()
        }
        const timeout = window.setTimeout(finish, 2200)
        const sample = (_now: number, metadata: VideoFrameCallbackMetadata) => {
          if (finished) return
          if (!mediaTimes.length || metadata.mediaTime !== mediaTimes[mediaTimes.length - 1]) mediaTimes.push(metadata.mediaTime)
          if (mediaTimes.length >= 36 || video.ended) {
            window.clearTimeout(timeout)
            finish()
          } else {
            video.requestVideoFrameCallback(sample)
          }
        }
        video.requestVideoFrameCallback(sample)
      })
      const deltas = mediaTimes.slice(1).map((time, index) => time - mediaTimes[index]).filter((delta) => delta > 0.0001)
      if (deltas.length) {
        deltas.sort((a, b) => a - b)
        const median = deltas[Math.floor(deltas.length / 2)]
        const fps = Math.round(1 / median)
        setDetectedPlaybackFps(fps)
        // requestVideoFrameCallback measures the playback timeline. iPhone
        // Slo-mo commonly stores 240 captured frames on a 30 FPS playback
        // timeline, so it must not overwrite a confirmed camera capture rate.
        if (!initialVideo?.captureFps) {
          if (fps >= 180) setCaptureFps(240)
          else if (fps >= 90) setCaptureFps(120)
          else if (fps >= 50) setCaptureFps(60)
        }
      }
    } catch (reason) {
      console.warn('Frame-rate detection was unavailable', reason)
      setDetectedPlaybackFps(null)
    } finally {
      video.pause()
      video.currentTime = originalTime
      video.playbackRate = originalRate || playbackSpeedRef.current
      if (!wasPaused) void video.play()
      setDetectingFps(false)
      drawFrame()
    }
  }

  function stepFrame(direction: -1 | 1) {
    const video = videoRef.current
    if (!video || !video.duration) return
    video.pause()
    setPlaying(false)
    // Frame stepping follows the decoded playback timeline. An iPhone Slo-mo
    // file may contain a ~30 FPS timeline even though it was captured at 240
    // FPS; the confirmed capture rate remains separate for eligibility and
    // downstream velocity processing.
    const timelineFps = detectedPlaybackFps ?? captureFps
    const frameDuration = 1 / Math.max(1, timelineFps)
    const start = analysisStartRef.current
    const end = Math.min(video.duration, analysisEndRef.current ?? video.duration)
    video.currentTime = Math.max(start, Math.min(end - frameDuration, video.currentTime + direction * frameDuration))
    setProgress(end > start ? (video.currentTime - start) / (end - start) : 0)
    window.setTimeout(drawFrame, 30)
  }

  async function togglePlayback() {
    const video = videoRef.current
    if (!video || !fileUrl) return
    if (!landmarkerRef.current && !(await initializeModel())) return
    if (video.paused) {
      const end = Math.min(video.duration, analysisEndRef.current ?? video.duration)
      if (video.currentTime < analysisStartRef.current || video.currentTime >= end - 0.003) video.currentTime = analysisStartRef.current
      video.playbackRate = playbackSpeedRef.current
      await video.play()
      setPlaying(true)
      renderLoop()
    } else {
      video.pause()
      setPlaying(false)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      drawFrame()
    }
  }

  function finishAnalysis() {
    const frames = samplesRef.current.filter((frame) => frame.confidence >= 0.45)
    if (!frames.length) {
      setError('We could not get a clear view of your body in this video. Try a clearer, full-body video.')
      if (autoProcess) setAutomaticStage('error')
      analyzingRef.current = false
      setAnalyzing(false)
      return
    }
    const widestStride = [...frames].sort((a, b) => (b.strideWidth ?? -1) - (a.strideWidth ?? -1))[0]
    // legLift is just "whichever knee is currently highest" -- it does not
    // distinguish the lead leg from the trail leg. A hard-throwing pitcher's
    // trail (drive) leg often kicks up higher during the finish than the
    // real pre-pitch leg lift ever did, so searching the whole clip for the
    // single highest knee can land on the finish instead of the windup (this
    // is what produced a "peak leg lift" phase screenshot taken from the end
    // of a real delivery). Leg lift must happen before the stride by
    // definition, so only search frames up to that point.
    const framesBeforeStride = widestStride ? frames.filter((frame) => frame.time <= widestStride.time) : frames
    const peakLegLift = [...(framesBeforeStride.length ? framesBeforeStride : frames)]
      .sort((a, b) => (b.legLift ?? -1) - (a.legLift ?? -1))[0]
    // Hip-shoulder separation (trunk coil) is a real, camera-angle-tolerant 2D
    // signal, not a guess: it builds through the stride, peaks around foot
    // contact as the arm cocks, then collapses rapidly as the trunk rotates
    // open through release. Detecting that actual peak-then-collapse shape in
    // this pitcher's own data is a real event, unlike a fixed fraction of
    // total clip length, which has no relationship to when the throw
    // actually happened. Windows are capped at 0.6s -- several times longer
    // than a real foot-contact-to-release interval -- purely as a guardrail
    // against a noisy/low-confidence stretch pulling the peak search into
    // unrelated later footage.
    const framesAfterStride = widestStride
      ? frames.filter((frame) => frame.time >= widestStride.time && frame.time <= widestStride.time + 0.6)
      : []
    const maxExternalRotation = framesAfterStride.length
      ? [...framesAfterStride].sort((a, b) => (b.hipShoulderSeparation ?? -Infinity) - (a.hipShoulderSeparation ?? -Infinity))[0]
      : null
    const framesAfterMer = maxExternalRotation
      ? frames.filter((frame) => frame.time >= maxExternalRotation.time && frame.time <= maxExternalRotation.time + 0.6)
      : []
    const ballRelease = framesAfterMer.length
      ? [...framesAfterMer].sort((a, b) => (a.hipShoulderSeparation ?? Infinity) - (b.hipShoulderSeparation ?? Infinity))[0]
      : null
    const video = videoRef.current
    const clipStart = analysisStartRef.current
    const clipEnd = video ? Math.min(video.duration, analysisEndRef.current ?? video.duration) : null
    const clipDuration = clipEnd !== null ? Math.max(0.01, clipEnd - clipStart) : null
    const peakFraction = clipDuration !== null && peakLegLift ? (peakLegLift.time - clipStart) / clipDuration : null
    const strideFraction = clipDuration !== null && widestStride ? (widestStride.time - clipStart) / clipDuration : null
    // Leg lift is now structurally before the stride, so this just catches
    // clips with no real gap between the two (no windup was captured) or a
    // stride landing at the very end (no room left for the throw itself) --
    // both signs the clip likely is not one clean pitch from set position
    // through release.
    const deliveryShapeValid = peakFraction !== null && strideFraction !== null
      && strideFraction - peakFraction >= 0.05 && strideFraction <= 0.95
    setSummary({
      frames: frames.length,
      averageConfidence: frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length,
      elbowRange: range(frames.map((frame) => frame.throwingElbow)),
      kneeRange: range(frames.map((frame) => frame.leadKnee)),
      trunkTiltRange: range(frames.map((frame) => frame.trunkTilt)),
      peakLegLiftTime: peakLegLift?.time ?? null,
      widestStrideTime: widestStride?.time ?? null,
      maxExternalRotationTime: maxExternalRotation?.time ?? null,
      ballReleaseTime: ballRelease?.time ?? null,
      deliveryShapeValid,
    })
    analyzingRef.current = false
    setAnalyzing(false)
  }

  // Scoring, phase timing, and every screenshot candidate in this report all
  // come from these sampled frames, so collecting them must not depend on
  // sustained real-time video decode. Browsers throttle -- sometimes almost
  // to a full stop -- playback of a backgrounded, occluded, or low-power-mode
  // video, which can silently starve a continuous-playback pass down to just
  // a couple of frames on a real, clean delivery (observed directly: a
  // genuine 3.9s pitch produced only 2 samples and tripped the "not one
  // complete pitch" safety flag). Explicit seeks with a bounded per-step
  // timeout make no such assumption -- each step either lands on a decoded
  // frame or times out on its own, regardless of tab visibility or device
  // power state. This is the same seek-and-wait pattern capturePhaseScreenshots
  // already uses successfully for the six phase photos.
  async function analyzeFullClip() {
    const video = videoRef.current
    if (!video || !fileUrl) return
    if (!landmarkerRef.current && !(await initializeModel())) return
    samplesRef.current = []
    lastSampleTimeRef.current = -1
    setSummary(null)
    setError('')
    analyzingRef.current = true
    setAnalyzing(true)
    video.pause()
    setPlaying(false)

    const start = analysisStartRef.current
    const end = Math.min(video.duration, analysisEndRef.current ?? video.duration)
    const duration = Math.max(0.01, end - start)
    const sampleCount = Math.max(60, Math.round(duration * 30))
    for (let i = 0; i <= sampleCount; i += 1) {
      if (!analyzingRef.current) break
      const targetTime = Math.min(end, start + (duration * i) / sampleCount)
      if (Math.abs(video.currentTime - targetTime) > 0.002) {
        await new Promise<void>((resolve) => {
          let settled = false
          const finish = () => {
            if (settled) return
            settled = true
            video.removeEventListener('seeked', finish)
            resolve()
          }
          video.addEventListener('seeked', finish, { once: true })
          video.currentTime = targetTime
          window.setTimeout(finish, 800)
        })
      }
      // Unlike capturePhaseScreenshots, nothing here reads the canvas pixels
      // (no toBlob/export), so there is nothing to wait a paint tick for --
      // drawFrame() already runs pose detection and pushes the sample
      // synchronously. Waiting on requestAnimationFrame here would just
      // reintroduce the same background-tab throttling this loop exists to
      // avoid.
      drawFrame()
    }
    if (analyzingRef.current) finishAnalysis()
  }

  // A canvas-recorded MediaRecorder blob can come back malformed (empty or
  // truncated) without the recorder itself reporting any error — the only
  // way to tell is to try actually decoding it. Saving a broken export as if
  // it succeeded would silently give the athlete/staff an unplayable file.
  function blobDecodesAsVideo(blob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      const probe = document.createElement('video')
      probe.muted = true
      probe.preload = 'auto'
      const url = URL.createObjectURL(blob)
      let settled = false
      const finish = (ok: boolean) => {
        if (settled) return
        settled = true
        clearInterval(poll)
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
        resolve(ok)
      }
      const poll = setInterval(() => {
        if (probe.videoWidth > 0) finish(true)
      }, 150)
      const timeout = setTimeout(() => finish(false), 4000)
      probe.addEventListener('error', () => finish(false))
      probe.src = url
    })
  }

  // Shared recorder for both export styles: 'tracked' draws simple pose
  // connector lines directly over the real captured footage (same
  // background/framing as the athlete filmed); 'skeleton' draws the
  // normalized anatomical skeleton on the fixed mound stage. Resolves with
  // the recorded blob instead of only downloading it, so this same function
  // can run silently during automatic processing (no forced browser
  // download) or explicitly from a staff-clicked button (with one).
  async function captureStyledExport(style: 'tracked' | 'skeleton'): Promise<Blob | null> {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const blob = await recordStyledExport(style)
      if (!blob) return null
      if (await blobDecodesAsVideo(blob)) return blob
      console.error(`Styled export (${style}) produced an undecodable video on attempt ${attempt}`)
    }
    setError('The recorded video did not save correctly. Please try the download again.')
    return null
  }

  async function recordStyledExport(style: 'tracked' | 'skeleton'): Promise<Blob | null> {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !summary) return null
    if (!('MediaRecorder' in window)) {
      setError('This browser cannot export the overlay. Try Chrome on a desktop computer.')
      return null
    }
    if (!landmarkerRef.current && !(await initializeModel())) return null
    recordedChunksRef.current = []
    exportPoseRef.current = null
    exportFrameTransformRef.current = null
    video.pause()
    setPlaying(false)
    // Render at the reviewer's chosen playback speed so the downloaded
    // motion study is easier to inspect frame by frame.
    video.playbackRate = playbackSpeedRef.current
    exportStyleRef.current = style === 'skeleton'

    // Seeking is asynchronous. Recording before it finishes was the cause of
    // exports beginning near the end and containing only a few seconds.
    const exportStart = analysisStartRef.current
    const exportEnd = Math.min(video.duration, analysisEndRef.current ?? video.duration)
    if (Math.abs(video.currentTime - exportStart) > 0.001) {
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        video.addEventListener('seeked', done, { once: true })
        video.currentTime = exportStart
      })
    } else {
      video.currentTime = exportStart
    }
    drawFrame()

    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size) recordedChunksRef.current.push(event.data)
    }
    exportingRef.current = true
    setExporting(true)
    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (exportWatchdogRef.current) {
          clearTimeout(exportWatchdogRef.current)
          exportWatchdogRef.current = null
        }
        exportingRef.current = false
        exportStyleRef.current = false
        setExporting(false)
        drawFrame()
        resolve(new Blob(recordedChunksRef.current, { type: 'video/webm' }))
      }
      recorder.start(250)
      video.play().then(() => {
        setPlaying(true)
        renderLoop()
        // Fallback only: onEnded normally stops the recorder. This prevents a
        // recording from hanging forever if a browser drops the ended event.
        exportWatchdogRef.current = setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop()
        }, Math.ceil(((exportEnd - exportStart) / video.playbackRate) * 1000) + 5000)
      }).catch((reason) => {
        console.error(reason)
        if (recorder.state !== 'inactive') recorder.stop()
        setError('The browser blocked video rendering. Press Play once, then try the download again.')
        resolve(null)
      })
    })
    return blob
  }

  async function exportOverlay() {
    const blob = await captureStyledExport('skeleton')
    if (!blob) return
    renderedBlobRef.current = blob
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${fileName.replace(/\.[^.]+$/, '')}-pitch-nav-skeleton.webm`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function selectVideoPoint(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!selectionMode || !canvasRef.current || !videoRef.current) return
    const canvas = canvasRef.current
    const bounds = canvas.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height
    const selected = { x, y, time: videoRef.current.currentTime }
    if (selectionMode === 'calibrationA') setCalibrationA(selected)
    if (selectionMode === 'calibrationB') setCalibrationB(selected)
    if (selectionMode === 'ballStart') setBallStart(selected)
    if (selectionMode === 'ballEnd') setBallEnd(selected)
    setSelectionMode(null)
    requestAnimationFrame(drawFrame)
  }

  const velocityEstimate = useMemo(() => {
    if (captureFps < 120) return null
    if (!calibrationA || !calibrationB || !ballStart || !ballEnd || calibrationFeet <= 0) return null
    const calibrationPixels = Math.hypot(calibrationB.x - calibrationA.x, calibrationB.y - calibrationA.y)
    const ballPixels = Math.hypot(ballEnd.x - ballStart.x, ballEnd.y - ballStart.y)
    const measuredFrames = Math.max(1, Math.round(Math.abs(ballEnd.time - ballStart.time) * captureFps))
    if (calibrationPixels < 10 || ballPixels < 2) return null
    const feetTravelled = (ballPixels / calibrationPixels) * calibrationFeet
    const seconds = measuredFrames / captureFps
    const mph = (feetTravelled / seconds) * 0.681818
    if (!Number.isFinite(mph) || mph < 20 || mph > 130) return null
    const margin = Math.max(2, mph * (setupConfirmed ? 0.05 : 0.1))
    return {
      mph,
      low: Math.max(0, mph - margin),
      high: mph + margin,
      frames: measuredFrames,
      confidence: setupConfirmed && measuredFrames >= 4 ? 'Moderate' : 'Low',
    }
  }, [calibrationA, calibrationB, ballStart, ballEnd, calibrationFeet, captureFps, setupConfirmed])

  async function capturePhaseScreenshots(userId: string, analysisId: string) {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.duration) return []
    const originalTime = video.currentTime
    const clipStart = analysisStartRef.current
    const clipEnd = Math.min(video.duration, analysisEndRef.current ?? video.duration)
    const clipDuration = Math.max(0.01, clipEnd - clipStart)
    const peak = summary?.peakLegLiftTime ?? clipStart + clipDuration * 0.25
    const stride = summary?.widestStrideTime ?? clipStart + clipDuration * 0.55
    const handSeparation = peak + (stride - peak) * 0.65
    // Prefer the actual detected hip-shoulder-separation peak/collapse (see
    // finishAnalysis) for MER and ball release. Only fall back to a fixed
    // real-world offset from foot contact if that signal wasn't available for
    // this clip (e.g. too few confident frames in the window).
    const merDetected = summary?.maxExternalRotationTime ?? null
    const releaseDetected = summary?.ballReleaseTime ?? null
    const maxExternalRotation = merDetected ?? stride + 0.04
    const ballRelease = releaseDetected ?? stride + 0.13
    const finish = ballRelease + 0.35
    const phases = [
      { key: 'peak_leg_lift', label: 'Peak Leg Lift', time: peak },
      { key: 'hand_separation', label: 'Hand Separation', time: Math.min(clipEnd, handSeparation) },
      { key: 'lead_foot_contact', label: 'Lead-Foot Contact Candidate', time: stride },
      {
        key: 'maximum_external_rotation',
        label: 'Maximum External Rotation Candidate',
        time: Math.min(clipEnd, maxExternalRotation),
        note: merDetected !== null
          ? 'Detected from this pitch’s own trunk-rotation timing, not an estimate.'
          : 'Could not detect a clear trunk-rotation peak in this clip; timing is an estimate.',
      },
      {
        key: 'ball_release',
        label: 'Ball Release Candidate',
        time: Math.min(clipEnd, ballRelease),
        note: releaseDetected !== null
          ? 'Detected from this pitch’s own trunk-rotation timing, not an estimate.'
          : 'Could not detect a clear release point in this clip; timing is an estimate.',
      },
      { key: 'finish', label: 'Finish & Deceleration', time: Math.min(clipEnd, finish) },
    ]
    const output: Array<{ key: string; label: string; time: number; storage_path: string; confidence_note: string }> = []
    video.pause()
    for (const phase of phases) {
      const targetTime = Math.max(0, Math.min(video.duration - 0.01, phase.time))
      if (Math.abs(video.currentTime - targetTime) > 0.002) {
        await new Promise<void>((resolve) => {
          let settled = false
          const finish = () => {
            if (settled) return
            settled = true
            video.removeEventListener('seeked', finish)
            resolve()
          }
          video.addEventListener('seeked', finish, { once: true })
          video.currentTime = targetTime
          window.setTimeout(finish, 2500)
        })
      }
      drawFrame()
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92))
      if (!blob) continue
      const path = `${userId}/motion-lab/${analysisId}/phases/${phase.key}.png`
      const { error: uploadError } = await supabase.storage.from('analysis-assets').upload(path, blob, { upsert: true, contentType: 'image/png' })
      if (!uploadError) output.push({
        key: phase.key,
        label: phase.label,
        time: phase.time,
        storage_path: path,
        confidence_note: phase.note
          ?? (phase.key === 'peak_leg_lift' || phase.key === 'finish'
            ? 'Clear frame selected for coach review.'
            : 'Frame selected for coach review.'),
      })
    }
    video.currentTime = originalTime
    return output
  }

  async function saveAnalysisToDashboard(): Promise<boolean> {
    if (!summary || !selectedFileRef.current) return false
    setSavingAnalysis(true)
    setSaveMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again.')
      const targetUserId = initialVideo?.ownerUserId ?? user.id

      // If a previous attempt already created the motion_analyses row (for
      // example the training-plan insert or the retry step after it failed),
      // reuse that row and its id instead of re-uploading the source video
      // and six phase screenshots again, and instead of wrongly reporting
      // success when the paired training plan never got created.
      let existingAnalysisId: string | null = null
      if (initialVideo?.orderId) {
        const { data: submissionStateResult, error: existingError } = await supabase
          .rpc('get_motion_analysis_submission_state', {
            target_order_id: initialVideo.orderId,
          })
          .maybeSingle()
        if (existingError && !isMissingRpcError(existingError)) throw existingError
        let submissionState = submissionStateResult as {
          analysis_id: string
          plan_exists: boolean
        } | null
        if (existingError) {
          const { data: existingAnalysis, error: analysisLookupError } = await supabase
            .from('motion_analyses')
            .select('id')
            .eq('order_id', initialVideo.orderId)
            .maybeSingle()
          if (analysisLookupError) throw analysisLookupError
          if (existingAnalysis) {
            const { data: existingPlan, error: planLookupError } = await supabase
              .from('training_plans')
              .select('id')
              .eq('motion_analysis_id', existingAnalysis.id)
              .maybeSingle()
            if (planLookupError) throw planLookupError
            submissionState = {
              analysis_id: existingAnalysis.id,
              plan_exists: Boolean(existingPlan),
            }
          }
        }
        if (submissionState) {
          existingAnalysisId = submissionState.analysis_id
          if (submissionState.plan_exists) {
            setSaveMessage('Your six-phase analysis is already prepared and waiting for staff review.')
            return true
          }
        }
      }

      if (!existingAnalysisId) {
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentAnalysisResult, error: recentAnalysisError } = await supabase
          .rpc('get_recent_motion_analysis_for_cooldown', {
            target_user_id: targetUserId,
            cutoff,
          })
          .maybeSingle()
        if (recentAnalysisError && !isMissingRpcError(recentAnalysisError)) throw recentAnalysisError
        let recentAnalysis = recentAnalysisResult as {
          analysis_id: string
          created_at: string
        } | null
        if (recentAnalysisError) {
          const { data: legacyRecentAnalysis, error: legacyRecentAnalysisError } = await supabase
            .from('motion_analyses')
            .select('id,created_at')
            .eq('user_id', targetUserId)
            .eq('cooldown_exempt', false)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (legacyRecentAnalysisError) throw legacyRecentAnalysisError
          recentAnalysis = legacyRecentAnalysis
            ? { analysis_id: legacyRecentAnalysis.id, created_at: legacyRecentAnalysis.created_at }
            : null
        }
        if (recentAnalysis && !initialVideo?.staffProcessing) {
          const nextDate = new Date(new Date(recentAnalysis.created_at).getTime() + 14 * 24 * 60 * 60 * 1000)
          throw new Error(`Your membership includes one analysis every two weeks. Your next analysis is available ${nextDate.toLocaleDateString()}.`)
        }
      }

      if (!analysisIdRef.current) analysisIdRef.current = crypto.randomUUID()
      const analysisId = existingAnalysisId ?? analysisIdRef.current
      const source = selectedFileRef.current
      const categoryFeedback = buildCategoryFeedback(samplesRef.current, summary)
      const overallScore = categoryFeedback.reduce((total, category) => total + category.score, 0)
      const immediateStrengths = [
        summary.averageConfidence >= 0.7
          ? 'Your full delivery stays visible through the pitch. That gives the coach enough clear video to compare each key position.'
          : 'Your full delivery is visible for review, but a few positions are hard to track. Better lighting at the next check will make the comparison more useful.',
        summary.peakLegLiftTime !== null
          ? 'Your leg lift gives you a clear checkpoint to repeat. We can use that same moment to measure change every two weeks.'
          : 'Your delivery shows a clear start and finish. The next video needs a sharper view of peak leg lift so the middle of the motion can be timed.',
      ]
      const immediatePriorities = [
        summary.averageConfidence < 0.7
          ? 'The video loses some body detail during the pitch. Use brighter lighting and keep your full body centered so the coach can see the exact position that needs to change.'
          : 'Your first job is making the move into landing and the finish look the same on each rep. Use controlled reps before raising the throwing effort.',
        'Your follow-up must use the same camera angle and a similar throwing effort. That is how the coach can tell whether the plan changed your movement instead of just changing the video.',
      ]

      let analysis: { id: string }
      if (existingAnalysisId) {
        analysis = { id: existingAnalysisId }
      } else {
        const extension = source.name.split('.').pop()?.toLowerCase() || 'mp4'
        const sourcePath = existingSourcePathRef.current ?? `${targetUserId}/motion-lab/${analysisId}/source.${extension}`
        if (!existingSourcePathRef.current) {
          const { error: sourceError } = await supabase.storage.from('pitch-videos').upload(sourcePath, source, { upsert: false, contentType: source.type })
          if (sourceError) throw sourceError
        }

        // Both video exports were previously only produced if staff happened
        // to click a manual "Download" button mid-session, so the automatic
        // pipeline almost never actually saved them. Generate whichever one
        // is still missing here so every automatically processed submission
        // gets both downloadable videos without a second manual pass.
        if (!trackedBlobRef.current) trackedBlobRef.current = await captureStyledExport('tracked')
        if (!renderedBlobRef.current) renderedBlobRef.current = await captureStyledExport('skeleton')

        let trackedPath: string | null = null
        if (trackedBlobRef.current) {
          trackedPath = `${targetUserId}/motion-lab/${analysisId}/tracked.webm`
          const { error: trackedError } = await supabase.storage.from('pitch-videos').upload(trackedPath, trackedBlobRef.current, { upsert: true, contentType: 'video/webm' })
          if (trackedError) throw trackedError
        }
        let renderedPath: string | null = null
        if (renderedBlobRef.current) {
          renderedPath = `${targetUserId}/motion-lab/${analysisId}/skeleton.webm`
          const { error: renderError } = await supabase.storage.from('pitch-videos').upload(renderedPath, renderedBlobRef.current, { upsert: true, contentType: 'video/webm' })
          if (renderError) throw renderError
        }
        const phaseSnapshots = await capturePhaseScreenshots(targetUserId, analysisId)
        if (phaseSnapshots.length !== 6) {
          const missing = 6 - phaseSnapshots.length
          throw new Error(`${missing} of 6 phase frames could not be saved. Keep this page open and retry automatic processing.`)
        }

        const { error: analysisError } = await supabase.from('motion_analyses').insert({
          id: analysisId,
          order_id: initialVideo?.orderId ?? null,
          user_id: targetUserId,
          athlete_profile_id: initialVideo?.athleteProfileId ?? null,
          title: fileName.replace(/\.[^.]+$/, '') || 'Motion Lab Analysis',
          status: 'submitted_for_review',
          source_video_storage_path: sourcePath,
          tracked_video_storage_path: trackedPath,
          rendered_video_storage_path: renderedPath,
          capture_fps: captureFps,
          calibration_passed: setupConfirmed,
          velocity_estimate_low: velocityEstimate?.low ?? null,
          velocity_estimate_high: velocityEstimate?.high ?? null,
          velocity_confidence: velocityEstimate?.confidence ?? null,
          velocity_assumptions: velocityEstimate ? `${captureFps} FPS; fixed side view; ${calibrationFeet} ft calibration marker; video-based estimate` : null,
          mechanics_metrics: metrics ?? {},
          clip_summary: summary,
          delivery_score: overallScore,
          category_scores: categoryFeedback,
          phase_snapshots: phaseSnapshots,
          strengths: immediateStrengths,
          development_priorities: immediatePriorities,
        })
        if (analysisError) throw analysisError
        analysis = { id: analysisId }
      }

      if (initialVideo?.orderId) {
        const { error: orderError } = await supabase.rpc('mark_order_in_analysis', { target_order_id: initialVideo.orderId })
        if (orderError) console.error('Could not advance order status to in_analysis', orderError)
      }

      const weeks = buildEightWeekThrowingPlan(categoryFeedback, immediatePriorities)
      // The $25 Throwing Development plan intentionally excludes lifting and
      // mobility programming. Only paid $40 Complete Performance orders receive it.
      const strengthMobilityWeeks = (initialVideo?.amountPaidCents ?? 0) >= 4000
        ? buildBaseballPerformancePlan(categoryFeedback, immediatePriorities)
        : []
      const followUp = new Date()
      followUp.setDate(followUp.getDate() + planWeeks * 7)
      const { error: planError } = await supabase.from('training_plans').insert({
        motion_analysis_id: analysis.id,
        user_id: targetUserId,
        duration_weeks: planWeeks,
        title: `${planWeeks}-Week Pitching Development Plan`,
        weeks,
        strength_mobility_weeks: strengthMobilityWeeks,
        starts_on: new Date().toISOString().slice(0, 10),
        rolling_window_days: 14,
        follow_up_date: followUp.toISOString().slice(0, 10),
        published_at: null,
      })
      if (planError) throw planError
      const notificationResponse = await fetch('/api/motion-lab/request-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: analysis.id }),
      })

      if (notificationResponse.ok) {
        setSaveMessage('Submitted for staff review. Pitch Nav staff was notified and will email you when your verified feedback and plan are approved for release.')
      } else {
        setSaveMessage('Submitted for staff review. Your analysis is safely in the admin dashboard, but the staff notification email could not be delivered. Pitch Nav staff can still review it there.')
      }
      return true
    } catch (reason) {
      console.error(reason)
      setSaveMessage(describeSupabaseError(reason))
      return false
    } finally {
      setSavingAnalysis(false)
    }
  }

  useEffect(() => {
    if (!autoProcess || autoAnalyzeStartedRef.current || !fileUrl || loadingInitialVideo || !videoReady || modelStatus !== 'ready') return
    autoAnalyzeStartedRef.current = true
    setAutomaticStage('analyzing')
    setPlaybackSpeed(1)
    playbackSpeedRef.current = 1
    void analyzeFullClip().catch((reason) => {
      console.error(reason)
      autoAnalyzeStartedRef.current = false
      setAutomaticStage('error')
      setError('Your video could not start processing. Press Retry below and keep this page open.')
    })
  // Automatic processing starts only after the secure video and pose model are ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoProcess, fileUrl, loadingInitialVideo, videoReady, modelStatus, automaticStage])

  // Watchdog for the automatic pipeline: if the video/model never become
  // ready (a silently undecodable file, a stalled model download, etc.) the
  // "Preparing your review" screen would otherwise spin forever with no way
  // for the athlete or staff to know something failed. Surface a clear,
  // retry-safe error instead of hanging indefinitely.
  useEffect(() => {
    if (!autoProcess || automaticStage !== 'loading' || autoAnalyzeStartedRef.current) return
    const timeout = setTimeout(() => {
      if (autoAnalyzeStartedRef.current) return
      setAutomaticStage('error')
      setError('Automatic processing is taking longer than expected. This can happen if the video file could not load or the connection is slow. Press Retry below and keep this page open, or try again with a smaller file.')
    }, 45000)
    return () => clearTimeout(timeout)
  }, [autoProcess, automaticStage, fileUrl, loadingInitialVideo, videoReady, modelStatus])

  useEffect(() => {
    if (!autoProcess || !summary || autoSaveStartedRef.current) return
    autoSaveStartedRef.current = true
    setAutomaticStage('saving')
    void saveAnalysisToDashboard().then((saved) => {
      if (saved) {
        setAutomaticStage('complete')
        const destination = initialVideo?.staffProcessing && initialVideo.orderId
          ? `/admin/orders/${initialVideo.orderId}`
          : '/dashboard?processing=submitted'
        window.location.assign(destination)
      } else {
        autoSaveStartedRef.current = false
        setAutomaticStage('error')
      }
    })
  // The completed summary is the handoff from pose processing to secure persistence.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoProcess, summary])

  const metricCards = useMemo(() => [
    { label: 'Throwing elbow', value: formatAngle(metrics?.throwingElbow ?? null) },
    { label: 'Lead knee', value: formatAngle(metrics?.leadKnee ?? null) },
    { label: 'Trunk tilt', value: formatAngle(metrics?.trunkTilt ?? null) },
    { label: 'Hip–shoulder separation', value: formatAngle(metrics?.hipShoulderSeparation ?? null) },
  ], [metrics])

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 overflow-x-hidden px-3 sm:space-y-8 sm:px-4 animate-fade-in">
      {autoProcess && (
        <section className="rounded-2xl border border-electric-blue/35 bg-electric-blue/10 p-6" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Preparing your review</p>
          <h1 className="mt-2 text-2xl font-black text-white">
            {automaticStage === 'loading' && 'Loading your video…'}
            {automaticStage === 'analyzing' && 'Reviewing your selected pitch…'}
            {automaticStage === 'saving' && 'Preparing your report…'}
            {automaticStage === 'complete' && 'Your pitch was sent for review'}
            {automaticStage === 'error' && 'Please try that again'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            Keep this page open while Pitch Nav prepares your feedback. A coach will check it before it is released.
          </p>
          {automaticStage === 'error' && (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => {
                setError('')
                setAutomaticStage('loading')
                autoAnalyzeStartedRef.current = false
                autoSaveStartedRef.current = false
                if (summary) setSummary(null)
              }}
            >
              Try again
            </button>
          )}
        </section>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Pitch Nav Video Review</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Side-View Motion Review</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Review your pitch with a clean motion overlay and easy-to-read movement estimates.
        </p>
      </div>

      <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-yellow-400" />
          <p>
            <strong>Video-based coaching estimates only.</strong> These results are not medical measurements. A Pitch Nav coach reviews them before release.
          </p>
        </div>
      </div>

      <section className="card">
        <div className="flex items-start gap-3">
          <Video className="mt-1 h-6 w-6 flex-none text-electric-blue-light" />
          <div>
            <h2 className="text-xl font-bold text-white">Side-view recording setup</h2>
            <p className="mt-1 text-sm text-slate-400">Use these steps for the clearest review.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Place the camera about 15 feet from the pitcher.',
            'Set the phone lens about 6 feet high.',
            'Film from the throwing-arm side and keep the phone still.',
            'Use landscape mode, no zoom, and good lighting.',
            'Record at 240 FPS slow motion when possible. 120 FPS is accepted.',
            'Keep the full body, throwing hand, and landing foot visible.',
          ].map((instruction, index) => (
            <div key={instruction} className="rounded-xl border border-surface-border bg-navy-900 p-4 text-sm text-slate-300">
              <span className="mr-2 font-black text-electric-blue-light">{index + 1}.</span>{instruction}
            </div>
          ))}
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-border bg-navy-950 p-4">
          <input type="checkbox" checked={setupConfirmed} onChange={(event) => setSetupConfirmed(event.target.checked)} className="mt-1 h-5 w-5 accent-electric-blue" />
          <span className="text-sm text-slate-300">I confirm this video follows the setup and shows the full delivery.</span>
        </label>
      </section>

      {!fileUrl ? (
        <label className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface-card p-8 text-center transition hover:border-electric-blue hover:bg-surface-hover">
          <Upload className="h-12 w-12 text-electric-blue-light" />
          <span className="mt-4 text-lg font-bold text-white">{loadingInitialVideo ? 'Loading your video…' : 'Choose a pitching video'}</span>
          <span className="mt-2 max-w-md text-sm text-slate-400">
            {loadingInitialVideo ? 'Keep this page open while your video loads.' : 'Use a stationary, full-body side-view video. Record at 240 FPS slow motion when possible.'}
          </span>
          <span className="mt-4 text-xs text-slate-500">MP4, MOV or WebM · maximum 500 MB</span>
          {!loadingInitialVideo && <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="sr-only"
            onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
          />}
        </label>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-black shadow-card">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                src={fileUrl}
                className="hidden"
                muted
                playsInline
                onLoadedData={(event) => {
                  event.currentTarget.defaultPlaybackRate = playbackSpeedRef.current
                  event.currentTarget.playbackRate = playbackSpeedRef.current
                  const trimEnd = analysisEndRef.current
                  if (trimEnd !== null && trimEnd > event.currentTarget.duration) analysisEndRef.current = event.currentTarget.duration
                  event.currentTarget.currentTime = Math.min(event.currentTarget.duration - 0.01, analysisStartRef.current)
                  setVideoReady(true)
                  drawFrame()
                  void detectVideoFrameRate(event.currentTarget)
                }}
                onEnded={() => {
                  setPlaying(false)
                  if (analyzingRef.current) finishAnalysis()
                  if (exportingRef.current) recorderRef.current?.stop()
                }}
                onError={() => {
                  // Without this handler, a file the browser cannot decode
                  // (e.g. an HEVC/QuickTime container Chrome won't play)
                  // silently never fires onLoadedData: videoReady stays
                  // false forever and automatic processing hangs on
                  // "Loading your video…" with no way for staff to tell
                  // what went wrong or retry with a different file.
                  const message = 'This video file could not be played back in this browser. It may be in a format that is not supported (for example HEVC/QuickTime). Re-export as a standard H.264 MP4 and upload again.'
                  setError(message)
                  setVideoReady(false)
                  if (autoProcess) setAutomaticStage('error')
                }}
              />
              <canvas
                ref={canvasRef}
                onClick={selectVideoPoint}
                className={`h-full w-full object-contain ${selectionMode ? 'cursor-crosshair' : ''}`}
                aria-label="Video analysis canvas"
              />
              {modelStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-950/80 text-sm text-white">
                  Preparing video review…
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-surface-border bg-navy-900 p-4">
              {initialVideo && (initialVideo.trimStartSecs || initialVideo.trimEndSecs) && (
                <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
                  Saved analysis range applied: {(initialVideo.trimStartSecs ?? 0).toFixed(2)}s–{initialVideo.trimEndSecs?.toFixed(2) ?? 'video end'}. Playback, measurements, phase screenshots, and skeleton export use only this range.
                </div>
              )}
              <input
                aria-label="Video progress"
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={progress}
                onChange={(event) => {
                  const video = videoRef.current
                  if (!video?.duration) return
                  const start = analysisStartRef.current
                  const end = Math.min(video.duration, analysisEndRef.current ?? video.duration)
                  video.currentTime = start + Number(event.target.value) * (end - start)
                  setProgress(Number(event.target.value))
                  drawFrame()
                }}
                className="w-full accent-electric-blue"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={togglePlayback} className="btn-primary px-4 py-2">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button type="button" onClick={() => stepFrame(-1)} className="btn-secondary px-3 py-2" aria-label="Previous frame">← Previous frame</button>
                <button type="button" onClick={() => stepFrame(1)} className="btn-secondary px-3 py-2" aria-label="Next frame">Next frame →</button>
                <button type="button" onClick={analyzeFullClip} disabled={analyzing || exporting} className="btn-accent px-4 py-2">
                  <Activity className="h-4 w-4" /> {analyzing ? 'Reviewing…' : 'Review selected clip'}
                </button>
                <label className="btn-secondary cursor-pointer px-4 py-2">
                  <RotateCcw className="h-4 w-4" /> Replace
                  <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-surface-border bg-navy-950 px-3 py-2 text-sm text-slate-300">
                  Playback
                  <select className="bg-transparent font-bold text-white outline-none" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))}>
                    <option className="bg-navy-900" value={1}>1×</option>
                    <option className="bg-navy-900" value={0.5}>0.5×</option>
                    <option className="bg-navy-900" value={0.25}>0.25×</option>
                    <option className="bg-navy-900" value={0.125}>0.125×</option>
                  </select>
                </label>
                <span className="rounded-lg bg-electric-blue/10 px-3 py-2 text-xs text-electric-blue-light">
                  {detectingFps
                    ? 'Reading playback timeline…'
                    : detectedPlaybackFps
                      ? initialVideo?.captureFps && initialVideo.captureFps >= 120
                        ? `Camera capture confirmed: ${initialVideo.captureFps} FPS · Slo-mo playback timeline: ~${detectedPlaybackFps} FPS`
                        : `Playback timeline: ~${detectedPlaybackFps} FPS · original Camera capture setting still requires confirmation`
                      : 'Playback FPS unavailable—confirm the original Camera Slo-mo setting'}
                </span>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card">
              <label className="label" htmlFor="throwing-hand">Throwing hand</label>
              <select id="throwing-hand" className="input" value={handedness} onChange={(event) => setHandedness(event.target.value as Handedness)}>
                <option value="right">Right-handed</option>
                <option value="left">Left-handed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {metricCards.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">{metric.label}</p>
                  <p className="mt-1 text-2xl font-black text-white">{metric.value}</p>
                  <p className="mt-1 text-[11px] text-slate-600">Video-based estimate</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-surface-border bg-navy-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Video quality</p>
              <p className="mt-1 text-2xl font-black text-white">{metrics ? qualityLabel(metrics.confidence) : '—'}</p>
            </div>
          </aside>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      {fileUrl && initialVideo?.orderId && (
        <section className="card border-electric-blue/25">
          <div className="flex items-start gap-3">
            <Activity className="mt-1 h-6 w-6 flex-none text-electric-blue-light" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">Optional velocity check</p>
              <h2 className="mt-1 text-xl font-bold text-white">Pitch Nav handles this for you</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                If you chose the optional velocity check, Pitch Nav reviews your recording setup and shares a range only when the video is usable.
              </p>
              <p className="mt-3 text-xs text-slate-500">No extra steps are needed on this page.</p>
            </div>
          </div>
        </section>
      )}

      {summary && (
        <section className="card">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Pitch summary</h2>
              <p className="mt-1 text-sm text-slate-400">{summary.frames} frames reviewed · {qualityLabel(summary.averageConfidence)} video quality</p>
              <p className="mt-2 text-xs text-electric-blue-light">Keep this page open while your report is prepared.</p>
            </div>
            <button type="button" onClick={exportOverlay} disabled={exporting} className="btn-primary">
              <Download className="h-4 w-4" /> {exporting ? `Rendering at ${playbackSpeed}×…` : `Download skeleton video (${playbackSpeed}×)`}
            </button>
          </div>
          {!summary.deliveryShapeValid && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
              <p className="text-sm leading-relaxed text-yellow-200">
                We could not confirm this clip shows one complete pitch from wind-up through release. This usually happens when the video contains other motion (like walking around) instead of a single delivery. Scores below are unverified — record one full pitch, from set position through follow-through, and try again.
              </p>
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Elbow range" value={summary.elbowRange ? `${Math.round(summary.elbowRange[0])}–${Math.round(summary.elbowRange[1])}°` : '—'} />
            <SummaryCard label="Lead-knee range" value={summary.kneeRange ? `${Math.round(summary.kneeRange[0])}–${Math.round(summary.kneeRange[1])}°` : '—'} />
            <SummaryCard label="Trunk-tilt range" value={summary.trunkTiltRange ? `${Math.round(summary.trunkTiltRange[0])}–${Math.round(summary.trunkTiltRange[1])}°` : '—'} />
            <SummaryCard label="Peak leg-lift moment" value={formatTime(summary.peakLegLiftTime)} />
            <SummaryCard label="Widest-stride moment" value={formatTime(summary.widestStrideTime)} />
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            A coach checks the key moments and movement estimates before your report is released.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            The downloaded video shows your motion on a clean side-view stage.
          </p>
          <div className="mt-6 rounded-xl border border-surface-border bg-navy-950 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="label">Training plan</span>
                <p className="mt-1 font-bold text-white">8 weeks · video reassessment every 2 weeks</p>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">After week 8, this plan ends and your coach builds the next program around your in-season, preseason, or offseason schedule.</p>
              </div>
              <button type="button" onClick={saveAnalysisToDashboard} disabled={savingAnalysis} className="btn-accent">
                {savingAnalysis ? 'Sending securely…' : 'Send to your coach'}
              </button>
            </div>
            {saveMessage && <p role="status" className="mt-3 text-sm text-slate-300">{saveMessage}</p>}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Video className="h-5 w-5" />} title="Private video" text="Your video is protected and available only to you and authorized Pitch Nav staff." />
        <InfoCard icon={<Activity className="h-5 w-5" />} title="Clear coaching" text="Your report highlights what works and the next priority to improve." />
        <InfoCard icon={<AlertTriangle className="h-5 w-5" />} title="Coach reviewed" text="A Pitch Nav coach checks the report before it is released." />
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-navy-900 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function PointButton({
  label,
  complete,
  active,
  onClick,
  detail,
}: {
  label: string
  complete: boolean
  active: boolean
  onClick: () => void
  detail?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${active ? 'border-electric-blue bg-electric-blue/10' : 'border-surface-border bg-navy-900 hover:border-electric-blue/60'}`}
    >
      <span className="block text-sm font-bold text-white">{complete ? '✓ ' : ''}{label}</span>
      <span className="mt-1 block text-xs text-slate-500">{active ? 'Click on the video now' : detail ?? (complete ? 'Point selected' : 'Select point')}</span>
    </button>
  )
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <div className="text-electric-blue-light">{icon}</div>
      <h3 className="mt-3 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  )
}

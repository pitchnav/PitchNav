'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Download, Pause, Play, RotateCcw, Upload, Video } from 'lucide-react'
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision'
import { createClient } from '@/lib/supabase/client'
import { buildBaseballPerformancePlan } from '@/lib/performance-plan'

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
  const quality = summary.averageConfidence >= 0.8 ? 'High' : summary.averageConfidence >= 0.6 ? 'Moderate' : 'Low'
  const peak = summary.peakLegLiftTime
  const stride = summary.widestStrideTime
  const sequenceGap = peak !== null && stride !== null ? stride - peak : null
  const trunkSpread = spread(frames.map((frame) => frame.trunkTilt))
  const kneeSpread = spread(frames.filter((frame) => stride === null || frame.time >= stride).map((frame) => frame.leadKnee))
  const elbowSpread = spread(frames.map((frame) => frame.throwingElbow))
  const separationSpread = spread(frames.map((frame) => frame.hipShoulderSeparation))
  const score = (value: number, good: number, fair: number) => value <= good ? 5 : value <= fair ? 4 : value <= fair * 1.5 ? 3 : value <= fair * 2 ? 2 : 1

  return [
    {
      category: 'Direction', score: 3, confidence: 'Low',
      strength: 'The full stride remained visible for a directional checkpoint.',
      development: 'Treat direction as limited-confidence from a single side view and have staff confirm visible drift before changing mechanics.',
      evidence: 'A single side-view 2D clip cannot reliably determine plate-line direction; this neutral score requires staff confirmation.',
    },
    {
      category: 'Lower-Half Sequencing', score: sequenceGap !== null && sequenceGap > 0 ? 4 : 2, confidence: quality,
      strength: sequenceGap !== null && sequenceGap > 0 ? 'Peak leg lift was detected before the widest-stride candidate.' : 'The lower half remained visible through the delivery.',
      development: sequenceGap !== null && sequenceGap > 0 ? 'Preserve this order as throwing intent increases.' : 'Capture a clearer full-body clip so leg-lift and stride timing can be separated.',
      evidence: sequenceGap === null ? 'Candidate event timing was incomplete.' : `Detected candidate timing gap: ${sequenceGap.toFixed(2)} seconds.`,
    },
    {
      category: 'Upper-Half Timing', score: score(elbowSpread, 35, 65), confidence: quality,
      strength: 'The throwing shoulder, elbow, and wrist were visible enough to track elbow-angle change.',
      development: elbowSpread > 65 ? 'Review whether arm action is arriving consistently around lead-foot contact.' : 'Maintain smooth arm timing without forcing a fixed elbow angle.',
      evidence: `Observed projected throwing-elbow range: ${Math.round(elbowSpread)}°.`,
    },
    {
      category: 'Front-Side Stability', score: score(kneeSpread, 18, 35), confidence: quality,
      strength: kneeSpread <= 35 ? 'Lead-knee motion was comparatively stable after the widest-stride candidate.' : 'The lead leg stayed visible through the post-stride portion.',
      development: kneeSpread > 35 ? 'Review lead-leg control from contact through finish; avoid forcing a locked knee.' : 'Keep the lead leg stable while allowing a natural, pain-free finish.',
      evidence: `Post-stride projected lead-knee range: ${Math.round(kneeSpread)}°.`,
    },
    {
      category: 'Posture', score: score(trunkSpread, 12, 25), confidence: quality,
      strength: trunkSpread <= 25 ? 'Trunk-tilt change remained controlled in this clip.' : 'The torso stayed detectable through the delivery.',
      development: trunkSpread > 25 ? 'Review when trunk tilt increases and whether the head leaves the body’s center line.' : 'Repeat the same posture pattern at game intent.',
      evidence: `Observed projected trunk-tilt range: ${Math.round(trunkSpread)}°.`,
    },
    {
      category: 'Release Consistency', score: 3, confidence: 'Low',
      strength: 'The throwing hand remained trackable near the release portion of this pitch.',
      development: 'Compare multiple pitches or a radar-backed clip before making release-consistency claims.',
      evidence: `Single-pitch body-pose review; separation variation was ${Math.round(separationSpread)}°. The baseball itself is not reliably tracked.`,
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

// Supabase's query/storage clients normally throw Error subclasses
// (PostgrestError, StorageError), but older client versions — and any
// code that rethrows a raw `{ message, code, details, hint }` object —
// do not satisfy `instanceof Error`. Collapsing that case to a generic
// string previously hid the real RLS/permission error from staff trying
// to diagnose "Could not save this analysis."
function describeSupabaseError(reason: unknown): string {
  if (reason && typeof reason === 'object') {
    const candidate = reason as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    const message = typeof candidate.message === 'string' && candidate.message ? candidate.message : null
    if (message) {
      const parts = [message]
      if (typeof candidate.code === 'string' && candidate.code) parts.push(`(code ${candidate.code})`)
      if (typeof candidate.details === 'string' && candidate.details) parts.push(`— ${candidate.details}`)
      if (typeof candidate.hint === 'string' && candidate.hint) parts.push(`Hint: ${candidate.hint}`)
      return parts.join(' ')
    }
  }
  if (typeof reason === 'string' && reason) return reason
  return 'Could not save this analysis. Contact support and share this timestamp so staff can check server logs.'
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
  const scale = Math.max(2.2, width / 420)

  const bone = (startIndex: number, endIndex: number, thickness = 1.8) => {
    const start = point(startIndex)
    const end = point(endIndex)
    if (Math.min(start.visibility, end.visibility) < 0.45) return
    context.save()
    context.lineCap = 'round'
    const length = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y))
    const normalX = -(end.y - start.y) / length
    const normalY = (end.x - start.x) / length
    const separation = Math.min(scale * thickness * 0.62, length * 0.045)
    context.shadowBlur = 1.5
    context.shadowColor = 'rgba(125, 211, 252, 0.28)'
    context.strokeStyle = '#eef2f7'
    context.lineWidth = Math.max(1, scale * 0.4)
    for (const side of [-1, 1]) {
      context.beginPath()
      context.moveTo(start.x + normalX * separation * side, start.y + normalY * separation * side)
      context.lineTo(end.x + normalX * separation * side, end.y + normalY * separation * side)
      context.stroke()
    }
    context.fillStyle = '#f8fafc'
    for (const endpoint of [start, end]) {
      context.beginPath()
      context.ellipse(endpoint.x, endpoint.y, scale * 0.48, scale * 0.34, Math.atan2(end.y - start.y, end.x - start.x), 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  const joint = (index: number, radius = 0.82) => {
    const p = point(index)
    if (p.visibility < 0.45) return
    context.save()
    context.shadowBlur = 3
    context.shadowColor = 'rgba(56,189,248,.45)'
    context.fillStyle = '#f8fafc'
    context.strokeStyle = '#7dd3fc'
    context.lineWidth = Math.max(0.7, scale * 0.18)
    context.beginPath()
    context.arc(p.x, p.y, scale * radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.restore()
  }

  // Skull and jaw, sized from the detected shoulder width so it remains
  // visually stable when facial landmarks are partially hidden.
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
    context.shadowBlur = 14
    context.shadowColor = '#38bdf8'
    context.fillStyle = 'rgba(226, 232, 240, 0.18)'
    context.strokeStyle = '#f8fafc'
    context.lineWidth = scale * 0.7
    context.beginPath()
    context.ellipse(0, 0, headWidth / 2, headHeight / 2, 0, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.beginPath()
    context.moveTo(-headWidth * 0.32, headHeight * 0.22)
    context.quadraticCurveTo(0, headHeight * 0.52, headWidth * 0.32, headHeight * 0.22)
    context.stroke()
    context.restore()
  }

  // Neck and spine.
  if (shoulderMid.visibility >= 0.45 && hipMid.visibility >= 0.45) {
    const neckBottom = shoulderMid
    const neckTop = { x: headCenter.x, y: headCenter.y + distance(shoulderMid, hipMid) * 0.1, visibility: headCenter.visibility }
    context.save()
    context.strokeStyle = '#f8fafc'
    context.lineCap = 'round'
    context.lineWidth = scale * 1.5
    context.shadowBlur = 12
    context.shadowColor = '#38bdf8'
    context.beginPath()
    context.moveTo(neckTop.x, neckTop.y)
    context.lineTo(neckBottom.x, neckBottom.y)
    context.lineTo(hipMid.x, hipMid.y)
    context.stroke()
    context.restore()

    // Rib cage follows the torso's translation and rotation.
    const torsoLength = distance(shoulderMid, hipMid)
    const shoulderWidth = Math.max(distance(shoulders[0], shoulders[1]), torsoLength * 0.34)
    const torsoAngle = Math.atan2(hipMid.y - shoulderMid.y, hipMid.x - shoulderMid.x) - Math.PI / 2
    context.save()
    context.translate((shoulderMid.x + hipMid.x) / 2, (shoulderMid.y + hipMid.y) / 2)
    context.rotate(torsoAngle)
    context.strokeStyle = 'rgba(248, 250, 252, 0.92)'
    context.lineWidth = scale * 0.5
    context.shadowBlur = 8
    context.shadowColor = '#38bdf8'
    for (let rib = 0; rib < 5; rib += 1) {
      const y = -torsoLength * 0.28 + rib * torsoLength * 0.12
      const taper = 1 - Math.abs(rib - 2) * 0.09
      context.beginPath()
      context.ellipse(0, y, shoulderWidth * 0.42 * taper, torsoLength * 0.1, 0, 0, Math.PI * 2)
      context.stroke()
    }
    context.restore()

    // Pelvis bowl.
    context.save()
    context.fillStyle = 'rgba(226, 232, 240, 0.18)'
    context.strokeStyle = '#f8fafc'
    context.lineWidth = scale * 0.55
    context.shadowBlur = 10
    context.shadowColor = '#38bdf8'
    const pelvisHalfWidth = Math.max(distance(hips[0], hips[1]) / 2, torsoLength * 0.13)
    context.beginPath()
    context.moveTo(hipMid.x - pelvisHalfWidth, hipMid.y - torsoLength * 0.025)
    context.quadraticCurveTo(hipMid.x, hipMid.y + torsoLength * 0.18, hipMid.x + pelvisHalfWidth, hipMid.y - torsoLength * 0.025)
    context.lineTo(hipMid.x, hipMid.y + torsoLength * 0.08)
    context.closePath()
    context.fill()
    context.stroke()
    context.restore()
  }

  // Upper/lower arms and legs.
  ;[[11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]].forEach(
    ([start, end]) => bone(start, end)
  )
  ;[11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((index) => joint(index))

  // Hands and fingers.
  ;[[15, 17], [15, 19], [15, 21], [17, 19], [16, 18], [16, 20], [16, 22], [18, 20]].forEach(
    ([start, end]) => bone(start, end, 0.85)
  )
  // Feet, heels and toes.
  ;[[27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]].forEach(
    ([start, end]) => bone(start, end, 1.05)
  )
}

function drawScientificMound(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // The export pose is normalized to this fixed stage. Anchoring the floor to
  // noisy foot landmarks made the mound jump and the athlete appear to float.
  const footX = width * 0.56
  const footY = height * 0.80

  context.save()
  const ground = context.createLinearGradient(0, footY - height * 0.08, 0, height)
  ground.addColorStop(0, 'rgba(20, 29, 42, 0.1)')
  ground.addColorStop(0.25, 'rgba(17, 24, 39, 0.94)')
  ground.addColorStop(1, '#05070b')
  context.fillStyle = ground
  context.fillRect(0, footY - height * 0.03, width, height - footY + height * 0.03)

  // Fixed perspective measurement grid for a repeatable scientific view.
  context.strokeStyle = 'rgba(56, 189, 248, 0.16)'
  context.lineWidth = Math.max(0.7, width / 1500)
  for (let row = 0; row <= 7; row += 1) {
    const t = row / 7
    const y = footY + Math.pow(t, 1.55) * (height - footY)
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke()
  }
  for (let column = -9; column <= 9; column += 1) {
    context.beginPath(); context.moveTo(footX, footY); context.lineTo(footX + column * width * 0.12, height); context.stroke()
  }

  // Side-view mound profile. The plateau and downslope run left-to-right to
  // match the required open-side camera instead of facing the viewer.
  const moundWidth = width * 0.74
  const moundHeight = height * 0.064
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
  context.quadraticCurveTo(moundLeft + moundWidth * 0.12, moundTopY + moundHeight * 0.22, footX - moundWidth * 0.09, moundTopY)
  context.lineTo(footX + moundWidth * 0.06, moundTopY)
  context.quadraticCurveTo(footX + moundWidth * 0.30, moundTopY + moundHeight * 0.12, moundRight, moundBaseY)
  context.closePath(); context.fill()
  context.strokeStyle = 'rgba(180, 135, 91, 0.35)'
  context.lineWidth = Math.max(1, width / 1100)
  context.beginPath()
  context.moveTo(moundLeft + moundWidth * 0.08, moundTopY + moundHeight * 0.32)
  context.quadraticCurveTo(footX + moundWidth * 0.20, moundTopY + moundHeight * 0.38, moundRight - moundWidth * 0.08, moundBaseY - moundHeight * 0.16)
  context.stroke()
  context.fillStyle = 'rgba(0,0,0,0.34)'
  context.beginPath(); context.ellipse(footX, footY + height * 0.008, width * 0.075, height * 0.011, 0, 0, Math.PI * 2); context.fill()
  context.fillStyle = '#d7d8d5'
  context.fillRect(footX - width * 0.042, moundTopY - height * 0.006, width * 0.084, Math.max(3, height * 0.008))
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
  const targetCenterX = 0.56
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
  const [planWeeks, setPlanWeeks] = useState<4 | 8>(8)
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
        context.fillText('Scientific 2D pose reconstruction · not a 3D or laboratory model', width * 0.035, height * 0.135)
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
      animationRef.current = requestAnimationFrame(renderLoop)
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
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setVideoReady(false)
    setFileUrl(URL.createObjectURL(file))
    selectedFileRef.current = file
    renderedBlobRef.current = null
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
    const peakLegLift = [...frames].sort((a, b) => (b.legLift ?? -1) - (a.legLift ?? -1))[0]
    const widestStride = [...frames].sort((a, b) => (b.strideWidth ?? -1) - (a.strideWidth ?? -1))[0]
    setSummary({
      frames: frames.length,
      averageConfidence: frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length,
      elbowRange: range(frames.map((frame) => frame.throwingElbow)),
      kneeRange: range(frames.map((frame) => frame.leadKnee)),
      trunkTiltRange: range(frames.map((frame) => frame.trunkTilt)),
      peakLegLiftTime: peakLegLift?.time ?? null,
      widestStrideTime: widestStride?.time ?? null,
    })
    analyzingRef.current = false
    setAnalyzing(false)
  }

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
    video.currentTime = analysisStartRef.current
    video.playbackRate = playbackSpeedRef.current
    await video.play()
    setPlaying(true)
    renderLoop()
  }

  async function exportOverlay() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !summary) return
    if (!('MediaRecorder' in window)) {
      setError('This browser cannot export the overlay. Try Chrome on a desktop computer.')
      return
    }
    if (!landmarkerRef.current && !(await initializeModel())) return
    recordedChunksRef.current = []
    exportPoseRef.current = null
    exportFrameTransformRef.current = null
    video.pause()
    setPlaying(false)
    // Render the skeleton at quarter speed so the downloaded motion study is
    // easier to inspect frame by frame.
    video.playbackRate = playbackSpeedRef.current
    exportStyleRef.current = true

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
    recorder.onstop = () => {
      if (exportWatchdogRef.current) {
        clearTimeout(exportWatchdogRef.current)
        exportWatchdogRef.current = null
      }
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      renderedBlobRef.current = blob
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName.replace(/\.[^.]+$/, '')}-pitch-nav-skeleton.webm`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      exportingRef.current = false
      exportStyleRef.current = false
      setExporting(false)
      drawFrame()
    }
    exportingRef.current = true
    setExporting(true)
    recorder.start(250)
    try {
      await video.play()
      setPlaying(true)
      renderLoop()
      // Fallback only: onEnded normally stops the recorder. This prevents a
      // recording from hanging forever if a browser drops the ended event.
      exportWatchdogRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
      }, Math.ceil(((exportEnd - exportStart) / video.playbackRate) * 1000) + 5000)
    } catch (reason) {
      console.error(reason)
      if (recorder.state !== 'inactive') recorder.stop()
      setError('The browser blocked video rendering. Press Play once, then try the download again.')
    }
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
    const phases = [
      { key: 'peak_leg_lift', label: 'Peak Leg Lift', time: peak },
      { key: 'hand_separation', label: 'Hand Separation', time: Math.min(clipEnd, peak + clipDuration * 0.1) },
      { key: 'lead_foot_contact', label: 'Lead-Foot Contact Candidate', time: stride },
      { key: 'maximum_external_rotation', label: 'Maximum External Rotation Candidate', time: Math.min(clipEnd, stride + clipDuration * 0.1) },
      { key: 'ball_release', label: 'Ball Release Candidate', time: Math.min(clipEnd, stride + clipDuration * 0.18) },
      { key: 'finish', label: 'Finish & Deceleration', time: clipStart + clipDuration * 0.9 },
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
        ...phase,
        storage_path: path,
        confidence_note: phase.key === 'peak_leg_lift' || phase.key === 'finish'
          ? 'Video-based candidate selected from visible pose geometry.'
          : 'Estimated phase frame; a coach must confirm the exact event.',
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
        const { data: existingAnalysis, error: existingError } = await supabase
          .from('motion_analyses')
          .select('id')
          .eq('order_id', initialVideo.orderId)
          .maybeSingle()
        if (existingError) throw existingError
        if (existingAnalysis) {
          existingAnalysisId = existingAnalysis.id
          const { data: existingPlan, error: existingPlanError } = await supabase
            .from('training_plans')
            .select('id')
            .eq('motion_analysis_id', existingAnalysis.id)
            .maybeSingle()
          if (existingPlanError) throw existingPlanError
          if (existingPlan) {
            setSaveMessage('Your six-phase analysis is already prepared and waiting for staff review.')
            return true
          }
        }
      }

      if (!existingAnalysisId) {
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentAnalysis } = await supabase.from('motion_analyses').select('id,created_at').eq('user_id', targetUserId).eq('cooldown_exempt', false).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(1).maybeSingle()
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
        summary.averageConfidence >= 0.7 ? 'Consistent full-body landmark visibility supports repeatable frame review.' : 'A complete delivery was captured for frame-by-frame review.',
        summary.peakLegLiftTime !== null ? 'Peak leg lift was identified as a repeatable comparison checkpoint.' : 'The delivery can be reviewed through the visible movement sequence.',
      ]
      const immediatePriorities = [
        summary.averageConfidence < 0.7 ? 'Improve lighting and full-body framing to raise measurement confidence.' : 'Compare posture and direction at lead-foot contact across future clips.',
        'Use the same camera angle and intensity during the follow-up recording.',
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

        const { data: inserted, error: analysisError } = await supabase.from('motion_analyses').insert({
          id: analysisId,
          order_id: initialVideo?.orderId ?? null,
          user_id: targetUserId,
          athlete_profile_id: initialVideo?.athleteProfileId ?? null,
          title: fileName.replace(/\.[^.]+$/, '') || 'Motion Lab Analysis',
          status: 'submitted_for_review',
          source_video_storage_path: sourcePath,
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
        }).select('id').single()
        if (analysisError) throw analysisError
        analysis = inserted
      }

      if (initialVideo?.orderId) {
        const { error: orderError } = await supabase.rpc('mark_order_in_analysis', { target_order_id: initialVideo.orderId })
        if (orderError) console.error('Could not advance order status to in_analysis', orderError)
      }

      const weeks = Array.from({ length: planWeeks }, (_, index) => ({
        week: index + 1,
        priority: index < 2 ? 'Movement quality and repeatability' : index < 4 ? 'Progressive intent and constraint drills' : 'Transfer, command, and retest preparation',
        coaching_cue: index < 2 ? 'Move smoothly, finish under control, and keep each repetition repeatable.' : 'Preserve the same movement pattern as intent increases.',
        prescription: index < 2 ? '2 sessions; 3 sets of 5 controlled repetitions' : '2 bullpen or throwing sessions with video checkpoints',
        days: [
          { day: 'Monday', focus: 'Movement quality', work: `Warm-up, mobility, then 3 x 5 controlled delivery reps. Focus: ${immediatePriorities[0]}` },
          { day: 'Tuesday', focus: 'Throwing development', work: 'Complete your normal medically appropriate throwing program; film one controlled checkpoint pitch.' },
          { day: 'Wednesday', focus: 'Recovery and review', work: 'Light mobility and recovery. Review Monday/Tuesday video without high-intent throwing.' },
          { day: 'Thursday', focus: 'Constraint drill day', work: 'Warm-up, then 3 x 5 repeatability reps using the week’s primary coaching cue.' },
          { day: 'Friday', focus: 'Bullpen or intent progression', work: index < 2 ? 'Moderate-intent throwing only; preserve movement quality.' : 'Progress intent only if pain-free and consistent with your existing throwing program.' },
          { day: 'Saturday', focus: 'Strength and mobility', work: 'Follow your existing strength program; add mobility only within your normal pain-free range.' },
          { day: 'Sunday', focus: 'Rest and check-in', work: 'Rest from pitching. Record soreness, confidence, and completion notes for the week.' },
        ],
        completed: false,
      }))
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
    <div className="mx-auto max-w-6xl space-y-8">
      {autoProcess && (
        <section className="rounded-2xl border border-electric-blue/35 bg-electric-blue/10 p-6" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Automatic six-phase processing</p>
          <h1 className="mt-2 text-2xl font-black text-white">
            {automaticStage === 'loading' && 'Loading your secure video…'}
            {automaticStage === 'analyzing' && 'Analyzing the trimmed delivery…'}
            {automaticStage === 'saving' && 'Saving all six phase frames…'}
            {automaticStage === 'complete' && 'Analysis submitted for staff review'}
            {automaticStage === 'error' && 'Let’s give that another try'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            Keep this page open while Pitch Nav prepares your six phase screenshots, scores, and plan. You won&apos;t need to run this video through Motion Lab again — a coach will verify everything before it&apos;s released to you.
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
              Retry automatic processing
            </button>
          )}
        </section>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Pitch Nav Motion Lab</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Skeleton Video Analysis</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Generate a private, on-device skeleton overlay and coaching-oriented 2D joint-angle estimates.
          The video stays in your browser during this preview analysis.
        </p>
      </div>

      <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-yellow-400" />
          <p>
            <strong>Estimated—not laboratory or medical measurements.</strong> A single camera cannot directly measure
            muscle activation, joint loading, depth, or clinical injury risk. Yellow joints indicate reduced landmark visibility.
          </p>
        </div>
      </div>

      <section className="card">
        <div className="flex items-start gap-3">
          <Video className="mt-1 h-6 w-6 flex-none text-electric-blue-light" />
          <div>
            <h2 className="text-xl font-bold text-white">Calibrated side-view setup</h2>
            <p className="mt-1 text-sm text-slate-400">These details help staff decide whether automatic, video-based velocity processing is eligible. Customers do not select calibration or baseball points.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Place the camera exactly 15 ft from the marked reference point.',
            'Set the center of the phone lens exactly 6 ft above the ground.',
            'Aim perpendicular to the target line; keep the phone level and stationary.',
            'Use landscape orientation, no digital zoom, and strong lighting.',
            'Record at 240 FPS when supported; 120 FPS is the minimum.',
            'Place the 8-inch Pitch Nav calibration marker in the same image plane as the visible baseball path.',
          ].map((instruction, index) => (
            <div key={instruction} className="rounded-xl border border-surface-border bg-navy-900 p-4 text-sm text-slate-300">
              <span className="mr-2 font-black text-electric-blue-light">{index + 1}.</span>{instruction}
            </div>
          ))}
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-border bg-navy-950 p-4">
          <input type="checkbox" checked={setupConfirmed} onChange={(event) => setSetupConfirmed(event.target.checked)} className="mt-1 h-5 w-5 accent-electric-blue" />
          <span className="text-sm text-slate-300">I confirm this clip follows the 15-ft distance, 6-ft lens-height, perpendicular alignment, no-zoom, frame-rate, and in-plane marker requirements. Staff will verify eligibility before any video-estimated range is released.</span>
        </label>
      </section>

      {!fileUrl ? (
        <label className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface-card p-8 text-center transition hover:border-electric-blue hover:bg-surface-hover">
          <Upload className="h-12 w-12 text-electric-blue-light" />
          <span className="mt-4 text-lg font-bold text-white">{loadingInitialVideo ? 'Loading the submitted private video…' : 'Choose a pitching video'}</span>
          <span className="mt-2 max-w-md text-sm text-slate-400">
            {loadingInitialVideo ? 'Keep this page open. Larger slow-motion videos can take a moment to load securely.' : 'Use a stationary, full-body open-side video. Slow motion at 120 or 240 FPS produces better frame selection.'}
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
              />
              <canvas
                ref={canvasRef}
                onClick={selectVideoPoint}
                className={`h-full w-full object-contain ${selectionMode ? 'cursor-crosshair' : ''}`}
                aria-label="Video analysis canvas"
              />
              {modelStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-950/80 text-sm text-white">
                  Loading pose model…
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
                  {playing ? 'Pause' : 'Play slow motion'}
                </button>
                <button type="button" onClick={() => stepFrame(-1)} className="btn-secondary px-3 py-2" aria-label="Previous frame">← Previous frame</button>
                <button type="button" onClick={() => stepFrame(1)} className="btn-secondary px-3 py-2" aria-label="Next frame">Next frame →</button>
                <button type="button" onClick={analyzeFullClip} disabled={analyzing || exporting} className="btn-accent px-4 py-2">
                  <Activity className="h-4 w-4" /> {analyzing ? 'Analyzing…' : 'Analyze full clip'}
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
                  <p className="mt-1 text-[11px] text-slate-600">2D projected estimate</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-surface-border bg-navy-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Landmark confidence</p>
              <p className="mt-1 text-2xl font-black text-white">{metrics ? `${Math.round(metrics.confidence * 100)}%` : '—'}</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">Velocity check</p>
              <h2 className="mt-1 text-xl font-bold text-white">Nothing else for you to do</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                You don&apos;t click any calibration points. Once your video is uploaded, Pitch Nav checks the frame
                rate, the calibration marker, and the ball tracking, and a coach reviews the result before you see it.
                If your video doesn&apos;t qualify, no velocity estimate is shown. Radar readings are always labeled
                separately as verified.
              </p>
              <p className="mt-3 text-xs text-slate-500">240 FPS is recommended. 120 FPS is accepted with reduced confidence. 60 FPS is mechanics-only.</p>
            </div>
          </div>
        </section>
      )}

      {summary && (
        <section className="card">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Clip summary</h2>
              <p className="mt-1 text-sm text-slate-400">{summary.frames} accepted samples · {Math.round(summary.averageConfidence * 100)}% average landmark confidence</p>
              <p className="mt-2 text-xs text-electric-blue-light">Saving the detailed report creates six phase screenshots, category feedback, and every day of your plan. Keep this page open while it finishes; longer clips may take several minutes.</p>
            </div>
            <button type="button" onClick={exportOverlay} disabled={exporting} className="btn-primary">
              <Download className="h-4 w-4" /> {exporting ? `Rendering at ${playbackSpeed}×…` : `Download skeleton video (${playbackSpeed}×)`}
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Elbow range" value={summary.elbowRange ? `${Math.round(summary.elbowRange[0])}–${Math.round(summary.elbowRange[1])}°` : '—'} />
            <SummaryCard label="Lead-knee range" value={summary.kneeRange ? `${Math.round(summary.kneeRange[0])}–${Math.round(summary.kneeRange[1])}°` : '—'} />
            <SummaryCard label="Trunk-tilt range" value={summary.trunkTiltRange ? `${Math.round(summary.trunkTiltRange[0])}–${Math.round(summary.trunkTiltRange[1])}°` : '—'} />
            <SummaryCard label="Peak leg-lift candidate" value={formatTime(summary.peakLegLiftTime)} />
            <SummaryCard label="Widest-stride candidate" value={formatTime(summary.widestStrideTime)} />
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Candidate events are selected from pose geometry and must be confirmed by a human reviewer. Ball release and maximum external rotation are not automatically asserted because a standard body-pose model does not reliably track the baseball or humeral rotation.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            The downloaded visualization uses a dark motion-capture stage and a 2D pose skeleton without the original video background. Keep this tab visible while the full clip renders in real time.
          </p>
          <div className="mt-6 rounded-xl border border-surface-border bg-navy-950 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label>
                <span className="label">Development-plan length</span>
                <select className="input min-w-52" value={planWeeks} onChange={(event) => setPlanWeeks(Number(event.target.value) as 4 | 8)}>
                  <option value={8}>8-week pitching + strength plan</option>
                </select>
              </label>
              <button type="button" onClick={saveAnalysisToDashboard} disabled={savingAnalysis} className="btn-accent">
                {savingAnalysis ? 'Saving securely…' : 'Submit for staff review'}
              </button>
            </div>
            {saveMessage && <p role="status" className="mt-3 text-sm text-slate-300">{saveMessage}</p>}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Video className="h-5 w-5" />} title="Private preview" text="Processing runs in this browser. This preview does not upload the selected local file." />
        <InfoCard icon={<Activity className="h-5 w-5" />} title="Coaching estimates" text="Angles are projected from visible landmarks and include confidence—not clinical certainty." />
        <InfoCard icon={<AlertTriangle className="h-5 w-5" />} title="Human approval required" text="An analyst should approve event frames, measurements, cues, and any customer-facing report." />
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

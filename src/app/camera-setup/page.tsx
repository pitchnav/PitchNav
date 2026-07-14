'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, Camera, Eye, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Angle = 'open_side' | 'rear' | 'front'

const ANGLES: { key: Angle; label: string; icon: string }[] = [
  { key: 'open_side', label: 'Open-Side View', icon: '📹' },
  { key: 'rear', label: 'Rear View', icon: '📷' },
  { key: 'front', label: 'Front View (Optional)', icon: '🎥' },
]

const CHECKLIST_ITEMS = [
  'Full body is visible from head to toe',
  'Throwing hand is visible through ball release',
  'Landing foot is visible throughout the pitch',
  'Video is not blurry or pixelated',
  'Camera does not move during the pitch',
  'Lighting is adequate — pitcher is not in shadow',
  'Video is recorded at normal game or bullpen intensity',
  'At least three full pitches are included in the video',
  'The camera angle matches the selected guide above',
]

const GUIDE: Record<Angle, {
  description: string
  position: string
  distance: string
  height: string
  orientation: string
  frameRate: string
  lighting: string
  dos: string[]
  donts: string[]
}> = {
  open_side: {
    description: 'The open-side view films from the pitcher\'s throwing-arm side, approximately perpendicular to the direction of the pitch. This angle reveals hip and shoulder rotation, arm path, and release point.',
    position: 'Throwing-arm side, approximately perpendicular (90°) to the pitch direction.',
    distance: '30–45 feet from the pitcher (full body must remain in frame).',
    height: 'Approximately chest-high — roughly 4–5 feet off the ground.',
    orientation: 'Horizontal (landscape) is strongly preferred.',
    frameRate: '120 fps or 240 fps when your device supports it. At minimum, use the highest frame rate available.',
    lighting: 'Film with the sun or primary light source behind the camera, not behind the pitcher.',
    dos: [
      'Keep the full body — from the head to the landing foot — visible at all times',
      'Record at least 3 full-intent pitches from the same position',
      'Place the camera on a tripod, fence, or stable surface',
      'Make sure the throwing hand remains visible at and through ball release',
    ],
    donts: [
      'Do not zoom in during the pitch',
      'Do not move the camera once recording begins',
      'Do not position the camera too far in front of or behind the pitcher',
      'Do not film from too close — the stride foot should not leave the frame',
    ],
  },
  rear: {
    description: 'The rear view is filmed from behind the mound, centered with the target line. This angle reveals direction, hip alignment, and landing foot position.',
    position: 'Directly behind the pitcher, centered with the intended pitch direction.',
    distance: '25–40 feet behind the mound, far enough that the full body is visible.',
    height: 'Approximately chest-high — roughly 4–5 feet off the ground.',
    orientation: 'Horizontal (landscape) is strongly preferred.',
    frameRate: '120 fps or 240 fps when available.',
    lighting: 'Natural lighting is fine. Avoid filming directly into the sun.',
    dos: [
      'Stay centered with the target line — not offset to either side',
      'Ensure the landing foot stays in frame through and after release',
      'Record at least 3 pitches from the same position',
      'Keep the camera completely stationary',
    ],
    donts: [
      'Do not stand in the direct line of the thrown ball for safety',
      'Do not move the camera while filming',
      'Do not stand so close that the pitcher\'s body fills the entire frame',
      'Do not allow the head or feet to leave the frame',
    ],
  },
  front: {
    description: 'The front view is optional and films from the catcher\'s perspective. It can reveal release point and pitch movement but is not required for the standard analysis.',
    position: 'Directly in front of the pitcher, from the catcher\'s position — never in the actual line of the pitch for safety.',
    distance: '50–65 feet, approximately at home plate.',
    height: 'Approximately waist-to-chest high.',
    orientation: 'Horizontal (landscape).',
    frameRate: '120 fps or 240 fps when available.',
    lighting: 'Avoid filming directly into the sun.',
    dos: [
      'Use a tripod or net attachment rather than a person holding the camera',
      'Ensure the full delivery is visible',
    ],
    donts: [
      'Never have a person hold the camera in the direct line of a thrown pitch',
      'Do not film from directly in front — offset slightly for safety if a person is holding the camera',
    ],
  },
}

export default function CameraSetupPage() {
  const [activeAngle, setActiveAngle] = useState<Angle>('open_side')
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const guide = GUIDE[activeAngle]
  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item])

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Camera Setup Guide
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Follow these instructions carefully before filming. Good video quality is the most
            important factor in a thorough analysis.
          </p>
        </div>

        {/* Angle selector */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          {ANGLES.map((angle) => (
            <button
              key={angle.key}
              onClick={() => setActiveAngle(angle.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 rounded-xl border px-6 py-4 text-sm font-semibold transition-all duration-200',
                activeAngle === angle.key
                  ? 'border-electric-blue bg-electric-blue/10 text-white'
                  : 'border-surface-border bg-surface-card text-slate-400 hover:border-electric-blue/50 hover:text-white'
              )}
            >
              <span className="text-xl">{angle.icon}</span>
              {angle.label}
            </button>
          ))}
        </div>

        {/* Camera diagram placeholder */}
        <div className="card mb-8 flex flex-col items-center justify-center py-16 border-dashed border-electric-blue/20">
          <Camera className="h-16 w-16 text-electric-blue/30 mb-4" />
          <p className="text-slate-600 text-sm">
            [Camera position diagram for {ANGLES.find(a => a.key === activeAngle)?.label} — replace with actual SVG diagram before launch]
          </p>
        </div>

        {/* Guide content */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            {ANGLES.find((a) => a.key === activeAngle)?.label} Instructions
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">{guide.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {[
              { label: 'Camera Position', value: guide.position },
              { label: 'Distance from Pitcher', value: guide.distance },
              { label: 'Camera Height', value: guide.height },
              { label: 'Phone Orientation', value: guide.orientation },
              { label: 'Frame Rate', value: guide.frameRate },
              { label: 'Lighting', value: guide.lighting },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                <p className="text-sm text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-accent-green mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Do
              </h3>
              <ul className="space-y-2">
                {guide.dos.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-accent-green mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Don't
              </h3>
              <ul className="space-y-2">
                {guide.donts.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-red-400 mt-0.5">✗</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-5 w-5 text-electric-blue-light" />
            <h2 className="text-lg font-bold text-white">Video Quality Checklist</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Confirm each item before submitting your video. You'll complete this checklist
            again in the upload step.
          </p>

          <div className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => (
              <label key={item} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checklist[item]}
                  onChange={(e) =>
                    setChecklist((prev) => ({ ...prev, [item]: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-surface-border bg-navy-800 accent-electric-blue cursor-pointer"
                />
                <span
                  className={cn(
                    'text-sm transition-colors',
                    checklist[item] ? 'text-white line-through text-slate-500' : 'text-slate-300 group-hover:text-white'
                  )}
                >
                  {item}
                </span>
              </label>
            ))}
          </div>

          {allChecked && (
            <div className="mt-6 rounded-lg bg-accent-green/10 border border-accent-green/20 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-accent-green" />
              <p className="text-sm font-semibold text-accent-green">
                All items confirmed — your video is ready to upload.
              </p>
            </div>
          )}
        </div>

        {/* Camera overlay note */}
        <div className="card border-electric-blue/20 mb-8">
          <h3 className="text-base font-semibold text-white mb-2">Camera Alignment Tip</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            When using the PitchFrame recording screen, a framing overlay will appear to help you
            center the pitcher and ensure the full body stays inside the frame. Use the overlay
            guides to position your phone before starting your session.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="/start-analysis" className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
            I'm Ready — Start My Analysis <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  )
}

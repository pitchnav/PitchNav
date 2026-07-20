'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Eye, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CameraAlignmentStudio } from '@/components/camera/CameraAlignmentStudio'
import { CameraPositionDiagram } from '@/components/camera/CameraPositionDiagram'

type Angle = 'open_side'

const ANGLES: { key: Angle; label: string; icon: string }[] = [
  { key: 'open_side', label: 'Open-Side View', icon: '📹' },
]

const CHECKLIST_ITEMS = [
  'Full body is visible from head to toe',
  'Throwing hand is visible through ball release',
  'Landing foot is visible throughout the pitch',
  'Video is not blurry or pixelated',
  'Camera does not move during the pitch',
  'Lighting is adequate — pitcher is not in shadow',
  'Video was recorded using the phone Camera app’s SLO-MO mode',
  'Video is recorded at normal game or bullpen intensity',
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
    distance: '15 feet from the pitcher, measured from the throwing-arm side.',
    height: '6 feet high with the lens level and the entire body visible.',
    orientation: 'Horizontal (landscape) is strongly preferred.',
    frameRate: 'Use the Camera app’s SLO-MO recording mode. Select 240 FPS when available; 120 FPS is accepted.',
    lighting: 'Film with the sun or primary light source behind the camera, not behind the pitcher.',
    dos: [
      'Keep the full body — from the head to the landing foot — visible at all times',
      'Include at least one complete pitch from start through finish',
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

}

function CameraSetupContent() {
  const searchParams = useSearchParams()
  const paidOrderId = searchParams.get('orderId')
  const uploadReturnHref = paidOrderId
    ? `/start-analysis/upload?orderId=${encodeURIComponent(paidOrderId)}`
    : '/start-analysis'
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

        <section className="card mb-10 overflow-hidden border-electric-blue/30">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Required recording mode</p><h2 className="mt-1 text-2xl font-black text-white">Record with SLO-MO—not normal Video mode</h2><p className="mt-2 text-sm text-slate-400">On iPhone, set Settings → Camera → Record Slo-mo to 1080p at 240 FPS when available. Then open the Camera app and swipe to <strong className="text-white">SLO-MO</strong> before recording. Choosing a slower playback speed afterward does not create high-frame-rate footage.</p></div>
          <img src="/pitch-nav-slow-motion-guide.png?v=20260718" alt="Pitch Nav iPhone instructions showing Settings, Camera, Record Slo-mo, and selection of 240 FPS or 120 FPS" className="w-full rounded-xl border border-surface-border" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {['Open Settings', 'Tap Camera', 'Tap Record Slo-mo', 'Choose 1080p at 240 fps'].map((step, index) => <div key={step} className="rounded-lg border border-surface-border bg-navy-950 p-3 text-sm text-slate-300"><strong className="mr-2 text-electric-blue-light">{index + 1}.</strong>{step}</div>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-accent-green/10 p-3 text-sm font-bold text-accent-green">240 FPS · Preferred</div><div className="rounded-lg bg-electric-blue/10 p-3 text-sm font-bold text-electric-blue-light">120 FPS · Accepted</div><div className="rounded-lg bg-yellow-400/10 p-3 text-sm font-bold text-yellow-200">Below 120 · No velocity estimate</div></div>
        </section>

        <CameraAlignmentStudio />

        <section className="card mb-10 border-electric-blue/30">
          <div className="grid items-center gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <img
              src="/velocity-calibration-marker.svg"
              alt="Printable Pitch Nav automatic velocity calibration marker"
              className="mx-auto w-full max-w-sm rounded-xl bg-white p-3"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Required for an automatic velocity estimate</p>
              <h2 className="mt-2 text-2xl font-black text-white">Print and place the 8-inch calibration marker</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">The video worker finds this marker automatically, measures its known size, and uses it to convert ball movement from pixels into an estimated speed range. You do not click calibration points.</p>
              <ol className="mt-5 space-y-2 text-sm text-slate-300">
                <li><strong className="text-white">1.</strong> Print at <strong className="text-white">Actual Size / 100%</strong>—never “Fit to Page.”</li>
                <li><strong className="text-white">2.</strong> Confirm the black square measures exactly <strong className="text-white">8 × 8 inches</strong>.</li>
                <li><strong className="text-white">3.</strong> Mount it flat and vertical beside the pitcher, as close as safely possible to the pitcher’s throwing plane.</li>
                <li><strong className="text-white">4.</strong> Keep the complete marker visible from the start of the delivery through release.</li>
              </ol>
              <a href="/velocity-calibration-marker.svg" download="pitch-nav-velocity-calibration-marker.svg" className="btn-primary mt-6">Download printable marker</a>
              <p className="mt-4 text-xs leading-relaxed text-yellow-200">No marker, an obscured marker, 60 FPS footage, or an unreliable ball track produces “velocity unavailable”—not a guessed number. Results are video-estimated and require staff approval; radar remains the verified measurement.</p>
            </div>
          </div>
        </section>

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

        {/* Camera position diagram */}
        <div className="card mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light mb-1">
            {ANGLES.find((a) => a.key === activeAngle)?.label}
          </p>
          <h2 className="text-lg font-bold text-white mb-4">Camera Position, Top-Down</h2>
          <div className="mx-auto max-w-sm">
            <CameraPositionDiagram />
          </div>
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
                <AlertCircle className="h-4 w-4" /> Don&apos;t
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
            Confirm each item before submitting your video. You&apos;ll complete this checklist
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
            When using the Pitch Nav recording screen, a framing overlay will appear to help you
            center the pitcher and ensure the full body stays inside the frame. Use the overlay
            guides to position your phone before starting your session.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href={uploadReturnHref} className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
            {paidOrderId ? 'Return to My Paid Video Upload' : "I'm Ready — Start My Analysis"} <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CameraSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950 pt-24" />}>
      <CameraSetupContent />
    </Suspense>
  )
}

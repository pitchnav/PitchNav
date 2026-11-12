'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Eye, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CameraAlignmentStudio } from '@/components/camera/CameraAlignmentStudio'
import { CameraPlacementGuide, type ThrowingHand } from '@/components/camera/CameraPlacementGuide'

const CHECKLIST_ITEMS = [
  'Full body is visible from head to toe',
  'Throwing hand is visible through ball release',
  'Landing foot is visible throughout the pitch',
  'Video is not blurry or pixelated',
  'Camera does not move during the pitch',
  'Lighting is adequate — pitcher is not in shadow',
  'Video was recorded using the phone Camera app’s SLO-MO mode',
  'Video is recorded at normal game or bullpen intensity',
  'The camera is on the throwing-arm side',
]

const guide = {
    description: 'The open-side view films from the pitcher\'s throwing-arm side, approximately perpendicular to the direction of the pitch. This angle reveals hip and shoulder rotation, arm path, and release point.',
    position: 'Throwing-arm side, approximately perpendicular (90°) to the pitch direction.',
    distance: 'Start about 15 feet from the pitcher on the throwing-arm side.',
    height: 'Start with the lens about 6 feet high and level. Keep the full stride visible.',
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
}

function CameraSetupContent() {
  const searchParams = useSearchParams()
  const paidOrderId = searchParams.get('orderId')
  const uploadReturnHref = paidOrderId
    ? `/start-analysis/upload?orderId=${encodeURIComponent(paidOrderId)}`
    : '/start-analysis'
  const [hand, setHand] = useState<ThrowingHand>('right')
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item])

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="page-intro">
          <h1 className="page-title text-white">
            Film Your Mechanics Assessment
          </h1>
          <p>
            Film one complete delivery from your throwing-arm side. Keep your feet and throwing hand in frame through the finish. We can review your mechanics without knowing where the pitch landed. This guide is for mechanics reviews; Pitch Tracking uses a separate setup.
          </p>
        </header>

        <section className="card mb-10 overflow-hidden border-electric-blue/30">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Required recording mode</p><h2 className="mt-1 text-2xl font-black text-white">Use Slo-Mo for Your Mechanics Video</h2><p className="mt-2 text-sm text-slate-400">On iPhone, set Settings → Camera → Record Slo-mo to 1080p at 240 FPS when available. Then open the Camera app and swipe to <strong className="text-white">SLO-MO</strong> before recording. Choosing a slower playback speed afterward does not create high-frame-rate footage.</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {['Open Settings', 'Tap Camera', 'Tap Record Slo-mo', 'Choose 1080p at 240 fps'].map((step, index) => <div key={step} className="rounded-lg border border-surface-border bg-navy-950 p-3 text-sm text-slate-300"><strong className="mr-2 text-electric-blue-light">{index + 1}.</strong>{step}</div>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-accent-green/10 p-3 text-sm font-bold text-accent-green">240 FPS · Preferred</div><div className="rounded-lg bg-electric-blue/10 p-3 text-sm font-bold text-electric-blue-light">120 FPS · Accepted</div><div className="rounded-lg bg-yellow-400/10 p-3 text-sm font-bold text-yellow-200">Below 120 · Reduced measurement confidence</div></div>
        </section>

        <CameraPlacementGuide hand={hand} setHand={setHand} />
        <CameraAlignmentStudio hand={hand} />

        <section className="card mb-10 border-electric-blue/30">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Also part of your submission</p>
              <h2 className="mt-2 text-2xl font-black text-white">Movement screens use a different setup</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                The guide on this page covers your pitching video. The movement screens are short held
                positions filmed facing the camera, each with its own phone placement — on the floor, at
                knee height, or at chest height. They measure the physical capacity behind your delivery.
              </p>
            </div>
            <a href="/movement-screens" className="btn-secondary shrink-0">
              Movement screen guide <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Guide content */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Side-view recording notes
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

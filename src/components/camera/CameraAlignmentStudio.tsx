'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle, RotateCcw, ShieldCheck } from 'lucide-react'

const confirmations = [
  'Head stays inside the top guide',
  'Throwing hand stays inside the frame',
  'Mound and pivot foot are visible',
  'Landing foot remains inside the landing zone',
  'Full body is visible from head to toe',
]

// A restrained, anatomically proportioned reference silhouette in the
// balance/leg-lift position — replaces abstract circles/ovals with a pose an
// athlete can actually line their body up against. Grounded on a floor line
// with a mound, a flat rubber, a contact shadow, and a projected landing
// zone; thin strokes and small joint markers, no cartoon outline or fill.
function PitcherAlignmentGuide() {
  return (
    <svg
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* Ground line and mound slope */}
      <path
        d="M 0 83 L 70 83 Q 88 83 100 80.5 Q 110 79 160 82"
        fill="none"
        stroke="rgba(56,189,248,0.4)"
        strokeWidth={0.7}
      />
      {/* Pitching rubber, flat on the ground */}
      <rect x={90} y={79.4} width={15} height={1.8} rx={0.4} fill="rgba(248,250,252,0.85)" />
      {/* Projected landing zone for the lead foot */}
      <ellipse
        cx={126}
        cy={82.5}
        rx={9}
        ry={2.4}
        fill="none"
        stroke="rgba(0,229,160,0.75)"
        strokeDasharray="1.6 1.6"
        strokeWidth={0.7}
      />
      {/* Contact shadow under the pivot foot */}
      <ellipse cx={99} cy={82.5} rx={6} ry={1.4} fill="rgba(0,0,0,0.4)" />

      {/* Skeleton: pivot leg, torso, lead leg, arms */}
      <g fill="none" stroke="rgba(248,250,252,0.85)" strokeWidth={1.1} strokeLinecap="round">
        {/* Pivot (back) leg */}
        <path d="M 99 81 L 96 63 L 92.5 45.5" />
        {/* Spine */}
        <path d="M 92.5 45.5 L 85.5 27" />
        {/* Lead (raised) leg */}
        <path d="M 92.5 45.5 L 104 40 L 111 58" />
        {/* Throwing-side arm, bent to the balance-point hand position */}
        <path d="M 85.5 27 L 75 34 L 80 45" />
        {/* Glove-side arm */}
        <path d="M 85.5 27 L 91 35 L 81.5 45.5" />
      </g>

      {/* Head */}
      <circle cx={80.5} cy={18} r={6.2} fill="none" stroke="rgba(248,250,252,0.85)" strokeWidth={1.1} />

      {/* Joint markers — subtle tracking points, not decoration */}
      <g fill="#f8fafc" stroke="#7dd3fc" strokeWidth={0.5}>
        {[
          [85.5, 27], // shoulder
          [92.5, 45.5], // hip
          [96, 63], // pivot knee
          [99, 81], // pivot ankle
          [104, 40], // lead knee
          [111, 58], // lead ankle (lifted)
          [80, 45], // throwing hand
          [81.5, 45.5], // glove hand
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={1.3} />
        ))}
      </g>
    </svg>
  )
}

export function CameraAlignmentStudio() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  async function startCamera() {
    setError('')
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
    } catch {
      setError('Camera access was blocked. Allow camera permission in your browser settings, then try again.')
    }
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])
  const ready = confirmations.every((item) => checks[item])

  return <section className="card mb-10 overflow-hidden">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Live alignment check</p><h2 className="mt-1 text-2xl font-black text-white">Line up the complete delivery</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Use this preview before recording. It guides positioning but cannot automatically guarantee that the hand or release remains visible.</p></div>
      <button type="button" onClick={startCamera} className="btn-primary shrink-0"><Camera className="h-4 w-4" /> {active ? 'Restart camera' : 'Open camera'}</button>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-electric-blue/30 bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {!active && (
          <div className="absolute inset-0 flex items-start justify-center bg-navy-950 pt-3">
            <Camera className="h-6 w-6 text-slate-600" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-[6%] rounded-2xl border-2 border-dashed border-electric-blue/70">
          <PitcherAlignmentGuide />
          <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold leading-tight text-white sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[10px]">HEAD + FULL BODY</span>
          <span className="absolute left-[46%] top-[56%] rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold leading-tight text-electric-blue-glow sm:px-2 sm:py-1 sm:text-[10px]">THROWING HAND</span>
          <span className="absolute bottom-[24%] left-[61%] -translate-x-1/2 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold leading-tight text-electric-blue-light sm:px-2 sm:py-1 sm:text-[10px]">MOUND</span>
          <span className="absolute bottom-[6%] right-[3%] rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold leading-tight text-accent-green sm:right-[4%] sm:px-2 sm:py-1 sm:text-[10px]">LANDING FOOT</span>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-2 gap-2">{['15 feet away','6 feet high','Side view','Full body visible','240 FPS preferred','120 FPS accepted'].map((item) => <div key={item} className="rounded-lg border border-surface-border bg-navy-950 p-3 text-xs font-semibold text-slate-300">{item}</div>)}</div>
        <div className="mt-4 space-y-2">{confirmations.map((item) => <label key={item} className="flex cursor-pointer items-start gap-3 rounded-lg bg-navy-950 p-3"><input type="checkbox" checked={!!checks[item]} onChange={(event) => setChecks((current) => ({ ...current, [item]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-electric-blue" /><span className="text-sm text-slate-300">{item}</span>{checks[item] && <CheckCircle className="ml-auto h-4 w-4 shrink-0 text-accent-green" />}</label>)}</div>
        <div className={`mt-4 flex items-center gap-3 rounded-lg border p-3 text-sm ${ready ? 'border-accent-green/30 bg-accent-green/10 text-accent-green' : 'border-surface-border bg-navy-950 text-slate-400'}`}><ShieldCheck className="h-5 w-5" />{ready ? 'Alignment checklist complete' : 'Confirm all five items before recording'}</div>
      </div>
    </div>
    {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
  </section>
}

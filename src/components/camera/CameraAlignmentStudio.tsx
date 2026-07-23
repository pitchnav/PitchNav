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
      <defs>
        <linearGradient id="alignment-mound" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#72543b" stopOpacity="0.72" />
          <stop offset="1" stopColor="#211913" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Side-view ground plane, measurement ticks and left-to-right mound. */}
      <g fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth={0.35}>
        <path d="M 0 84 H 160" />
        <path d="M 0 87 H 160" />
        {Array.from({ length: 17 }, (_, index) => (
          <path key={index} d={`M ${index * 10} 83.6 V 89`} />
        ))}
      </g>
      <path
        d="M 47 84 C 62 83.5 74 80.7 88 79.4 H 100 C 111 80 124 82.2 143 84 Z"
        fill="url(#alignment-mound)"
        stroke="rgba(180,135,91,0.58)"
        strokeWidth={0.55}
      />
      {/* Pitching rubber, flat on the mound plateau. */}
      <rect x={88} y={78.8} width={13} height={1.5} rx={0.25} fill="rgba(248,250,252,0.9)" />
      {/* Projected landing zone for the lead foot */}
      <ellipse
        cx={126}
        cy={83.2}
        rx={9}
        ry={2.4}
        fill="none"
        stroke="rgba(0,229,160,0.75)"
        strokeDasharray="1.6 1.6"
        strokeWidth={0.7}
      />
      {/* Contact shadow under the pivot foot */}
      <ellipse cx={96.5} cy={81.9} rx={5.2} ry={0.9} fill="rgba(0,0,0,0.5)" />

      {/* Anatomical side-view reference: paired long-bone shafts, spine,
          shoulder girdle, rib cage and pelvis. */}
      <g fill="none" stroke="rgba(248,250,252,0.88)" strokeLinecap="round" strokeLinejoin="round">
        {/* Skull, mandible and neck */}
        <path d="M 75.2 13.8 C 77.1 9.6 83.8 9.1 86.7 12.8 C 89 15.8 88.4 21.1 85.2 23.5 L 82.5 25.3 L 78.2 23.7 C 74.5 21.2 73.6 17.1 75.2 13.8 Z" strokeWidth={0.85} />
        <path d="M 86.4 16.3 L 89.2 18.1 L 86.2 21.2 L 83.1 23.8" strokeWidth={0.65} />
        <path d="M 79.5 24 L 80.8 28.2 M 84.2 24.2 L 84.7 28.2" strokeWidth={0.65} />

        {/* Clavicles, sternum, spine and rib cage */}
        <path d="M 72.8 29.4 Q 81.8 26.7 91.8 29.8 M 82.1 28.2 L 85.2 45.3" strokeWidth={0.8} />
        <path d="M 82.1 28.6 L 82.8 44.8" strokeWidth={0.55} />
        <ellipse cx={82.5} cy={33.2} rx={8.2} ry={2.8} strokeWidth={0.55} />
        <ellipse cx={83} cy={36.6} rx={7.8} ry={2.7} strokeWidth={0.55} />
        <ellipse cx={83.5} cy={40} rx={6.8} ry={2.4} strokeWidth={0.55} />
        <path d="M 76.7 44.6 Q 83.7 50.5 91.8 44.8 Q 84.2 42.6 76.7 44.6 Z" strokeWidth={0.75} />

        {/* Pivot leg: paired femur and tibia shafts, foot on the rubber */}
        <path d="M 85.5 47 L 92.8 63 M 87.2 46.3 L 94.3 62.4" strokeWidth={0.72} />
        <path d="M 93 64.2 L 95.1 79.8 M 94.7 63.8 L 96.8 79.6" strokeWidth={0.68} />
        <path d="M 95.4 80 L 101.5 81.1 L 95.3 82" strokeWidth={0.72} />

        {/* Raised lead leg */}
        <path d="M 81 47 L 101.8 40.3 M 82.2 48.2 L 102.4 42" strokeWidth={0.72} />
        <path d="M 102.7 41 L 109.3 57.7 M 104.3 40.6 L 111 57" strokeWidth={0.68} />
        <path d="M 109.7 58.2 L 116.5 58.6 L 111 60.1" strokeWidth={0.72} />

        {/* Throwing and glove arms */}
        <path d="M 74 29.5 L 67.1 35.4 M 75 30.7 L 68.4 36.5" strokeWidth={0.65} />
        <path d="M 67.6 36 L 76.8 44.6 M 69 35.2 L 78.1 43.8" strokeWidth={0.62} />
        <path d="M 91 29.7 L 96 35.1 M 90 30.8 L 94.8 36.2" strokeWidth={0.65} />
        <path d="M 95.4 35.6 L 84.8 44.6 M 96.4 36.7 L 85.8 45.5" strokeWidth={0.62} />
        {/* Compact hand outlines */}
        <path d="M 76.8 44.5 L 79.8 46 L 77.8 47.1 L 75.4 45.8 Z M 84.8 44.7 L 82.1 46.3 L 84 47.3 L 86.3 45.8 Z" strokeWidth={0.5} />
      </g>

      {/* Joint markers — subtle tracking points, not decoration */}
      <g fill="rgba(8,15,27,0.94)" stroke="#7dd3fc" strokeWidth={0.55}>
        {[
          [73.6, 29.8], // throwing shoulder
          [91.3, 30], // glove shoulder
          [81.6, 46.5], // lead hip
          [86.3, 46.4], // pivot hip
          [93.8, 63.2], // pivot knee
          [96, 80.3], // pivot ankle
          [103.1, 41.2], // lead knee
          [110.2, 58.2], // lead ankle
          [68.2, 35.8], // throwing elbow
          [77.2, 45.5], // throwing hand
          [95.5, 35.7], // glove elbow
          [85.1, 45.4], // glove hand
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={1.05} />
            <path d={`M ${cx - 1.7} ${cy} H ${cx + 1.7} M ${cx} ${cy - 1.7} V ${cy + 1.7}`} stroke="rgba(248,250,252,0.55)" strokeWidth={0.28} />
          </g>
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

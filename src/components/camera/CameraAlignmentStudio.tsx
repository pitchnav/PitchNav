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
        {!active && <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-950 text-center"><Camera className="h-10 w-10 text-slate-600" /><p className="mt-3 text-sm text-slate-400">Open the camera to display the alignment overlay</p></div>}
        <div className="pointer-events-none absolute inset-[6%] rounded-[2rem] border-2 border-dashed border-electric-blue/70">
          <div className="absolute left-1/2 top-[4%] h-[15%] w-[10%] -translate-x-1/2 rounded-full border-2 border-white/75" />
          <div className="absolute left-1/2 top-[19%] h-[43%] w-[20%] -translate-x-1/2 rounded-[45%] border-2 border-white/70" />
          <div className="absolute left-[22%] top-[25%] h-[28%] w-[28%] rounded-full border border-dashed border-yellow-300/80" />
          <div className="absolute bottom-[2%] left-[34%] h-[12%] w-[32%] rounded-[50%] border-2 border-electric-blue/80" />
          <div className="absolute bottom-[3%] right-[3%] h-[12%] w-[26%] rounded-lg border-2 border-dashed border-accent-green/80" />
          <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white">HEAD + FULL BODY</span>
          <span className="absolute left-[23%] top-[23%] rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-yellow-200">THROWING HAND</span>
          <span className="absolute bottom-[14%] left-[42%] rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-electric-blue-light">MOUND</span>
          <span className="absolute bottom-[16%] right-[4%] rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-accent-green">LANDING FOOT</span>
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

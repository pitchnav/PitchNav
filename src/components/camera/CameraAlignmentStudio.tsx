'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ShieldCheck } from 'lucide-react'
import { DeliveryFramingFigure } from './DeliveryFramingFigure'
import type { ThrowingHand } from './CameraPlacementGuide'

const checks = [
  'Head stays inside the top of the frame',
  'Throwing hand stays visible through release',
  'Mound and pivot foot are visible',
  'Front foot stays in frame when it lands',
  'Full body stays in view through the finish',
]

export function CameraAlignmentStudio({ hand }: { hand: ThrowingHand }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const request = useRef(0)
  const [active, setActive] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState<string[]>([])

  useEffect(() => () => {
    request.current++
    stream.current?.getTracks().forEach(track => track.stop())
  }, [])

  function close() {
    request.current++
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setActive(false)
    setPending(false)
  }

  async function open() {
    const token = ++request.current
    setPending(true)
    setError('')
    try {
      const feed = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      if (token !== request.current || !video.current) {
        feed.getTracks().forEach(track => track.stop())
        return
      }
      stream.current = feed
      video.current.srcObject = feed
      await video.current.play()
      if (token === request.current) setActive(true)
    } catch {
      if (token === request.current) {
        close()
        setError('Couldn’t open the camera. Check your browser’s camera permission or use the illustration to check your framing.')
      }
    } finally {
      if (token === request.current) setPending(false)
    }
  }

  return (
    <section id="framing" aria-labelledby="framing-title" className="card mb-10 scroll-mt-24 bg-gradient-to-br from-[#103b53] to-[#0d3045] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.17em] text-electric-blue-light">Live alignment check</p>
          <h2 id="framing-title" className="mt-1 text-2xl font-black text-white">Line up the complete delivery</h2>
        </div>
        <button className={active ? 'btn-secondary' : 'btn-action'} type="button" disabled={pending} onClick={active ? close : open}>
          <Camera size={17} aria-hidden="true"/>{pending ? 'Opening camera…' : active ? 'Close camera' : 'Open camera'}
        </button>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200">Make a slow practice throw. Check that your hand and both feet stay in view from leg lift through the finish.</p>
      {error && <p className="mt-3 text-sm text-orange-200" role="alert">{error}</p>}
      <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div hidden={active}><DeliveryFramingFigure hand={hand}/></div>
          <div hidden={!active}>
            <div className="flex justify-center overflow-hidden rounded-xl bg-black">
              <div className="relative inline-grid max-w-full">
                <video ref={video} muted playsInline className="block h-auto max-h-[60vh] w-auto max-w-full" aria-label="Live camera framing preview"/>
                <div aria-hidden="true" className="pointer-events-none absolute inset-[4%] rounded-lg border border-dashed border-cyan-200/80"/>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-200">Live preview only. Record in your phone’s Camera app.</p>
          </div>
        </div>
        <div className="space-y-3">
          <ul aria-label="Suggested recording setup" className="grid grid-cols-2 gap-1.5">
            {['15 ft away', '6 ft high', 'Side view', 'Full body visible', '240 fps preferred', '120 fps accepted'].map(label => (
              <li key={label} className="rounded-md border border-white/20 bg-navy-950/50 px-2.5 py-2 text-xs font-semibold text-slate-100 sm:text-sm">{label}</li>
            ))}
          </ul>
          <fieldset className="space-y-1.5">
            <legend className="sr-only">Framing checklist</legend>
            {checks.map(item => (
              <label key={item} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md bg-navy-950/75 px-3 py-2 text-sm leading-snug text-slate-100">
                <input type="checkbox" checked={checked.includes(item)} onChange={event => {
                  const on = event.target.checked
                  setChecked(current => on ? [...current, item] : current.filter(value => value !== item))
                }} className="h-4 w-4 shrink-0 accent-electric-blue"/>
                {item}
              </label>
            ))}
          </fieldset>
          <p role="status" className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-electric-blue-light">
            <ShieldCheck aria-hidden="true" size={18} className="shrink-0"/>
            {checked.length === checks.length ? 'Framing checklist complete. You’re ready to record.' : `${checked.length} of ${checks.length} framing checks confirmed`}
          </p>
        </div>
      </div>
    </section>
  )
}

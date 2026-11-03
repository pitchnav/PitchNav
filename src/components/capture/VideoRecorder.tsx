'use client'

import { useEffect, useRef, useState } from 'react'

export function VideoRecorder({ onUse, disabled = false, purpose }: { onUse: (file: File, capture?: { normalSpeed: true; cameraFps?: number }) => void | Promise<void>; disabled?: boolean; purpose: string }) {
  const preview = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const mounted = useRef(true)
  const generation = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const url = useRef('')
  const cameraFps = useRef<number | undefined>(undefined)
  const [state, setState] = useState<'idle' | 'opening' | 'ready' | 'recording' | 'review' | 'using'>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [format, setFormat] = useState('')

  function stopTracks() {
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (preview.current) preview.current.srcObject = null
    if (timer.current) clearTimeout(timer.current)
  }
  function reset() {
    generation.current++
    if (recorder.current) {
      recorder.current.onstop = null
      recorder.current.ondataavailable = null
      if (recorder.current.state !== 'inactive') recorder.current.stop()
      recorder.current = null
    }
    stopTracks()
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = ''
  }
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; reset() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function openCamera() {
    reset(); setFile(null); setError(''); setState('opening')
    const ticket = generation.current
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record here. Use the phone camera option below or upload a video.')
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }, audio: false })
      if (!mounted.current || ticket !== generation.current) { media.getTracks().forEach(track => track.stop()); return }
      stream.current = media
      const settings = media.getVideoTracks()[0].getSettings()
      cameraFps.current = settings.frameRate
      setFormat(`${settings.width ?? '?'} × ${settings.height ?? '?'} · ${settings.frameRate ? Math.round(settings.frameRate) : '?'} fps camera setting; actual clip timing may vary`)
      if (preview.current) { preview.current.srcObject = media; await preview.current.play() }
      if (mounted.current && ticket === generation.current) setState('ready')
    } catch (reason) {
      if (mounted.current && ticket === generation.current) {
        stopTracks(); setState('idle')
        setError(reason instanceof DOMException && reason.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser, or use a saved video.' : reason instanceof Error ? reason.message : 'Could not open the camera.')
      }
    }
  }
  function start() {
    if (!stream.current) return
    try {
      const mime = ['video/mp4', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type))
      const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined)
      recorder.current = rec
      const ticket = generation.current
      const chunks: Blob[] = []
      let bytes = 0
      rec.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size }
        if (bytes > 100 * 1024 * 1024 && rec.state === 'recording') rec.stop()
      }
      rec.onerror = () => { reset(); if (mounted.current) { setState('idle'); setError('Recording stopped unexpectedly. Try again or use a saved video.') } }
      rec.onstop = () => {
        stopTracks()
        if (!mounted.current || ticket !== generation.current) return
        const type = rec.mimeType || chunks[0]?.type || 'video/webm'
        const clip = new File(chunks, `pitch-nav-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type })
        if (!clip.size) { setError('No video was recorded. Try again.'); setState('idle'); return }
        url.current = URL.createObjectURL(clip); setFile(clip); setState('review')
      }
      rec.start(250); setState('recording')
      timer.current = setTimeout(() => { if (rec.state === 'recording') rec.stop() }, 60000)
    } catch { stopTracks(); setState('idle'); setError('This camera could not start recording. Use your phone camera or upload instead.') }
  }
  return <section className="card space-y-4" aria-label={`Record ${purpose}`}>
    <div><h3 className="text-lg font-bold text-white">Record {purpose}</h3><p className="mt-2 text-sm text-slate-400">Set the phone down, keep your full body in frame, and record one rep. Review it before using it. Camera only, no microphone. Clips stop after one minute.</p></div>
    <video ref={preview} hidden={!['opening','ready','recording'].includes(state)} autoPlay muted playsInline className="max-h-96 w-full rounded-xl bg-black" />
    {['ready','recording'].includes(state) && <p className="text-xs text-slate-400">{format}</p>}
    {state === 'review' && <video controls playsInline src={url.current} className="max-h-96 w-full rounded-xl bg-black" />}
    <div className="flex flex-wrap gap-3">
      {state === 'idle' && <button type="button" disabled={disabled} onClick={openCamera} className="btn-primary">Open camera</button>}
      {state === 'opening' && <p role="status">Opening camera…</p>}
      {state === 'ready' && <button type="button" disabled={disabled} onClick={start} className="btn-primary">Start recording</button>}
      {state === 'recording' && <button type="button" onClick={() => recorder.current?.stop()} className="btn-primary">Stop recording</button>}
      {state === 'review' && <><button type="button" disabled={disabled} className="btn-primary" onClick={async () => { if (!file) return; setState('using'); try { await onUse(file, { normalSpeed: true, cameraFps: cameraFps.current }); reset(); if (mounted.current) { setFile(null); setState('idle') } } catch { if (mounted.current) { setError('Could not use this recording. Try again.'); setState('review') } } }}>Use recording</button><button type="button" onClick={openCamera} className="btn-secondary">Record again</button></>}
      {state === 'using' && <p role="status">Preparing your recording…</p>}
      {['opening','ready','recording','review'].includes(state) && <button type="button" className="btn-secondary" onClick={() => { reset(); setFile(null); setState('idle') }}>Cancel</button>}
    </div>
    {state === 'idle' && <label className="inline-block cursor-pointer text-sm font-semibold text-electric-blue-light">Use phone camera<input aria-label={`Record ${purpose} with phone camera`} className="sr-only" type="file" accept="video/*" capture="environment" disabled={disabled} onChange={event => { const next = event.target.files?.[0]; event.currentTarget.value = ''; if (next) void Promise.resolve(onUse(next)).catch(() => setError('Could not use that recording. Try a saved video.')) }} /></label>}
    <p className="text-xs text-slate-400">For detailed arm timing, record slow motion in your phone’s Camera app and upload it. Browser recording does not guarantee 120 or 240 fps. Recording here does not submit a report.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>
}

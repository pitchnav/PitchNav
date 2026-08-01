'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Film, Upload } from 'lucide-react'
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision'
import { probeVideoFile, ACCEPTED_VIDEO_TYPES } from '@/lib/video-support'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task'

const CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29],
  [29, 31], [27, 31], [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
]

/**
 * Staff-only tracker export.
 *
 * Deliberately separate from the athlete Motion Lab: this produces a shareable
 * clip and nothing else. It creates no analysis, no order, no report and no
 * athlete record, so marketing footage can never be mistaken for a customer's
 * assessment or leave stray rows behind.
 *
 * Everything runs in the browser. The video is never uploaded anywhere.
 */
export function TrackerStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const animationRef = useRef<number | null>(null)

  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [lineWidth, setLineWidth] = useState(4)
  const [showDots, setShowDots] = useState(true)
  const [speed, setSpeed] = useState(1)

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    landmarkerRef.current?.close()
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
  }, [fileUrl, downloadUrl])

  const initializeModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    setStatus('Loading pose tracking…')
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
    )
    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    return landmarkerRef.current
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

    context.drawImage(video, 0, 0, width, height)

    const result = landmarker.detectForVideo(video, performance.now())
    const landmarks = result.landmarks[0] as NormalizedLandmark[] | undefined
    if (!landmarks) return

    const scale = Math.max(1, width / 1080)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.shadowBlur = 14 * scale
    context.shadowColor = '#2563eb'
    for (const [start, end] of CONNECTIONS) {
      const a = landmarks[start]
      const b = landmarks[end]
      if (!a || !b) continue
      if (Math.min(a.visibility ?? 0, b.visibility ?? 0) < 0.45) continue
      context.beginPath()
      context.moveTo(a.x * width, a.y * height)
      context.lineTo(b.x * width, b.y * height)
      context.strokeStyle = '#38bdf8'
      context.lineWidth = lineWidth * scale
      context.stroke()
    }
    if (showDots) {
      context.shadowBlur = 8 * scale
      for (const landmark of landmarks) {
        if ((landmark.visibility ?? 0) < 0.45) continue
        context.beginPath()
        context.arc(landmark.x * width, landmark.y * height, (lineWidth * 0.85) * scale, 0, Math.PI * 2)
        context.fillStyle = '#ffffff'
        context.fill()
      }
    }
    context.shadowBlur = 0
  }, [lineWidth, showDots])

  async function handleFile(file: File) {
    // A QuickTime container is fine when it holds H.264; only HEVC is the
    // problem, so probe the file rather than judging it by extension.
    setError('')
    setStatus('Checking the video…')
    const probe = await probeVideoFile(file)
    setStatus('')
    if (!probe.ok) {
      setError(probe.problem ?? 'This video could not be read in this browser.')
      return
    }
    setStatus('')
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl('')
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    const video = videoRef.current
    if (video) {
      video.src = url
      video.load()
    }
  }

  async function renderTrackedVideo() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !fileUrl) return
    if (!('MediaRecorder' in window)) {
      setError('This browser cannot record the overlay. Use Chrome on a desktop computer.')
      return
    }
    setBusy(true)
    setError('')
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl('')
    try {
      await initializeModel()
      setStatus('Rendering the tracked clip…')

      video.pause()
      video.playbackRate = speed
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        if (Math.abs(video.currentTime) < 0.001) return resolve()
        video.addEventListener('seeked', done, { once: true })
        video.currentTime = 0
        window.setTimeout(done, 1500)
      })
      drawFrame()

      chunksRef.current = []
      const stream = canvas.captureStream(30)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 })
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: 'video/webm' }))
      })

      recorder.start()
      await video.play()

      const loop = () => {
        drawFrame()
        if (!video.paused && !video.ended) {
          animationRef.current = requestAnimationFrame(loop)
        } else if (recorder.state !== 'inactive') {
          recorder.stop()
        }
      }
      loop()

      // Hard stop so a stalled decode cannot leave the recorder running forever.
      const watchdog = window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
      }, Math.ceil(((video.duration || 30) / speed) * 1000) + 8000)

      const blob = await finished
      window.clearTimeout(watchdog)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)

      if (!blob.size) {
        throw new Error('The recording came back empty. Try a shorter clip or reload the page.')
      }
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('Done. Your tracked clip is ready to download.')
    } catch (reason) {
      console.error(reason)
      setError(reason instanceof Error ? reason.message : 'Could not render the tracked clip.')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start gap-3">
          <Film className="mt-0.5 h-5 w-5 shrink-0 text-electric-blue-light" />
          <p className="text-sm text-slate-400">
            Staff tool for making shareable clips. It draws the pose trackers over your footage and gives you a file to
            download. It does <span className="text-white">not</span> create an analysis, an order, or an athlete record,
            so nothing here can be confused with a customer report. Your video stays in this browser and is never uploaded.
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 p-8 text-center transition hover:border-electric-blue/50">
          <Upload className="h-7 w-7 text-electric-blue-light" />
          <span className="font-semibold text-white">{fileUrl ? 'Choose a different video' : 'Choose a video'}</span>
          <span className="text-xs text-slate-500">MP4, MOV or WebM</span>
          <input
            type="file"
            accept={ACCEPTED_VIDEO_TYPES}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) handleFile(file)
              event.currentTarget.value = ''
            }}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-slate-300">
            <span className="label">Line thickness</span>
            <input
              type="range" min={2} max={10} step={1} value={lineWidth}
              onChange={(event) => setLineWidth(Number(event.target.value))}
              className="w-full accent-electric-blue"
            />
          </label>
          <label className="text-sm text-slate-300">
            <span className="label">Playback speed</span>
            <select className="input" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={0.25}>0.25× (slow motion)</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1× (normal)</option>
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm text-slate-300">
            <input
              type="checkbox" checked={showDots}
              onChange={(event) => setShowDots(event.target.checked)}
              className="mb-2 h-5 w-5 accent-electric-blue"
            />
            <span className="mb-1.5">Show joint dots</span>
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="hidden" muted playsInline preload="auto" onLoadedData={() => drawFrame()} />
          <canvas ref={canvasRef} className="h-full w-full object-contain" aria-label="Tracked video preview" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={renderTrackedVideo} disabled={!fileUrl || busy}>
            {busy ? 'Rendering…' : 'Render tracked video'}
          </button>
          {downloadUrl && (
            <a className="btn-accent" href={downloadUrl} download={`${fileName || 'pitch-nav'}-tracked.webm`}>
              <Download className="h-4 w-4" /> Download clip
            </a>
          )}
          {status && <span className="text-sm text-electric-blue-light">{status}</span>}
        </div>

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}

        {downloadUrl && (
          <p className="text-xs text-slate-500">
            Saved as .webm, which posts fine to most platforms. If somewhere rejects it, open it in QuickTime or any
            converter and export as MP4.
          </p>
        )}
      </div>
    </div>
  )
}

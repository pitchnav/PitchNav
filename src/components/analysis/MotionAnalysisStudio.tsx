'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Download, Pause, Play, RotateCcw, Upload, Video } from 'lucide-react'
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision'

type Handedness = 'right' | 'left'

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

function formatAngle(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}°`
}

function formatTime(value: number | null) {
  if (value === null) return '—'
  return `${value.toFixed(2)}s`
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

export function MotionAnalysisStudio() {
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

  const [fileUrl, setFileUrl] = useState<string | null>(null)
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
      setError('The pose model could not load. Check your connection and try again.')
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

      const horizon = height * 0.7
      context.save()
      context.strokeStyle = 'rgba(37, 99, 235, 0.34)'
      context.lineWidth = Math.max(1, width / 1000)
      for (let row = 0; row <= 8; row += 1) {
        const t = row / 8
        const y = horizon + Math.pow(t, 1.7) * (height - horizon)
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }
      for (let column = -8; column <= 8; column += 1) {
        const bottomX = width / 2 + column * (width / 8)
        context.beginPath()
        context.moveTo(width / 2, horizon)
        context.lineTo(bottomX, height)
        context.stroke()
      }
      context.restore()

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
        context.strokeStyle = exportStyleRef.current
          ? (visibility > 0.75 ? '#f8fafc' : '#facc15')
          : (visibility > 0.75 ? '#38bdf8' : '#facc15')
        context.lineWidth = exportStyleRef.current ? Math.max(5, width / 190) : Math.max(3, width / 350)
        context.stroke()
      }
      context.shadowBlur = 8
      landmarks.forEach((landmark) => {
        if ((landmark.visibility ?? 0) < 0.45) return
        context.beginPath()
        context.arc(landmark.x * width, landmark.y * height, Math.max(3, width / 260), 0, Math.PI * 2)
        context.fillStyle = (landmark.visibility ?? 0) > 0.75
          ? (exportStyleRef.current ? '#38bdf8' : '#ffffff')
          : '#facc15'
        context.fill()
      })
      context.shadowBlur = 0
    }

    setProgress(video.duration ? video.currentTime / video.duration : 0)
  }, [handedness])

  const renderLoop = useCallback(() => {
    drawFrame()
    if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
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
    setFileUrl(URL.createObjectURL(file))
    setFileName(file.name)
    analyzingRef.current = false
    exportingRef.current = false
    setAnalyzing(false)
    setExporting(false)
    setSummary(null)
    setMetrics(null)
    setProgress(0)
    setError('')
    await initializeModel()
  }

  async function togglePlayback() {
    const video = videoRef.current
    if (!video || !fileUrl) return
    if (!landmarkerRef.current && !(await initializeModel())) return
    if (video.paused) {
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
      setError('No sufficiently visible pose was detected. Try a clearer full-body video.')
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
    video.currentTime = 0
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
    video.pause()
    setPlaying(false)
    video.playbackRate = 1
    exportStyleRef.current = true

    // Seeking is asynchronous. Recording before it finishes was the cause of
    // exports beginning near the end and containing only a few seconds.
    if (video.currentTime !== 0) {
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        video.addEventListener('seeked', done, { once: true })
        video.currentTime = 0
      })
    } else {
      video.currentTime = 0
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
      }, Math.ceil(video.duration * 1000) + 5000)
    } catch (reason) {
      console.error(reason)
      if (recorder.state !== 'inactive') recorder.stop()
      setError('The browser blocked video rendering. Press Play once, then try the download again.')
    }
  }

  const metricCards = useMemo(() => [
    { label: 'Throwing elbow', value: formatAngle(metrics?.throwingElbow ?? null) },
    { label: 'Lead knee', value: formatAngle(metrics?.leadKnee ?? null) },
    { label: 'Trunk tilt', value: formatAngle(metrics?.trunkTilt ?? null) },
    { label: 'Hip–shoulder separation', value: formatAngle(metrics?.hipShoulderSeparation ?? null) },
  ], [metrics])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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

      {!fileUrl ? (
        <label className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface-card p-8 text-center transition hover:border-electric-blue hover:bg-surface-hover">
          <Upload className="h-12 w-12 text-electric-blue-light" />
          <span className="mt-4 text-lg font-bold text-white">Choose a pitching video</span>
          <span className="mt-2 max-w-md text-sm text-slate-400">
            Use a stationary, full-body open-side video. Slow motion at 120 or 240 FPS produces better frame selection.
          </span>
          <span className="mt-4 text-xs text-slate-500">MP4, MOV or WebM · maximum 500 MB</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="sr-only"
            onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
          />
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
                onLoadedData={() => drawFrame()}
                onEnded={() => {
                  setPlaying(false)
                  if (analyzingRef.current) finishAnalysis()
                  if (exportingRef.current) recorderRef.current?.stop()
                }}
              />
              <canvas ref={canvasRef} className="h-full w-full object-contain" />
              {modelStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-950/80 text-sm text-white">
                  Loading pose model…
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-surface-border bg-navy-900 p-4">
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
                  video.currentTime = Number(event.target.value) * video.duration
                  setProgress(Number(event.target.value))
                  drawFrame()
                }}
                className="w-full accent-electric-blue"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={togglePlayback} className="btn-primary px-4 py-2">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button type="button" onClick={analyzeFullClip} disabled={analyzing || exporting} className="btn-accent px-4 py-2">
                  <Activity className="h-4 w-4" /> {analyzing ? 'Analyzing…' : 'Analyze full clip'}
                </button>
                <label className="btn-secondary cursor-pointer px-4 py-2">
                  <RotateCcw className="h-4 w-4" /> Replace
                  <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
                </label>
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

      {summary && (
        <section className="card">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Clip summary</h2>
              <p className="mt-1 text-sm text-slate-400">{summary.frames} accepted samples · {Math.round(summary.averageConfidence * 100)}% average landmark confidence</p>
            </div>
            <button type="button" onClick={exportOverlay} disabled={exporting} className="btn-primary">
              <Download className="h-4 w-4" /> {exporting ? 'Rendering full clip…' : 'Download mocap-style video'}
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

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <div className="text-electric-blue-light">{icon}</div>
      <h3 className="mt-3 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  )
}

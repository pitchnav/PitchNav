'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Upload, Video } from 'lucide-react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { createClient } from '@/lib/supabase/client'
import {
  MOVEMENT_SCREENS,
  classifyScreenValue,
  summarizeScreenSession,
  type MovementScreen,
  type ScreenResult,
  type ScreenSide,
  type LandmarkPoint,
} from '@/lib/movement-screens'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task'

/** Every capture step the athlete works through, in order. */
type CaptureStep = { screen: MovementScreen; side: ScreenSide }

function buildSteps(): CaptureStep[] {
  // Core screens only. A long screening session gets abandoned or rushed, and
  // a rushed screen produces a worse number than no screen at all.
  return MOVEMENT_SCREENS.filter((screen) => screen.core).flatMap((screen) =>
    screen.bilateral
      ? [
          { screen, side: 'left' as ScreenSide },
          { screen, side: 'right' as ScreenSide },
        ]
      : [{ screen, side: 'single' as ScreenSide }],
  )
}

function stepKey(step: CaptureStep) {
  return `${step.screen.id}:${step.side}`
}

function sideWord(side: ScreenSide) {
  return side === 'single' ? '' : side === 'left' ? 'Left' : 'Right'
}

export function MovementScreenStudio() {
  const supabase = useMemo(() => createClient(), [])
  const steps = useMemo(() => buildSteps(), [])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)

  const [stepIndex, setStepIndex] = useState(0)
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [measuring, setMeasuring] = useState(false)
  const [error, setError] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [results, setResults] = useState<Record<string, ScreenResult>>({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const step = steps[stepIndex]
  const currentResult = step ? results[stepKey(step)] : undefined

  useEffect(() => {
    return () => {
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

  const initializeModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    setModelStatus('loading')
    try {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
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
      setError('Could not start movement tracking. Check your connection and try again.')
      return null
    }
  }, [])

  /**
   * Walks the clip with explicit seeks rather than real-time playback. The
   * same throttling that starves a played-through video on a backgrounded or
   * low-power device would otherwise silently under-sample a screen and
   * report a limitation the athlete does not have.
   */
  async function measureCurrentStep(file: File) {
    if (!step) return
    const landmarker = await initializeModel()
    if (!landmarker) return
    const video = videoRef.current
    if (!video) return

    setMeasuring(true)
    setError('')
    try {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => resolve()
        const onError = () => reject(new Error('This video could not be played in this browser. Re-record or export as a standard MP4.'))
        video.addEventListener('loadeddata', onReady, { once: true })
        video.addEventListener('error', onError, { once: true })
        window.setTimeout(onReady, 8000)
      })

      const duration = video.duration
      if (!duration || !Number.isFinite(duration)) {
        throw new Error('This video has no readable length. Re-record it and try again.')
      }

      const samples: Array<{ value: number; confidence: number }> = []
      const sampleCount = Math.min(120, Math.max(30, Math.round(duration * 12)))
      for (let i = 0; i <= sampleCount; i += 1) {
        const target = Math.min(duration - 0.01, (duration * i) / sampleCount)
        if (Math.abs(video.currentTime - target) > 0.002) {
          await new Promise<void>((resolve) => {
            let settled = false
            const finish = () => {
              if (settled) return
              settled = true
              video.removeEventListener('seeked', finish)
              resolve()
            }
            video.addEventListener('seeked', finish, { once: true })
            video.currentTime = target
            window.setTimeout(finish, 800)
          })
        }
        const detection = landmarker.detectForVideo(video, performance.now())
        const landmarks = detection.landmarks[0] as LandmarkPoint[] | undefined
        if (!landmarks) continue
        const measurement = step.screen.measure(landmarks, step.side)
        if (measurement.value === null || !Number.isFinite(measurement.value)) continue
        // Ignore frames where the joints this screen depends on were not
        // clearly visible, rather than letting a bad frame set the result.
        if (measurement.confidence < 0.5) continue
        samples.push({ value: measurement.value, confidence: measurement.confidence })
      }

      if (samples.length < 5) {
        setResults((prior) => ({
          ...prior,
          [stepKey(step)]: {
            screen_id: step.screen.id,
            side: step.side,
            value: null,
            unit: step.screen.unit,
            confidence: 0,
            classification: 'unmeasured',
            reliability: step.screen.reliability,
            problem: 'We could not see the joints for this screen clearly enough. Re-record with your whole body in frame, better lighting, and the camera placed as described.',
          },
        }))
        return
      }

      const values = samples.map((sample) => sample.value).sort((a, b) => a - b)
      // For range-of-motion screens the held end position is the measurement,
      // so take the best value reached. For control screens (where lower is
      // better) a single wobble should not define the result, so take the
      // median of the hold instead.
      const value = step.screen.higherIsBetter
        ? values[values.length - 1]
        : values[Math.floor(values.length / 2)]
      const confidence = samples.reduce((sum, sample) => sum + sample.confidence, 0) / samples.length

      setResults((prior) => ({
        ...prior,
        [stepKey(step)]: {
          screen_id: step.screen.id,
          side: step.side,
          value,
          unit: step.screen.unit,
          confidence,
          classification: classifyScreenValue(step.screen, value),
          reliability: step.screen.reliability,
        },
      }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not measure this screen. Try recording it again.')
    } finally {
      setMeasuring(false)
    }
  }

  function handleFile(file: File) {
    if (/\.mov$/i.test(file.name) || file.type === 'video/quicktime') {
      setError('This browser cannot reliably read .mov files. On iPhone, set Settings → Camera → Formats to "Most Compatible", or export the clip as MP4.')
      return
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    setError('')
    const video = videoRef.current
    if (video) {
      video.src = url
      video.load()
    }
    void measureCurrentStep(file)
  }

  const collected = useMemo(() => Object.values(results), [results])
  const summary = useMemo(() => (collected.length ? summarizeScreenSession(collected) : null), [collected])
  const completedCount = collected.filter((item) => item.value !== null).length

  async function saveSession() {
    setSaving(true)
    setSaveMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again.')
      const finalSummary = summarizeScreenSession(collected)
      const { error: insertError } = await supabase.from('movement_screen_sessions').insert({
        user_id: user.id,
        status: 'complete',
        results: collected,
        summary: finalSummary,
        completed_at: new Date().toISOString(),
      })
      if (insertError) throw insertError
      setSaveMessage('Your movement screens were saved. Your next report will use these measurements instead of estimating them from your pitching video.')
    } catch (reason) {
      console.error(reason)
      setSaveMessage(reason instanceof Error ? reason.message : 'Could not save your movement screens. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!step) return null

  return (
    <div className="space-y-6">
      <div className="card border-yellow-500/30 bg-yellow-500/5">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400" />
          <p className="text-sm text-yellow-100">
            <span className="font-semibold">These are training measurements, not a medical exam.</span>{' '}
            They measure how far you can move so your plan targets the right thing. They do not diagnose an injury.
            Stop any screen that causes pain and talk to a medical professional.
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">
              Screen {stepIndex + 1} of {steps.length}
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              {step.screen.name}{sideWord(step.side) ? ` — ${sideWord(step.side)} side` : ''}
            </h2>
          </div>
          <span className={`status-badge ${step.screen.reliability === 'High' ? 'bg-accent-green/10 text-accent-green' : 'bg-yellow-500/10 text-yellow-300'}`}>
            {step.screen.reliability} reliability
          </span>
        </div>

        <p className="text-sm text-slate-300">{step.screen.whyItMatters}</p>

        {step.screen.reliability === 'Moderate' && (
          <p className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200">
            {step.screen.reliabilityNote}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-navy-950 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">1. Camera</p>
            <p className="mt-2 text-sm text-slate-300">{step.screen.cameraSetup}</p>
          </div>
          <div className="rounded-xl bg-navy-950 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">2. Position</p>
            <p className="mt-2 text-sm text-slate-300">{step.screen.position}</p>
          </div>
          <div className="rounded-xl bg-navy-950 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">3. What to do</p>
            <p className="mt-2 text-sm text-slate-300">{step.screen.action}</p>
          </div>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 p-8 text-center transition hover:border-electric-blue/50">
          <Upload className="h-7 w-7 text-electric-blue-light" />
          <span className="font-semibold text-white">
            {currentResult ? 'Record this screen again' : 'Upload your recording of this screen'}
          </span>
          <span className="text-xs text-slate-500">MP4 or WebM · a few seconds is enough</span>
          <input
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) handleFile(file)
              event.currentTarget.value = ''
            }}
          />
        </label>

        <video ref={videoRef} className="hidden" muted playsInline preload="auto" />

        {(measuring || modelStatus === 'loading') && (
          <p className="text-sm text-electric-blue-light">
            {modelStatus === 'loading' ? 'Starting movement tracking…' : 'Measuring your recording… keep this page open.'}
          </p>
        )}

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}

        {currentResult && (
          <div className={`rounded-xl border p-4 ${
            currentResult.value === null
              ? 'border-red-500/30 bg-red-500/5'
              : currentResult.classification === 'limited'
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-accent-green/30 bg-accent-green/5'
          }`}>
            {currentResult.value === null ? (
              <p className="text-sm text-red-200">{currentResult.problem}</p>
            ) : (
              <>
                <p className="text-2xl font-black text-white">
                  {step.screen.unit === 'degrees' ? `${Math.round(currentResult.value)}°` : currentResult.value.toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {currentResult.classification === 'clear' && 'This is inside the range we would expect. Nothing to work around here.'}
                  {currentResult.classification === 'watch' && 'This is a little below where we would like it. Worth including in your plan.'}
                  {currentResult.classification === 'limited' && 'This is limited enough that it is likely affecting your delivery. Your plan will target it.'}
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={stepIndex === 0 || measuring}
            onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          >
            ← Previous screen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={measuring}
            onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
          >
            {stepIndex === steps.length - 1 ? 'Review results' : 'Next screen →'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={measuring}
            onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
          >
            Skip this one
          </button>
        </div>
      </div>

      {summary && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black text-white">What we have measured so far</h3>
            <span className="text-sm text-slate-400">{completedCount} of {steps.length} measured</span>
          </div>

          {summary.insufficient ? (
            <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-200">
              There are not enough measurements yet to explain anything about your delivery. Complete more screens so your
              report uses real numbers instead of estimating from your pitching video.
            </p>
          ) : summary.findings.length === 0 ? (
            <p className="text-sm text-accent-green">
              Everything measured so far is inside the expected range with no notable side-to-side difference.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.findings.map((finding, index) => (
                <li key={index} className="flex gap-2 text-sm text-slate-300">
                  <span className={
                    finding.kind === 'limitation' ? 'text-yellow-400'
                      : finding.kind === 'asymmetry' ? 'text-electric-blue-light'
                        : 'text-slate-600'
                  }>•</span>
                  <span>
                    {finding.detail}
                    {finding.reliability === 'Moderate' && (
                      <span className="ml-1 text-xs text-slate-500">(estimate — compare against your own follow-ups)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={saveSession} disabled={saving || completedCount === 0}>
              {saving ? 'Saving…' : <><Check className="h-4 w-4" /> Save my movement screens</>}
            </button>
            <p className="text-xs text-slate-500">
              You can save now and add the rest later. Saving replaces estimates with measurements in your next report.
            </p>
          </div>

          {saveMessage && <p className="text-sm text-electric-blue-light">{saveMessage}</p>}
        </div>
      )}

      <div className="card">
        <div className="flex gap-3">
          <Video className="h-5 w-5 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-400">
            Re-record these every few weeks. Range of motion changes faster than velocity does, so this is usually where
            you see your training working first.
          </p>
        </div>
      </div>
    </div>
  )
}

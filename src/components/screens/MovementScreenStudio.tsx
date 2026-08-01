'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Upload, Video } from 'lucide-react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { createClient } from '@/lib/supabase/client'
import {
  MOVEMENT_SCREENS,
  classifyScreenValue,
  summarizeScreenSession,
  aggregateScreenSamples,
  type MovementScreen,
  type ScreenResult,
  type ScreenSide,
  type LandmarkPoint,
} from '@/lib/movement-screens'
import { probeVideoFile, ACCEPTED_VIDEO_TYPES } from '@/lib/video-support'

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

      // Each screen declares how its frames collapse into one number: the end
      // position reached, the steady value of a hold, or -- for trunk rotation
      // -- the angle recovered from the athlete's own neutral and rotated
      // frames within the same clip.
      const value = aggregateScreenSamples(step.screen, samples.map((sample) => sample.value))
      if (value === null) {
        setResults((prior) => ({
          ...prior,
          [stepKey(step)]: {
            screen_id: step.screen.id, side: step.side, value: null,
            unit: step.screen.unit, confidence: 0, classification: 'unmeasured',
            reliability: step.screen.reliability,
            problem: 'We could not read this one clearly enough. Please record it again.',
          },
        }))
        return
      }
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

  async function handleFile(file: File) {
    // Probe the real file instead of rejecting every QuickTime container: a
    // .mov holding H.264 plays fine, and an undecodable one would otherwise
    // hang silently rather than reporting anything.
    setError('')
    const probe = await probeVideoFile(file)
    if (!probe.ok) {
      setError(probe.problem ?? 'This video could not be read in this browser.')
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
  const completedCount = collected.filter((item) => item.value !== null).length
  // Only what the athlete can act on: which recordings need doing again.
  const retakes = useMemo(() => steps
    .filter((entry) => results[stepKey(entry)]?.value === null)
    .map((entry) => `${entry.screen.name}${sideWord(entry.side) ? ` — ${sideWord(entry.side)} side` : ''}`),
    [steps, results])

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
      setSaveMessage('Saved. Your coach will review these along with your pitching video.')
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
        </div>

        <p className="text-sm text-slate-300">{step.screen.whyItMatters}</p>

        {/*
          How much weight we place on a given screen, and the caveats attached
          to it, are staff-side judgements. Showing an athlete a "moderate
          reliability" badge invites them to discount their own result without
          a coach there to interpret it, so the tier is stored and used behind
          the scenes rather than displayed.
        */}

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
            accept={ACCEPTED_VIDEO_TYPES}
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
          // The athlete is shown only whether the recording was usable. The
          // measurement, how it compares to a range, and how confident we are
          // in it are all staff-side judgements -- surfacing them here would
          // hand an athlete a number to worry about with no coach attached.
          <div className={`rounded-xl border p-4 ${
            currentResult.value === null
              ? 'border-yellow-500/30 bg-yellow-500/5'
              : 'border-accent-green/30 bg-accent-green/5'
          }`}>
            {currentResult.value === null ? (
              <p className="text-sm text-yellow-200">{currentResult.problem}</p>
            ) : (
              <p className="text-sm text-accent-green">
                <span className="font-semibold">Recorded.</span> This one came through clearly. Move on to the next screen.
              </p>
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

      {collected.length > 0 && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black text-white">Your progress</h3>
            <span className="text-sm text-slate-400">{completedCount} of {steps.length} recorded</span>
          </div>

          {retakes.length > 0 ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="text-sm font-semibold text-yellow-200">These need recording again:</p>
              <ul className="mt-2 space-y-1">
                {retakes.map((item, index) => (
                  <li key={index} className="text-sm text-yellow-100/90">{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-accent-green">Everything you have recorded so far came through clearly.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={saveSession} disabled={saving || completedCount === 0}>
              {saving ? 'Saving…' : <><Check className="h-4 w-4" /> Save my movement screens</>}
            </button>
            <p className="text-xs text-slate-500">You can save now and add the rest later.</p>
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

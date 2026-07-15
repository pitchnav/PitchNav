'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Upload, Video, CheckCircle, X, AlertCircle, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize, ACCEPTED_VIDEO_TYPES, MAX_VIDEO_SIZE_BYTES } from '@/lib/utils'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

type UploadedVideo = {
  angle: 'open_side' | 'rear' | 'front' | 'radar'
  file: File
  url: string
  uploading: boolean
  progress: number
  error: string | null
  submissionId: string | null
  checklistConfirmed: boolean
  quality: VideoQuality | null
}

type VideoQuality = {
  frameRate: number | null
  width: number
  height: number
  duration: number
  orientation: 'Landscape' | 'Portrait' | 'Square'
  rating: 'Ready for analysis' | 'Usable, but limited' | 'Please record again'
  warnings: string[]
}

const CHECKLIST = [
  'Full body is visible from head to toe',
  'Throwing hand is visible through ball release',
  'Landing foot is visible throughout the pitch',
  'Video is not blurry',
  'Camera did not move during the pitch',
  'Lighting is adequate',
  'Video is at normal game or bullpen intensity',
  'Angle matches the selected guide',
]

function UploadContent() {
  const searchParams = useSearchParams()
  const profileId = searchParams.get('profileId')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [videos, setVideos] = useState<Record<string, UploadedVideo>>({})
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({})
  const [checklistAngle, setChecklistAngle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)

  const REQUIRED_ANGLES = ['open_side', 'rear'] as const
  const ALL_ANGLES = [...REQUIRED_ANGLES]

  const ANGLE_LABELS: Record<string, string> = {
    open_side: 'Open-Side View (Required)',
    rear: 'Rear View (Required)',
  }

  async function inspectVideo(file: File, url: string): Promise<VideoQuality | null> {
    return new Promise((resolve) => {
      const probe = document.createElement('video')
      probe.muted = true
      probe.playsInline = true
      probe.preload = 'metadata'
      probe.src = url
      probe.onloadedmetadata = async () => {
        const width = probe.videoWidth
        const height = probe.videoHeight
        const duration = probe.duration
        const orientation = width > height ? 'Landscape' : height > width ? 'Portrait' : 'Square'
        let frameRate: number | null = null
        if ('requestVideoFrameCallback' in probe && duration > 0) {
          const times: number[] = []
          try {
            await probe.play()
            await new Promise<void>((done) => {
              let finished = false
              const finish = () => { if (!finished) { finished = true; done() } }
              const timeout = window.setTimeout(finish, 1500)
              const sample = (_now: number, metadata: VideoFrameCallbackMetadata) => {
                if (finished) return
                if (!times.length || metadata.mediaTime !== times[times.length - 1]) times.push(metadata.mediaTime)
                if (times.length >= 24 || probe.ended) { window.clearTimeout(timeout); finish() }
                else probe.requestVideoFrameCallback(sample)
              }
              probe.requestVideoFrameCallback(sample)
            })
            const deltas = times.slice(1).map((time, index) => time - times[index]).filter((delta) => delta > 0.0001).sort((a, b) => a - b)
            if (deltas.length) frameRate = Math.round(1 / deltas[Math.floor(deltas.length / 2)])
          } catch { frameRate = null }
          probe.pause()
        }
        const warnings: string[] = []
        if (duration < 1) warnings.push('Clip is extremely short.')
        if (width < 720 || height < 480) warnings.push('Resolution is below the recommended minimum.')
        if (orientation !== 'Landscape') warnings.push('Landscape orientation is recommended.')
        if (frameRate !== null && frameRate < 60) warnings.push('The playback track is below 60 FPS; confirm the original slow-motion capture setting.')
        const rating = duration < 0.5 || Math.min(width, height) < 360
          ? 'Please record again'
          : warnings.length >= 2 ? 'Usable, but limited' : 'Ready for analysis'
        resolve({ frameRate, width, height, duration, orientation, rating, warnings })
      }
      probe.onerror = () => resolve(null)
    })
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profileId) {
        router.push('/start-analysis')
        return
      }
      setUserId(user.id)

      // Create a draft order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          athlete_profile_id: profileId,
          status: 'awaiting_videos',
          delivery_estimate_text: null,
        })
        .select()
        .single()

      if (error) {
        console.error('Could not create order draft', error)
      } else {
        setOrderId(order.id)
      }
      setLoading(false)
    }
    init()
  }, [profileId])

  async function handleFileSelect(angle: 'open_side' | 'rear', file: File) {
    // Validate type
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      alert('Unsupported video format. Please use MP4, MOV, or WebM.')
      return
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      alert('Video file is too large. Maximum size is 500 MB.')
      return
    }

    const url = URL.createObjectURL(file)
    setVideos((prev) => ({
      ...prev,
      [angle]: {
        angle,
        file,
        url,
        uploading: false,
        progress: 0,
        error: null,
        submissionId: null,
        checklistConfirmed: false,
        quality: null,
      },
    }))
    const quality = await inspectVideo(file, url)
    setVideos((prev) => prev[angle] ? ({ ...prev, [angle]: { ...prev[angle], quality } }) : prev)
    setChecklistAngle(angle)
    setChecklistItems({})
  }

  function allChecked() {
    return CHECKLIST.every((item) => checklistItems[item])
  }

  async function confirmChecklistAndUpload() {
    if (!allChecked() || !checklistAngle || !userId || !orderId) return

    const video = videos[checklistAngle]
    if (!video) return

    setVideos((prev) => ({
      ...prev,
      [checklistAngle]: { ...prev[checklistAngle], uploading: true, progress: 0, checklistConfirmed: true },
    }))

    try {
      const ext = video.file.name.split('.').pop()
      const filename = `${checklistAngle}_${Date.now()}.${ext}`
      const storagePath = `${userId}/${orderId}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('pitch-videos')
        .upload(storagePath, video.file, {
          contentType: video.file.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Create video submission record
      const { data: submission, error: dbError } = await supabase
        .from('video_submissions')
        .insert({
          order_id: orderId,
          user_id: userId,
          angle: checklistAngle,
          storage_path: storagePath,
          file_name: filename,
          file_size_bytes: video.file.size,
          mime_type: video.file.type,
          duration_secs: video.quality ? Math.round(video.quality.duration) : null,
          resolution: video.quality ? `${video.quality.width}x${video.quality.height}` : null,
          frame_rate: video.quality?.frameRate ?? null,
          orientation: video.quality?.orientation.toLowerCase() ?? null,
          checklist_confirmed: true,
        })
        .select()
        .single()

      if (dbError) throw dbError

      setVideos((prev) => ({
        ...prev,
        [checklistAngle]: {
          ...prev[checklistAngle],
          uploading: false,
          progress: 100,
          submissionId: submission.id,
        },
      }))
      setChecklistAngle(null)
    } catch (err) {
      console.error(err)
      setVideos((prev) => ({
        ...prev,
        [checklistAngle]: {
          ...prev[checklistAngle],
          uploading: false,
          error: 'Upload failed. Please try again.',
        },
      }))
    }
  }

  function removeVideo(angle: string) {
    setVideos((prev) => {
      const next = { ...prev }
      if (next[angle]?.url) URL.revokeObjectURL(next[angle].url)
      delete next[angle]
      return next
    })
  }

  const requiredUploaded = REQUIRED_ANGLES.every((a) => videos[a]?.submissionId)

  async function proceedToCheckout() {
    if (!orderId || !profileId) return
    setOrderLoading(true)
    try {
      // Update order status to awaiting_payment
      await supabase
        .from('orders')
        .update({ status: 'awaiting_payment' })
        .eq('id', orderId)

      router.push(`/checkout?orderId=${orderId}`)
    } catch {
      setOrderLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Upload Your Videos</h1>
          <p className="mt-2 text-slate-400">
            Submit at least the open-side and rear-view videos. Review the{' '}
            <a href="/camera-setup" className="text-electric-blue-light hover:underline" target="_blank">
              camera setup guide
            </a>{' '}
            before filming.
          </p>
        </div>

        {/* Video slots */}
        <div className="space-y-6 mb-8">
          {ALL_ANGLES.map((angle) => {
            const video = videos[angle]
            const isRequired = REQUIRED_ANGLES.includes(angle as typeof REQUIRED_ANGLES[number])

            return (
              <div key={angle} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{ANGLE_LABELS[angle]}</h3>
                    {!isRequired && <span className="text-xs text-slate-500">Optional</span>}
                  </div>
                  {video?.submissionId && (
                    <span className="flex items-center gap-1.5 text-xs text-accent-green font-semibold">
                      <CheckCircle className="h-4 w-4" /> Uploaded
                    </span>
                  )}
                </div>

                {!video ? (
                  <div
                    className="border-2 border-dashed border-surface-border rounded-lg p-8 text-center cursor-pointer hover:border-electric-blue/50 transition-colors"
                    onClick={() => document.getElementById(`video-file-${angle}`)?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files[0]
                      if (file) handleFileSelect(angle, file)
                    }}
                  >
                    <Upload className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Drag & drop or click to upload</p>
                    <p className="text-xs text-slate-600 mt-1">MP4, MOV, WebM · Max 500 MB</p>
                    <input
                      id={`video-file-${angle}`}
                      type="file"
                      accept={ACCEPTED_VIDEO_TYPES.join(',')}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect(angle, file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      type="button"
                      className="mt-4 btn-secondary text-sm px-4 py-2"
                      onClick={(e) => { e.stopPropagation(); document.getElementById(`video-file-${angle}`)?.click() }}
                    >
                      <Camera className="h-4 w-4" /> Choose File
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Video preview */}
                    <div className="relative rounded-lg overflow-hidden bg-black mb-3">
                      <video
                        src={video.url}
                        controls
                        className="w-full max-h-48 object-contain"
                        aria-label={`Preview of ${ANGLE_LABELS[angle]}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>{video.file.name}</span>
                      <span>{formatFileSize(video.file.size)}</span>
                    </div>

                    {video.quality && (
                      <div className="mb-3 rounded-xl border border-surface-border bg-navy-950 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Automatic file check</p>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${video.quality.rating === 'Ready for analysis' ? 'bg-accent-green/10 text-accent-green' : video.quality.rating === 'Usable, but limited' ? 'bg-yellow-400/10 text-yellow-300' : 'bg-red-400/10 text-red-300'}`}>{video.quality.rating}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {[
                            ['Frame rate', video.quality.frameRate ? `~${video.quality.frameRate} playback FPS` : 'Not exposed'],
                            ['Resolution', `${video.quality.width}×${video.quality.height}`],
                            ['Length', `${video.quality.duration.toFixed(1)} sec`],
                            ['Orientation', video.quality.orientation],
                            ['File size', formatFileSize(video.file.size)],
                          ].map(([label, value]) => <div key={label} className="rounded-lg bg-navy-900 p-2"><p className="text-[10px] uppercase text-slate-600">{label}</p><p className="mt-1 text-xs font-semibold text-white">{value}</p></div>)}
                        </div>
                        {video.quality.warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-yellow-300">• {warning}</p>)}
                        <p className="mt-3 text-xs text-slate-500">This checks file metadata only. You must still confirm that the full body, throwing hand, landing foot, and release are visible.</p>
                      </div>
                    )}

                    {video.error && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <p className="text-xs text-red-400">{video.error}</p>
                      </div>
                    )}

                    {!video.submissionId && !video.uploading && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-sm px-3 py-2 flex-1"
                          onClick={() => removeVideo(angle)}
                        >
                          <X className="h-4 w-4" /> Remove
                        </button>
                        <button
                          type="button"
                          className="btn-primary text-sm px-3 py-2 flex-1"
                          onClick={() => { setChecklistAngle(angle); setChecklistItems({}) }}
                        >
                          <Video className="h-4 w-4" /> Confirm & Upload
                        </button>
                      </div>
                    )}

                    {video.uploading && (
                      <div className="rounded-lg bg-electric-blue/10 p-3 text-sm text-electric-blue-light flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-electric-blue border-t-transparent animate-spin" />
                        Uploading securely...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Checklist modal overlay */}
        {checklistAngle && !videos[checklistAngle]?.submissionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-2">Video Quality Checklist</h3>
              <p className="text-sm text-slate-400 mb-6">
                Confirm each item before your video is uploaded. You cannot undo this step.
              </p>
              <div className="space-y-3 mb-6">
                {CHECKLIST.map((item) => (
                  <label key={item} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checklistItems[item]}
                      onChange={(e) =>
                        setChecklistItems((prev) => ({ ...prev, [item]: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-surface-border accent-electric-blue cursor-pointer"
                    />
                    <span className="text-sm text-slate-300">{item}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1 justify-center"
                  onClick={() => setChecklistAngle(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!allChecked()}
                  className="btn-primary flex-1 justify-center"
                  onClick={confirmChecklistAndUpload}
                >
                  Upload Video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-2">Ready to continue?</h3>
          <p className="text-sm text-slate-400 mb-4">
            Both required videos must be uploaded before you can proceed to checkout.
          </p>
          <div className="flex gap-3 mb-4">
            {REQUIRED_ANGLES.map((a) => (
              <div
                key={a}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  videos[a]?.submissionId
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-navy-800 text-slate-500'
                }`}
              >
                {videos[a]?.submissionId ? <CheckCircle className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />}
                {ANGLE_LABELS[a]}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!requiredUploaded || orderLoading}
            onClick={proceedToCheckout}
            className="btn-primary w-full justify-center py-3"
          >
            {orderLoading ? 'Preparing...' : 'Continue to Checkout →'}
          </button>
        </div>

        <div className="mt-6">
          <SafetyDisclaimer compact />
        </div>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center"><p className="text-slate-400">Loading upload...</p></div>}>
      <UploadContent />
    </Suspense>
  )
}

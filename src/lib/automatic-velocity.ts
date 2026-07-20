import { createAdminClient } from '@/lib/supabase/server'

type EnqueueOptions = {
  orderId: string
  videoSubmissionId?: string
}

export type EnqueueVelocityResult = {
  ok: boolean
  configured: boolean
  jobId?: string
  workerJobId?: string
  reason?: string
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export async function enqueueAutomaticVelocityJob({
  orderId,
  videoSubmissionId,
}: EnqueueOptions): Promise<EnqueueVelocityResult> {
  const supabase = createAdminClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,user_id,athlete_profile_id,payment_confirmed_at')
    .eq('id', orderId)
    .single()

  if (orderError || !order) return { ok: false, configured: false, reason: 'order_not_found' }
  if (!order.payment_confirmed_at) return { ok: false, configured: false, reason: 'payment_not_confirmed' }

  let videoQuery = supabase
    .from('video_submissions')
    .select('id,order_id,user_id,storage_path,file_name,mime_type,frame_rate,duration_secs,resolution,trim_start_secs,trim_end_secs')
    .eq('order_id', orderId)
    .eq('angle', 'open_side')

  if (videoSubmissionId) videoQuery = videoQuery.eq('id', videoSubmissionId)

  const { data: video, error: videoError } = await videoQuery
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (videoError || !video) return { ok: false, configured: false, reason: 'side_view_video_not_found' }

  const declaredCaptureFps = [120, 240].includes(Number(video.frame_rate))
    ? Number(video.frame_rate)
    : null

  const { data: job, error: jobError } = await supabase
    .from('automatic_velocity_jobs')
    .upsert({
      order_id: order.id,
      video_submission_id: video.id,
      user_id: order.user_id,
      athlete_profile_id: order.athlete_profile_id,
      status: 'queued',
      declared_capture_fps: declaredCaptureFps,
      trim_start_secs: Number(video.trim_start_secs ?? 0),
      trim_end_secs: video.trim_end_secs == null ? null : Number(video.trim_end_secs),
      attempts: 0,
      rejection_reason: null,
      diagnostics: {},
      staff_approved: false,
      staff_approved_by: null,
      staff_approved_at: null,
      completed_at: null,
      started_at: null,
    }, { onConflict: 'video_submission_id' })
    .select('id')
    .single()

  if (jobError || !job) {
    console.error('[Automatic velocity] Could not create job', jobError)
    return { ok: false, configured: false, reason: 'job_creation_failed' }
  }

  const workerUrl = process.env.VIDEO_WORKER_URL
  const workerSecret = process.env.VIDEO_WORKER_SECRET
  const enabled = process.env.AUTO_VELOCITY_ENABLED === 'true'
  if (!enabled || !workerUrl || !workerSecret) {
    await supabase
      .from('automatic_velocity_jobs')
      .update({ rejection_reason: 'Automatic worker is not configured yet.' })
      .eq('id', job.id)
    return { ok: true, configured: false, jobId: job.id, reason: 'worker_not_configured' }
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from('pitch-videos')
    .createSignedUrl(video.storage_path, 60 * 60)

  if (signedError || !signed?.signedUrl) {
    await supabase
      .from('automatic_velocity_jobs')
      .update({ status: 'failed', rejection_reason: 'Could not create a secure video URL.' })
      .eq('id', job.id)
    return { ok: false, configured: true, jobId: job.id, reason: 'signed_url_failed' }
  }

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({
        job_id: job.id,
        source_url: signed.signedUrl,
        file_name: video.file_name,
        mime_type: video.mime_type,
        declared_capture_fps: declaredCaptureFps,
        trim_start_secs: Number(video.trim_start_secs ?? 0),
        trim_end_secs: video.trim_end_secs == null ? null : Number(video.trim_end_secs),
        calibration_marker_size_inches: 8,
        callback_url: `${appUrl()}/api/velocity-worker/callback`,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    const result = await response.json().catch(() => ({})) as { call_id?: string; error?: string }
    if (!response.ok) throw new Error(result.error || `Worker returned ${response.status}`)

    await supabase
      .from('automatic_velocity_jobs')
      .update({ worker_job_id: result.call_id ?? null, attempts: 1 })
      .eq('id', job.id)

    return { ok: true, configured: true, jobId: job.id, workerJobId: result.call_id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker request failed.'
    console.error('[Automatic velocity] Worker request failed', message)
    await supabase
      .from('automatic_velocity_jobs')
      .update({ status: 'failed', attempts: 1, rejection_reason: message })
      .eq('id', job.id)
    return { ok: false, configured: true, jobId: job.id, reason: 'worker_request_failed' }
  }
}


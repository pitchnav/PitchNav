import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const approvalSchema = z.object({ jobId: z.string().uuid() })

export async function POST(request: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const { data: profile } = await auth.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const parsed = approvalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid approval request.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: job } = await supabase
    .from('automatic_velocity_jobs')
    .select('*,video_submissions(storage_path),orders(id,user_id,athlete_profile_id)')
    .eq('id', parsed.data.jobId)
    .single()

  if (!job || job.status !== 'completed' || job.estimate_low_mph == null || job.estimate_high_mph == null) {
    return NextResponse.json({ error: 'A completed estimate is required before approval.' }, { status: 409 })
  }

  const order = Array.isArray(job.orders) ? job.orders[0] : job.orders
  const video = Array.isArray(job.video_submissions) ? job.video_submissions[0] : job.video_submissions
  if (!order || !video) return NextResponse.json({ error: 'Linked order or video is missing.' }, { status: 409 })

  let analysisId = job.motion_analysis_id as string | null
  if (!analysisId) {
    const { data: existing } = await supabase
      .from('motion_analyses')
      .select('id')
      .eq('user_id', order.user_id)
      .eq('athlete_profile_id', order.athlete_profile_id)
      .eq('source_video_storage_path', video.storage_path)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    analysisId = existing?.id ?? null
  }

  const velocityFields = {
    velocity_estimate_low: Number(job.estimate_low_mph),
    velocity_estimate_high: Number(job.estimate_high_mph),
    velocity_confidence: job.confidence,
    velocity_assumptions: `Automatic calibrated side-view estimate. ${job.effective_capture_fps ?? job.declared_capture_fps ?? 'Unknown'} FPS; 8-inch Pitch Nav marker; ${job.ball_track_frames} tracked ball frames. Not radar verified. Staff reviewed.`,
    calibration_passed: true,
    capture_fps: [60, 120, 240].includes(Math.round(Number(job.effective_capture_fps)))
      ? Math.round(Number(job.effective_capture_fps))
      : null,
  }

  if (analysisId) {
    const { error } = await supabase.from('motion_analyses').update(velocityFields).eq('id', analysisId)
    if (error) return NextResponse.json({ error: 'Could not attach the approved estimate.' }, { status: 500 })
  } else {
    const { data: created, error } = await supabase.from('motion_analyses').insert({
      user_id: order.user_id,
      athlete_profile_id: order.athlete_profile_id,
      source_video_storage_path: video.storage_path,
      title: 'Automatic Side-View Analysis',
      status: 'coach_review',
      ...velocityFields,
    }).select('id').single()
    if (error || !created) return NextResponse.json({ error: 'Could not create the linked analysis.' }, { status: 500 })
    analysisId = created.id
  }

  const { error: approvalError } = await supabase.from('automatic_velocity_jobs').update({
    motion_analysis_id: analysisId,
    staff_approved: true,
    staff_approved_by: user.id,
    staff_approved_at: new Date().toISOString(),
  }).eq('id', job.id)

  if (approvalError) return NextResponse.json({ error: 'Estimate attached, but approval status could not be saved.' }, { status: 500 })
  return NextResponse.json({ approved: true, analysisId })
}


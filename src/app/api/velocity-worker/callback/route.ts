import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const callbackSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'unavailable', 'failed']),
  detected_playback_fps: z.number().positive().nullable().optional(),
  declared_capture_fps: z.number().int().positive().nullable().optional(),
  effective_capture_fps: z.number().positive().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_secs: z.number().nonnegative().nullable().optional(),
  trim_start_secs: z.number().nonnegative().nullable().optional(),
  trim_end_secs: z.number().nonnegative().nullable().optional(),
  calibration_detected: z.boolean().optional(),
  calibration_method: z.string().nullable().optional(),
  calibration_scale_px_per_foot: z.number().positive().nullable().optional(),
  ball_track_frames: z.number().int().nonnegative().optional(),
  estimate_low_mph: z.number().nonnegative().nullable().optional(),
  estimate_high_mph: z.number().nonnegative().nullable().optional(),
  estimate_center_mph: z.number().nonnegative().nullable().optional(),
  confidence: z.enum(['High', 'Moderate', 'Low', 'Unavailable']).nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  diagnostics: z.record(z.unknown()).optional(),
})

function secretMatches(provided: string | null) {
  const expected = process.env.VIDEO_WORKER_SECRET
  if (!expected || !provided?.startsWith('Bearer ')) return false
  const actual = provided.slice(7)
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes)
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized worker callback.' }, { status: 401 })
  }

  const parsed = callbackSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid callback payload.' }, { status: 400 })

  const body = parsed.data
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: body.status,
    detected_playback_fps: body.detected_playback_fps ?? null,
    declared_capture_fps: body.declared_capture_fps ?? null,
    effective_capture_fps: body.effective_capture_fps ?? null,
    width: body.width ?? null,
    height: body.height ?? null,
    duration_secs: body.duration_secs ?? null,
    trim_start_secs: body.trim_start_secs ?? null,
    trim_end_secs: body.trim_end_secs ?? null,
    calibration_detected: body.calibration_detected ?? false,
    calibration_method: body.calibration_method ?? null,
    calibration_scale_px_per_foot: body.calibration_scale_px_per_foot ?? null,
    ball_track_frames: body.ball_track_frames ?? 0,
    estimate_low_mph: body.estimate_low_mph ?? null,
    estimate_high_mph: body.estimate_high_mph ?? null,
    estimate_center_mph: body.estimate_center_mph ?? null,
    confidence: body.confidence ?? (body.status === 'completed' ? 'Low' : 'Unavailable'),
    rejection_reason: body.rejection_reason ?? null,
    diagnostics: body.diagnostics ?? {},
  }
  if (body.status === 'processing') update.started_at = now
  if (['completed', 'unavailable', 'failed'].includes(body.status)) update.completed_at = now

  const { error } = await supabase
    .from('automatic_velocity_jobs')
    .update(update)
    .eq('id', body.job_id)

  if (error) {
    console.error('[Automatic velocity] Callback update failed', error)
    return NextResponse.json({ error: 'Could not store worker result.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

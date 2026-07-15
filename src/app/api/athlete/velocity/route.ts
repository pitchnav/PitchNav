import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const nullableText = z.union([z.string(), z.null(), z.undefined()])
const schema = z.object({
  athleteProfileId: z.string().min(1),
  currentAvgVelocity: z.coerce.number().int().min(40).max(110),
  currentMaxVelocity: z.coerce.number().int().min(40).max(110),
  goalVelocity: z.coerce.number().int().min(40).max(110),
  velocitySource: z.enum(['pocket_radar', 'stalker', 'rapsodo', 'trackman', 'stadium_radar', 'coach_provided', 'estimated', 'other']),
  velocityMeasuredAt: nullableText,
  bullpenIntensity: nullableText,
  pitchesPerWeek: z.union([z.coerce.number().int().min(0).max(1000), z.null(), z.undefined()]),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Check the velocity fields.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const body = parsed.data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 })

    // Use the signed-in user's session so Supabase RLS remains the final authorization boundary.
    const { data: updated, error } = await supabase.from('athlete_profiles').update({
      current_avg_velocity: body.currentAvgVelocity,
      current_max_velocity: body.currentMaxVelocity,
      goal_velocity: body.goalVelocity,
      velocity_source: body.velocitySource,
      velocity_measured_at: body.velocityMeasuredAt || null,
      bullpen_intensity: body.bullpenIntensity || null,
      pitches_per_week: body.pitchesPerWeek ?? null,
    }).eq('id', body.athleteProfileId).eq('user_id', user.id).select('id').maybeSingle()

    if (error) {
      console.error('Velocity profile database error', error)
      return NextResponse.json({ error: `Could not save velocity profile (${error.code}).` }, { status: 500 })
    }
    if (!updated) return NextResponse.json({ error: 'This athlete profile was not found for your account.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Velocity profile request error', error)
    return NextResponse.json({ error: 'Could not process the velocity profile.' }, { status: 400 })
  }
}

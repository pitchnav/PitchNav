import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const schema = z.object({
  athleteProfileId: z.string().uuid(), currentAvgVelocity: z.number().int().min(40).max(110),
  currentMaxVelocity: z.number().int().min(40).max(110), goalVelocity: z.number().int().min(40).max(110),
  velocitySource: z.enum(['pocket_radar','stalker','rapsodo','trackman','stadium_radar','coach_provided','estimated','other']),
  velocityMeasuredAt: z.string().nullable().optional(), bullpenIntensity: z.string().nullable().optional(), pitchesPerWeek: z.number().int().min(0).max(1000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json())
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
    const { data: owned } = await supabase.from('athlete_profiles').select('id').eq('id', body.athleteProfileId).eq('user_id', user.id).single()
    if (!owned) return NextResponse.json({ error: 'Athlete profile was not found for this account.' }, { status: 403 })
    const admin = createAdminClient()
    const { error } = await admin.from('athlete_profiles').update({
      current_avg_velocity: body.currentAvgVelocity, current_max_velocity: body.currentMaxVelocity,
      goal_velocity: body.goalVelocity, velocity_source: body.velocitySource,
      velocity_measured_at: body.velocityMeasuredAt || null, bullpen_intensity: body.bullpenIntensity || null,
      pitches_per_week: body.pitchesPerWeek ?? null,
    }).eq('id', body.athleteProfileId)
    if (error) return NextResponse.json({ error: 'Velocity profile could not be saved.' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Velocity profile error', error)
    return NextResponse.json({ error: 'Check the velocity fields and try again.' }, { status: 400 })
  }
}

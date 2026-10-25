import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Save a pitch-data session (a device export or a hand-entered pitch).
 *
 * Authorization is the signed-in user's own Supabase session, so row-level
 * security stays the final boundary — this route never uses the service role.
 * `user_id` is taken from the verified session and never from the request body,
 * so a caller cannot file pitches against another athlete.
 */

// Postgres "relation does not exist" — migration 032 has not been applied yet.
const MISSING_TABLE_CODE = '42P01'
const MIGRATION_FILE = 'supabase/migrations/032_pitch_data.sql'

// A bullpen is tens of pitches; a season export might be hundreds. The cap is
// well clear of real use and exists only to bound a single request.
const MAX_PITCHES = 2000

const measurement = z.union([z.number().finite(), z.null()])

const pitchSchema = z.object({
  pitchType: z.union([z.string().max(60), z.null()]),
  relSpeedMph: measurement,
  spinRateRpm: measurement,
  spinAxisDeg: measurement,
  inducedVertBreakIn: measurement,
  horzBreakIn: measurement,
  relHeightFt: measurement,
  relSideFt: measurement,
  extensionFt: measurement,
  pitchNo: z.union([z.number().int(), z.null()]),
})

const schema = z.object({
  source: z.enum(['trackman', 'rapsodo', 'manual']),
  sessionDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]),
  fileName: z.union([z.string().max(255), z.null()]),
  pitcherName: z.union([z.string().max(120), z.null()]),
  notes: z.union([z.string().max(2000), z.null()]),
  pitches: z.array(pitchSchema).min(1).max(MAX_PITCHES),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Could not read the request.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { error: issue?.message ? `Check the pitch data: ${issue.message}` : 'Check the pitch data.' },
      { status: 400 },
    )
  }
  const input = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 })
  }

  // A pitch with no measurement at all is not evidence of anything, and storing
  // it would change the athlete's pitch count without adding information.
  const pitches = input.pitches.filter((pitch) =>
    pitch.relSpeedMph !== null ||
    pitch.spinRateRpm !== null ||
    pitch.spinAxisDeg !== null ||
    pitch.inducedVertBreakIn !== null ||
    pitch.horzBreakIn !== null ||
    pitch.relHeightFt !== null ||
    pitch.relSideFt !== null ||
    pitch.extensionFt !== null,
  )

  if (pitches.length === 0) {
    return NextResponse.json(
      { error: 'None of those rows had a measurement in them. Nothing was saved.' },
      { status: 400 },
    )
  }

  // Attach the athlete profile when there is one, so the reviewer can find this
  // data from the athlete's submission.
  const { data: profile } = await supabase
    .from('athlete_profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: session, error: sessionError } = await supabase
    .from('pitch_data_sessions')
    .insert({
      user_id: user.id,
      athlete_profile_id: profile?.id ?? null,
      source: input.source,
      session_date: input.sessionDate,
      file_name: input.fileName,
      pitcher_name: input.pitcherName,
      notes: input.notes,
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    if (sessionError?.code === MISSING_TABLE_CODE) {
      return NextResponse.json(
        { error: `Pitch Data needs one setup step: run ${MIGRATION_FILE} in the Supabase SQL editor once.` },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: sessionError?.message ?? 'Could not save this session.' },
      { status: 500 },
    )
  }

  const { error: recordsError } = await supabase.from('pitch_records').insert(
    pitches.map((pitch, index) => ({
      session_id: session.id,
      user_id: user.id,
      pitch_type: pitch.pitchType,
      rel_speed_mph: pitch.relSpeedMph,
      spin_rate_rpm: pitch.spinRateRpm,
      spin_axis_deg: pitch.spinAxisDeg,
      induced_vert_break_in: pitch.inducedVertBreakIn,
      horz_break_in: pitch.horzBreakIn,
      rel_height_ft: pitch.relHeightFt,
      rel_side_ft: pitch.relSideFt,
      extension_ft: pitch.extensionFt,
      pitch_no: pitch.pitchNo ?? index + 1,
    })),
  )

  if (recordsError) {
    // Do not leave a session with no pitches behind — an empty session would
    // show up in the athlete's history as a real upload that measured nothing.
    await supabase.from('pitch_data_sessions').delete().eq('id', session.id)
    return NextResponse.json(
      { error: recordsError.message ?? 'Could not save those pitches.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, sessionId: session.id, saved: pitches.length })
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Which session?' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 })
  }

  // Scoped to the signed-in user as well as RLS: defence in depth, and it makes
  // the intent obvious at the call site.
  const { error } = await supabase
    .from('pitch_data_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

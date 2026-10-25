'use client'

import { useEffect, useMemo, useState } from 'react'
import { Gauge } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  averagesByPitchType,
  sourceLabel,
  formatMeasurement,
  formatSessionLabel,
  type PitchRecord,
} from '@/lib/pitch-data'

/**
 * The athlete's own device numbers, shown to the reviewer alongside the
 * submission they are reviewing.
 *
 * Read-only on purpose. These are the athlete's measurements of record; a
 * reviewer correcting one in place would leave an edited number with no trace
 * of who changed it. Every figure is captioned with where it came from, because
 * a TrackMan reading and a remembered number are different kinds of evidence
 * and the reviewer has to be able to weigh them differently.
 */

const MISSING_TABLE_CODE = '42P01'

type Props = {
  userId: string | null | undefined
  athleteProfileId: string | null | undefined
}

type SessionRow = {
  id: string
  source: string
  session_date: string | null
  created_at: string
  file_name: string | null
  pitcher_name: string | null
}

export function ReviewerPitchData({ userId, athleteProfileId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [pitches, setPitches] = useState<PitchRecord[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'needs-setup' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!userId && !athleteProfileId) {
        if (!cancelled) setState('ready')
        return
      }

      // Prefer the athlete-profile link; fall back to the account for sessions
      // saved before a profile existed.
      let query = supabase
        .from('pitch_data_sessions')
        .select('id,source,session_date,created_at,file_name,pitcher_name')
      query = athleteProfileId
        ? query.eq('athlete_profile_id', athleteProfileId)
        : query.eq('user_id', userId!)

      const { data: sessionData, error } = await query
        .order('session_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setState(error.code === MISSING_TABLE_CODE ? 'needs-setup' : 'error')
        return
      }

      const rows = (sessionData ?? []) as SessionRow[]
      setSessions(rows)

      if (rows.length === 0) {
        setState('ready')
        return
      }

      const { data: recordData } = await supabase
        .from('pitch_records')
        .select(
          'session_id,pitch_type,rel_speed_mph,spin_rate_rpm,spin_axis_deg,induced_vert_break_in,horz_break_in,rel_height_ft,rel_side_ft,extension_ft,pitch_no',
        )
        .in('session_id', rows.map((row) => row.id))

      if (cancelled) return

      const num = (value: unknown) =>
        value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
          ? null
          : Number(value)

      setPitches(
        (recordData ?? []).map((row: Record<string, unknown>) => ({
          pitchType: (row.pitch_type as string) ?? null,
          relSpeedMph: num(row.rel_speed_mph),
          spinRateRpm: num(row.spin_rate_rpm),
          spinAxisDeg: num(row.spin_axis_deg),
          inducedVertBreakIn: num(row.induced_vert_break_in),
          horzBreakIn: num(row.horz_break_in),
          relHeightFt: num(row.rel_height_ft),
          relSideFt: num(row.rel_side_ft),
          extensionFt: num(row.extension_ft),
          pitchNo: num(row.pitch_no),
        })),
      )
      setState('ready')
    }

    void load()
    return () => { cancelled = true }
  }, [supabase, userId, athleteProfileId])

  const averages = averagesByPitchType(pitches)

  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-electric-blue-light" />
        <h2 className="text-base font-semibold text-white">Athlete Pitch Data</h2>
      </div>

      {state === 'loading' && <p className="text-sm text-slate-500">Loading pitch data…</p>}

      {state === 'needs-setup' && (
        <p className="text-sm text-slate-400">
          Pitch Data needs one setup step: run{' '}
          <code className="text-slate-300">supabase/migrations/032_pitch_data.sql</code> in the Supabase SQL
          editor once.
        </p>
      )}

      {state === 'error' && (
        <p className="text-sm text-slate-400">Could not load this athlete&apos;s pitch data.</p>
      )}

      {state === 'ready' && sessions.length === 0 && (
        <p className="text-sm text-slate-500">
          This athlete has not added any device pitch data. Nothing here is estimated, so there is nothing
          to show until they upload a TrackMan or Rapsodo export or enter a pitch.
        </p>
      )}

      {state === 'ready' && sessions.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {sessions.length} session{sessions.length === 1 ? '' : 's'} · {pitches.length} pitch
            {pitches.length === 1 ? '' : 'es'}. Athlete-supplied; Pitch Nav did not operate the device or
            verify these readings.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-navy-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Pitch type</th>
                  <th className="px-3 py-2">N</th>
                  <th className="px-3 py-2">Avg velo</th>
                  <th className="px-3 py-2">Peak</th>
                  <th className="px-3 py-2">Spin</th>
                  <th className="px-3 py-2">IVB</th>
                  <th className="px-3 py-2">HB</th>
                  <th className="px-3 py-2">Ext</th>
                </tr>
              </thead>
              <tbody>
                {averages.map((row) => (
                  <tr key={row.pitchType} className="border-t border-surface-border">
                    <td className="px-3 py-2 font-semibold text-white">{row.pitchType}</td>
                    <td className="px-3 py-2 text-slate-300">{row.count}</td>
                    <td className="px-3 py-2 font-semibold text-white">{formatMeasurement(row.avgRelSpeedMph, 1)}</td>
                    <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.maxRelSpeedMph, 1)}</td>
                    <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgSpinRateRpm, 0)}</td>
                    <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgInducedVertBreakIn, 1)}</td>
                    <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgHorzBreakIn, 1)}</td>
                    <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgExtensionFt, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1.5">
            {sessions.map((session) => (
              <p key={session.id} className="text-xs text-slate-500">
                {formatSessionLabel(session.session_date, session.created_at)} —{' '}
                <span className="text-slate-400">{sourceLabel(session.source)}</span>
                {session.pitcher_name ? ` · matched to ${session.pitcher_name}` : ''}
                {session.file_name ? ` · ${session.file_name}` : ''}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Gauge, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AddPitchData } from '@/components/pitch-data/AddPitchData'
import { VelocityTrendChart } from '@/components/pitch-data/VelocityTrendChart'
import {
  averagesByPitchType,
  velocityOverTime,
  sourceLabel,
  formatMeasurement,
  formatSessionLabel,
  type PitchRecord,
} from '@/lib/pitch-data'

export const metadata: Metadata = {
  title: 'Pitch Data',
  description: 'Ball-flight numbers from your own TrackMan or Rapsodo sessions, or entered by hand.',
}

// Postgres "relation does not exist" — the specific signal that migration 032
// has not been applied yet. Any other error is a real fault and must say so,
// rather than sending the owner to re-run a migration he already ran.
const MISSING_TABLE_CODE = '42P01'
const MIGRATION_FILE = 'supabase/migrations/032_pitch_data.sql'

type SessionRow = {
  id: string
  source: string
  session_date: string | null
  created_at: string
  file_name: string | null
  pitcher_name: string | null
}

type RecordRow = {
  session_id: string
  pitch_type: string | null
  rel_speed_mph: number | null
  spin_rate_rpm: number | null
  spin_axis_deg: number | null
  induced_vert_break_in: number | null
  horz_break_in: number | null
  rel_height_ft: number | null
  rel_side_ft: number | null
  extension_ft: number | null
  pitch_no: number | null
}

function toPitchRecord(row: RecordRow): PitchRecord {
  // Supabase returns numeric columns as strings in some driver paths, so each
  // value is coerced once here rather than trusted downstream.
  const num = (value: number | string | null) =>
    value === null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null
  return {
    pitchType: row.pitch_type,
    relSpeedMph: num(row.rel_speed_mph),
    spinRateRpm: num(row.spin_rate_rpm),
    spinAxisDeg: num(row.spin_axis_deg),
    inducedVertBreakIn: num(row.induced_vert_break_in),
    horzBreakIn: num(row.horz_break_in),
    relHeightFt: num(row.rel_height_ft),
    relSideFt: num(row.rel_side_ft),
    extensionFt: num(row.extension_ft),
    pitchNo: row.pitch_no,
  }
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Gauge className="h-6 w-6 text-electric-blue-light" />
        <h1 className="text-2xl font-bold text-white">Pitch Data</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Ball-flight numbers measured by a real device. Upload a TrackMan or Rapsodo export, or type in a
        pitch by hand. Every number here keeps the source it came from, and nothing on this page is
        estimated by Pitch Nav.
      </p>
    </div>
  )
}

export default async function PitchDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessionData, error: sessionError } = await supabase
    .from('pitch_data_sessions')
    .select('id,source,session_date,created_at,file_name,pitcher_name')
    .order('session_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (sessionError) {
    const missingTable = sessionError.code === MISSING_TABLE_CODE
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="card">
          <h2 className="font-bold text-white">{missingTable ? 'One setup step left' : 'Could not load your pitch data'}</h2>
          {missingTable ? (
            <p className="mt-2 text-sm text-slate-400">
              This screen needs its database tables created once. Open the Supabase SQL editor for this
              project and run <code className="text-slate-300">{MIGRATION_FILE}</code>. As soon as that
              finishes, this page will work.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-400">
                Something went wrong loading your sessions. Reloading usually fixes it; if it keeps
                happening, share the message below.
              </p>
              <p className="mt-2 rounded-lg bg-navy-950 p-3 font-mono text-xs text-slate-500">
                {sessionError.message}
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const sessions = (sessionData ?? []) as SessionRow[]

  const { data: recordData } = sessions.length
    ? await supabase
        .from('pitch_records')
        .select(
          'session_id,pitch_type,rel_speed_mph,spin_rate_rpm,spin_axis_deg,induced_vert_break_in,horz_break_in,rel_height_ft,rel_side_ft,extension_ft,pitch_no',
        )
        .in('session_id', sessions.map((session) => session.id))
        .order('pitch_no', { ascending: true })
    : { data: [] as RecordRow[] }

  const records = (recordData ?? []) as RecordRow[]

  const bySession = new Map<string, PitchRecord[]>()
  for (const row of records) {
    const pitch = toPitchRecord(row)
    const existing = bySession.get(row.session_id)
    if (existing) existing.push(pitch)
    else bySession.set(row.session_id, [pitch])
  }

  const allPitches = records.map(toPitchRecord)
  const averages = averagesByPitchType(allPitches)
  const trend = velocityOverTime(
    sessions.map((s) => ({ id: s.id, session_date: s.session_date, created_at: s.created_at, source: s.source })),
    bySession,
  )

  // Source mix, so the athlete and the reviewer can see at a glance how much of
  // this is device-measured versus typed in.
  const sourceCounts = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.source] = (acc[session.source] ?? 0) + 1
    return acc
  }, {})

  const hasData = sessions.length > 0

  return (
    <div className="space-y-8">
      <PageHeader />

      <div className="flex items-start gap-3 rounded-xl border border-electric-blue/20 bg-electric-blue/5 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-electric-blue-light" />
        <p className="text-sm text-slate-400">Phone-based tracking coming soon.</p>
      </div>

      <AddPitchData />

      {!hasData ? (
        <div className="card py-12 text-center">
          <Gauge className="mx-auto h-10 w-10 text-electric-blue-light" />
          <h2 className="mt-4 text-xl font-black text-white">No pitch data yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Add a TrackMan or Rapsodo export, or enter a single pitch by hand. Your averages and velocity
            trend will appear here once there is something to show.
          </p>
        </div>
      ) : (
        <>
          <section className="card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Velocity across sessions</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {trend.length} session{trend.length === 1 ? '' : 's'} with a velocity reading.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {Object.entries(sourceCounts)
                  .map(([source, count]) => `${count}× ${sourceLabel(source)}`)
                  .join(' · ')}
              </p>
            </div>
            <div className="mt-6">
              <VelocityTrendChart points={trend} />
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-white">Averages by pitch type</h2>
            <p className="mt-1 text-sm text-slate-400">
              Across all {allPitches.length} stored pitch{allPitches.length === 1 ? '' : 'es'}. Each average
              covers only the pitches that actually carried that reading, so a blank stays blank.
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-navy-800 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Pitch type</th>
                    <th className="px-3 py-2">Pitches</th>
                    <th className="px-3 py-2">Avg velo</th>
                    <th className="px-3 py-2">Peak</th>
                    <th className="px-3 py-2">Spin</th>
                    <th className="px-3 py-2">Axis</th>
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
                      <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgSpinAxisDeg, 0)}</td>
                      <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgInducedVertBreakIn, 1)}</td>
                      <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgHorzBreakIn, 1)}</td>
                      <td className="px-3 py-2 text-slate-300">{formatMeasurement(row.avgExtensionFt, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Velocity and peak in mph · spin in rpm · axis in degrees · induced vertical break (IVB) and
              horizontal break (HB) in inches · extension in feet.
            </p>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-white">Your sessions</h2>
            <div className="mt-4 space-y-3">
              {sessions.map((session) => {
                const count = bySession.get(session.id)?.length ?? 0
                return (
                  <div
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-navy-950 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {formatSessionLabel(session.session_date, session.created_at)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {count} pitch{count === 1 ? '' : 'es'} · {sourceLabel(session.source)}
                        {session.file_name ? ` · ${session.file_name}` : ''}
                        {session.pitcher_name ? ` · matched to ${session.pitcher_name}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

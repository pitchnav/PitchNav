import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Download, Play, Star, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import {
  PITCH_POSITION_LABELS,
  PLAYING_LEVEL_LABELS,
  formatHeight,
  formatDate,
} from '@/lib/utils'
import type {
  AnalysisReport,
  AthleteProfile,
  ScorecardCategory,
  PositionScreenshot,
  AssignedDrill,
  Drill,,
  PlayingLevel,
  PitchPosition
} from '@/types/database'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch order to verify ownership
  const { data: order } = await supabase
    .from('orders')
    .select('*, athlete_profiles(*), analysis_reports(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order || order.status !== 'complete') notFound()

  const report = order.analysis_reports as AnalysisReport
  const profile = order.athlete_profiles as AthleteProfile

  if (!report || !report.published_at) notFound()

  // Fetch report sub-data
  const [scorecardRes, positionsRes, assignedDrillsRes] = await Promise.all([
    supabase.from('scorecard_categories').select('*').eq('report_id', report.id),
    supabase.from('position_screenshots').select('*').eq('report_id', report.id).order('sort_order'),
    supabase.from('assigned_drills').select('*, drill:drills(*)').eq('report_id', report.id).order('sort_order'),
  ])

  const scorecard = scorecardRes.data as ScorecardCategory[] ?? []
  const positions = positionsRes.data as PositionScreenshot[] ?? []
  const assignedDrills = assignedDrillsRes.data as (AssignedDrill & { drill: Drill })[] ?? []

  // Generate PDF download URL
  let pdfUrl: string | null = null
  if (report.pdf_storage_path) {
    const { data } = await supabase.storage
      .from('analysis-assets')
      .createSignedUrl(report.pdf_storage_path, 3600)
    pdfUrl = data?.signedUrl ?? null
  }

  let voiceoverUrl: string | null = null
  if (report.voiceover_storage_path) {
    const { data } = await supabase.storage
      .from('analysis-assets')
      .createSignedUrl(report.voiceover_storage_path, 3600)
    voiceoverUrl = data?.signedUrl ?? null
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-white transition-colors mb-2 block">
          ← Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Pitching Analysis Report</h1>
            <p className="text-slate-400 mt-1">{report.published_at ? formatDate(report.published_at) : ''}</p>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} download className="btn-secondary flex-shrink-0">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Athlete summary */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            {[
              ['Athlete', profile.athlete_full_name],
              ['Height / Weight', `${formatHeight(profile.height_feet, profile.height_inches)} / ${profile.weight_lbs ?? '—'} lbs`],
              ['Throws', `${profile.throwing_hand}-handed`],
              ['Level', profile.playing_level ? PLAYING_LEVEL_LABELS[profile.playing_level as PlayingLevel] : '—'],
              ['Current Velocity (Athlete-Provided)', profile.current_avg_velocity ? `${profile.current_avg_velocity} mph avg / ${profile.current_max_velocity ?? '—'} mph max` : '—'],
              ['Goal Velocity', profile.goal_velocity ? `${profile.goal_velocity} mph` : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          {report.delivery_score !== null && (
            <div className="flex-shrink-0 text-center rounded-xl bg-electric-blue/10 border border-electric-blue/20 px-6 py-4">
              <p className="text-4xl font-black text-white">{report.delivery_score}</p>
              <p className="text-xs text-slate-500 mt-1">out of 30</p>
              <p className="text-xs text-electric-blue-light font-semibold mt-1">Delivery Score</p>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Velocity is athlete-provided and not independently verified. The Delivery Score is an internal
          coaching tool for tracking development in the same athlete over time — not a medical score.
        </p>
      </div>

      {/* Voice-over video */}
      {voiceoverUrl && (
        <div className="card mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-electric-blue-light" /> Voice-Over Analysis
          </h2>
          <video
            src={voiceoverUrl}
            controls
            className="w-full rounded-lg bg-black"
            aria-label="Reviewer voice-over analysis"
          >
            <track kind="captions" label="Captions" />
            Your browser does not support video playback.
          </video>
          <p className="text-xs text-slate-600 mt-2">
            If captions or a transcript are available, they can be accessed via the video controls.
          </p>
        </div>
      )}

      {/* Scorecard */}
      {scorecard.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-lg font-bold text-white mb-2">Mechanics Scorecard</h2>
          <p className="text-xs text-slate-500 mb-6">
            Internal coaching tool. Not a medical score or laboratory biomechanics measurement.
          </p>
          <div className="space-y-5">
            {scorecard.map((cat) => (
              <div key={cat.id}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-semibold text-white capitalize">
                    {cat.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-bold text-electric-blue-light">{cat.score}/5</span>
                </div>
                <ProgressBar value={cat.score} max={5} color="blue" size="sm" />
                {cat.notes && <p className="text-xs text-slate-500 mt-1.5">{cat.notes}</p>}
              </div>
            ))}
          </div>
          {report.delivery_score !== null && (
            <div className="mt-6 pt-4 border-t border-surface-border flex justify-between items-center">
              <span className="text-base font-semibold text-white">Total Delivery Score</span>
              <span className="text-2xl font-black text-accent-green">{report.delivery_score}/30</span>
            </div>
          )}
        </div>
      )}

      {/* Position breakdown */}
      {positions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Six-Position Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {positions.map((pos) => (
              <div key={pos.id} className="card">
                {pos.image_url ? (
                  <img
                    src={pos.image_url}
                    alt={`Annotated screenshot — ${PITCH_POSITION_LABELS[pos.position as PitchPosition]}`}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="h-40 rounded-lg bg-navy-800 border border-surface-border flex items-center justify-center mb-4">
                    <p className="text-xs text-slate-600">[{PITCH_POSITION_LABELS[pos.position as PitchPosition]}]</p>
                  </div>
                )}
                <h3 className="text-base font-bold text-white mb-2">
                  {PITCH_POSITION_LABELS[pos.position as PitchPosition]}
                </h3>
                {pos.reviewer_notes && <p className="text-xs text-slate-400 mb-4">{pos.reviewer_notes}</p>}
                <div className="space-y-3">
                  {pos.strengths && (
                    <div className="rounded-lg bg-accent-green/5 border border-accent-green/20 p-3">
                      <p className="text-xs font-semibold text-accent-green mb-1">Strength</p>
                      <p className="text-xs text-slate-300">{pos.strengths}</p>
                    </div>
                  )}
                  {pos.development_opportunity && (
                    <div className="rounded-lg bg-electric-blue/5 border border-electric-blue/20 p-3">
                      <p className="text-xs font-semibold text-electric-blue-light mb-1">Development Opportunity</p>
                      <p className="text-xs text-slate-300">{pos.development_opportunity}</p>
                    </div>
                  )}
                  {pos.coaching_cue && (
                    <div className="rounded-lg bg-surface-hover p-3">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Coaching Cue</p>
                      <p className="text-xs text-white italic">"{pos.coaching_cue}"</p>
                    </div>
                  )}
                  {pos.estimated_angle && (
                    <p className="text-xs text-slate-600">Estimated angle: {pos.estimated_angle} (video-based estimate)</p>
                  )}
                  {pos.quality_note && (
                    <p className="text-xs text-yellow-400/70 italic">{pos.quality_note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Priorities */}
      {(report.three_strengths?.length || report.three_priorities?.length) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {report.three_strengths && (
            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4">Three Strengths</h2>
              <ul className="space-y-3">
                {report.three_strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Star className="h-4 w-4 text-accent-green flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.three_priorities && (
            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4">Three Development Priorities</h2>
              <ul className="space-y-3">
                {report.three_priorities.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-electric-blue-light font-bold text-sm w-5 flex-shrink-0">{i + 1}.</span>
                    <span className="text-sm text-slate-300">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main focus */}
      {report.main_focus && (
        <div className="card border-electric-blue/30 mb-8">
          <h2 className="text-base font-semibold text-electric-blue-light mb-2">Main Focus</h2>
          <p className="text-white">{report.main_focus}</p>
          {report.secondary_focuses?.map((f, i) => (
            <p key={i} className="text-slate-400 text-sm mt-2">{f}</p>
          ))}
        </div>
      )}

      {/* Assigned drills */}
      {assignedDrills.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Assigned Drills</h2>
          <div className="space-y-5">
            {assignedDrills.map(({ id, drill, custom_note }) => (
              <div key={id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{drill.name}</h3>
                    <span className="text-xs text-electric-blue-light capitalize">
                      {drill.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{drill.sets} sets × {drill.reps}</p>
                </div>
                <p className="text-sm text-slate-400 mb-4">{drill.description}</p>
                {drill.coaching_cues && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Coaching Cues</p>
                    <ul className="space-y-1">
                      {drill.coaching_cues.map((cue, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-electric-blue-light flex-shrink-0 mt-0.5" />
                          {cue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {drill.common_mistakes && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Common Mistakes</p>
                    <ul className="space-y-1">
                      {drill.common_mistakes.map((m, i) => (
                        <li key={i} className="text-xs text-slate-400">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {drill.demo_video_url && (
                  <a href={drill.demo_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-electric-blue-light hover:underline">
                    Watch demonstration video
                  </a>
                )}
                {custom_note && (
                  <div className="mt-3 rounded-lg bg-electric-blue/5 border border-electric-blue/20 p-3">
                    <p className="text-xs text-electric-blue-glow">{custom_note}</p>
                  </div>
                )}
                {drill.contraindications && (
                  <p className="text-xs text-yellow-400/70 mt-3">⚠️ {drill.contraindications}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Four-week plan */}
      {report.four_week_plan && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Four-Week Focus Plan</h2>
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-slate-300 whitespace-pre-line leading-relaxed">{report.four_week_plan}</p>
          </div>
        </div>
      )}

      {/* Velocity notes */}
      {report.reviewer_velocity_notes && (
        <div className="card mb-8">
          <h2 className="text-base font-semibold text-white mb-3">Velocity Notes</h2>
          <p className="text-sm text-slate-400">{report.reviewer_velocity_notes}</p>
          <p className="text-xs text-slate-600 mt-3">
            Velocity information in this report is based on athlete-provided readings unless otherwise noted.
            PitchFrame does not verify velocity from standard phone video without calibration data.
          </p>
        </div>
      )}

      {/* Follow-up recommendation */}
      {report.follow_up_recommendation && (
        <div className="card border-accent-green/20 mb-8">
          <h2 className="text-base font-semibold text-accent-green mb-2">Follow-Up Recommendation</h2>
          <p className="text-sm text-slate-300">{report.follow_up_recommendation}</p>
          <Link href="/contact" className="btn-accent mt-4 text-sm">
            Request Follow-Up Analysis
          </Link>
        </div>
      )}

      {/* Download */}
      {pdfUrl && (
        <div className="card text-center mb-8">
          <h2 className="text-lg font-bold text-white mb-2">Download Your Report</h2>
          <p className="text-slate-400 text-sm mb-4">
            Save your complete analysis as a PDF to share with your coach.
          </p>
          <a href={pdfUrl} download className="btn-secondary">
            <Download className="h-4 w-4" /> Download PDF Report
          </a>
        </div>
      )}

      <SafetyDisclaimer />
    </div>
  )
}

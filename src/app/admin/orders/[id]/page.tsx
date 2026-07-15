'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrderStatusBadge } from '@/components/ui/Badge'
import {
  formatDateShort, formatFileSize, ORDER_STATUS_LABELS,
  PLAYING_LEVEL_LABELS, SCORECARD_CATEGORIES,
  PITCH_POSITION_LABELS, DRILL_CATEGORY_LABELS,
} from '@/lib/utils'
import type {
  Order, AthleteProfile, VideoSubmission, Drill,
  AssignedDrill, ScorecardCategory, PositionScreenshot, OrderStatus,
  PlayingLevel,
  DrillCategory
} from '@/types/database'
import { Video, CheckCircle, XCircle, Upload, Plus, Trash2, Save, Send } from 'lucide-react'

type AutomatedCategory = {
  category: string
  score: number
  confidence: 'Low' | 'Moderate' | 'High'
  strength: string
  development: string
  evidence: string
}

type AutomatedPhase = {
  key: string
  label: string
  time: number
  storage_path: string
  confidence_note: string
}

type AutomatedAnalysis = {
  id: string
  delivery_score: number | null
  category_scores: AutomatedCategory[]
  phase_snapshots: AutomatedPhase[]
  strengths: string[]
  development_priorities: string[]
  coach_feedback: string | null
  velocity_estimate_low: number | null
  velocity_estimate_high: number | null
  velocity_confidence: string | null
}

const POSITION_FROM_AUTOMATED: Record<string, string> = {
  peak_leg_lift: 'peak_leg_lift',
  hand_separation: 'hand_separation',
  lead_foot_contact: 'lead_foot_contact',
  maximum_external_rotation: 'max_external_rotation',
  ball_release: 'ball_release',
  finish: 'finish_deceleration',
}

function scorecardKey(category: string) {
  return category.toLowerCase().replace(/[–—-]+/g, '_').replace(/\s+/g, '_')
}

const STATUS_OPTIONS: OrderStatus[] = [
  'submitted', 'video_quality_review', 'in_analysis',
  'additional_video_requested', 'report_being_prepared',
  'complete', 'follow_up_available', 'cancelled', 'refunded',
]

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  // Memoize the client so it's stable across renders and won't trigger infinite loops
  const supabase = useMemo(() => createClient(), [])

  const [loadError, setLoadError] = useState('')
  const [reportId, setReportId] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [videos, setVideos] = useState<VideoSubmission[]>([])
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [drills, setDrills] = useState<Drill[]>([])
  const [assigned, setAssigned] = useState<AssignedDrill[]>([])
  const [scorecard, setScorecard] = useState<ScorecardCategory[]>([])
  const [positions, setPositions] = useState<PositionScreenshot[]>([])
  const [automatedAnalysis, setAutomatedAnalysis] = useState<AutomatedAnalysis | null>(null)
  const [phaseUrls, setPhaseUrls] = useState<Record<string, string>>({})
  const [draftMessage, setDraftMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [reportNotes, setReportNotes] = useState('')
  const [velocityNotes, setVelocityNotes] = useState('')
  const [overallNotes, setOverallNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')
  const [activeTab, setActiveTab] = useState<'info' | 'videos' | 'report' | 'drills'>('info')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const loadData = useCallback(async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, athlete_profiles(*), video_submissions(*)')
      .eq('id', id)
      .single()

    if (!orderData) { setLoadError('This order could not be loaded. Confirm it still exists and that your account is an administrator.'); return }

    setOrder(orderData as Order)
    setProfile(orderData.athlete_profiles as AthleteProfile)
    setVideos((orderData.video_submissions as VideoSubmission[]) ?? [])
    setNewStatus(orderData.status as OrderStatus)

    const athleteProfileId = orderData.athlete_profiles?.id
    if (athleteProfileId) {
      const { data: automated } = await supabase
        .from('motion_analyses')
        .select('id,delivery_score,category_scores,phase_snapshots,strengths,development_priorities,coach_feedback,velocity_estimate_low,velocity_estimate_high,velocity_confidence')
        .eq('athlete_profile_id', athleteProfileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const typed = automated as AutomatedAnalysis | null
      setAutomatedAnalysis(typed)
      const snapshots = Array.isArray(typed?.phase_snapshots) ? typed.phase_snapshots : []
      const signed: Record<string, string> = {}
      for (const snapshot of snapshots) {
        if (!snapshot.storage_path) continue
        const { data } = await supabase.storage.from('analysis-assets').createSignedUrl(snapshot.storage_path, 3600)
        if (data?.signedUrl) signed[snapshot.key] = data.signedUrl
      }
      setPhaseUrls(signed)
    }

    // Report fields
    const { data: report } = await supabase
      .from('analysis_reports')
      .select('*')
      .eq('order_id', id)
      .single()
    if (report) {
      setReportId(report.id)
      const [{ data: scoreRows }, { data: positionRows }, { data: assignedRows }] = await Promise.all([
        supabase.from('scorecard_categories').select('*').eq('report_id', report.id),
        supabase.from('position_screenshots').select('*').eq('report_id', report.id),
        supabase.from('assigned_drills').select('*,drills(*)').eq('report_id', report.id),
      ])
      setScorecard((scoreRows as ScorecardCategory[]) ?? [])
      setPositions((positionRows as PositionScreenshot[]) ?? [])
      setAssigned((assignedRows as AssignedDrill[]) ?? [])
      setReportNotes(report.overall_assessment ?? '')
      setVelocityNotes(report.velocity_notes ?? '')
      setOverallNotes(report.notess ?? '')
      setFollowUp(report.follow_up_recommendation ?? '')
    }

    // Drill library
    const { data: drillData } = await supabase.from('drills').select('*').eq('is_active', true).order('name')
    setDrills((drillData as Drill[]) ?? [])

    // Signed video URLs
    const urls: Record<string, string> = {}
    for (const v of (orderData.video_submissions as VideoSubmission[]) ?? []) {
      const { data } = await supabase.storage.from('pitch-videos').createSignedUrl(v.storage_path, 3600)
      if (data?.signedUrl) urls[v.id] = data.signedUrl
    }
    setVideoUrls(urls)
  }, [id, supabase])

  useEffect(() => { loadData() }, [loadData])

  async function saveVideoTrim(videoId: string) {
    const start = Number((document.getElementById(`trim-start-${videoId}`) as HTMLInputElement)?.value || 0)
    const endRaw = (document.getElementById(`trim-end-${videoId}`) as HTMLInputElement)?.value
    const end = endRaw ? Number(endRaw) : null
    if (start < 0 || (end !== null && end <= start)) { alert('Trim end must be after trim start.'); return }
    await supabase.from('video_submissions').update({ trim_start_secs: start, trim_end_secs: end }).eq('id', videoId)
    alert('Analysis range saved. Only this complete-motion range should be used during review.')
    await loadData()
  }

  async function updateVideoQuality(videoId: string, approved: boolean, reason?: string) {
    await supabase
      .from('video_submissions')
      .update({ quality_approved: approved, quality_rejection_reason: reason ?? null })
      .eq('id', videoId)
    await loadData()
  }

  async function changeStatus() {
    if (!newStatus || newStatus === order?.status) return
    setSaving(true)
    const supabaseAdmin = createClient()
    await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', id)
    await supabaseAdmin.from('order_status_history').insert({
      order_id: id,
      new_status: newStatus,
      changed_by: 'admin',
      note: statusNote || null,
    })
    setSaving(false)
    setStatusNote('')
    await loadData()
  }

  async function saveReport() {
    setSaving(true)
    const { data: savedReport } = await supabase.from('analysis_reports').upsert({
      order_id: id,
      overall_assessment: reportNotes,
      velocity_notes: velocityNotes,
      notess: overallNotes,
      follow_up_recommendation: followUp,
    }, { onConflict: 'order_id' }).select('id').single()
    if (savedReport?.id) setReportId(savedReport.id)
    setSaving(false)
  }

  async function saveScorecardItem(category: string, score: number, note: string) {
    if (!reportId) { await saveReport(); return }
    await supabase.from('scorecard_categories').upsert({
      report_id: reportId,
      category,
      score,
      notes: note,
    }, { onConflict: 'report_id,category' })
  }

  async function applyAutomatedDraft() {
    if (!automatedAnalysis) return
    setSaving(true)
    setDraftMessage('')
    try {
      const categories = Array.isArray(automatedAnalysis.category_scores) ? automatedAnalysis.category_scores : []
      const phases = Array.isArray(automatedAnalysis.phase_snapshots) ? automatedAnalysis.phase_snapshots : []
      const velocityRange = automatedAnalysis.velocity_estimate_low !== null && automatedAnalysis.velocity_estimate_high !== null
        ? `Video-estimated range: ${automatedAnalysis.velocity_estimate_low.toFixed(1)}–${automatedAnalysis.velocity_estimate_high.toFixed(1)} mph (${automatedAnalysis.velocity_confidence ?? 'limited'} confidence). Not radar verified.`
        : 'No video velocity range was produced. Do not infer exact velocity from mechanics scores.'
      const { data: report, error: reportError } = await supabase.from('analysis_reports').upsert({
        order_id: id,
        delivery_score: automatedAnalysis.delivery_score,
        three_strengths: automatedAnalysis.strengths?.slice(0, 3) ?? [],
        three_priorities: automatedAnalysis.development_priorities?.slice(0, 3) ?? [],
        overall_assessment: automatedAnalysis.coach_feedback ?? 'Automated video draft prepared for staff verification.',
        velocity_notes: velocityRange,
      }, { onConflict: 'order_id' }).select('id').single()
      if (reportError || !report) throw reportError ?? new Error('Could not create report draft.')

      for (const category of categories) {
        const key = scorecardKey(category.category)
        await supabase.from('scorecard_categories').upsert({
          report_id: report.id,
          category: key,
          score: Math.max(1, Math.min(5, Number(category.score) || 3)),
          notes: `${category.strength} ${category.development} Evidence: ${category.evidence} Confidence: ${category.confidence}.`,
        }, { onConflict: 'report_id,category' })
      }

      for (let index = 0; index < phases.length; index += 1) {
        const phase = phases[index]
        const position = POSITION_FROM_AUTOMATED[phase.key]
        if (!position || !phase.storage_path) continue
        await supabase.from('position_screenshots').upsert({
          report_id: report.id,
          position,
          storage_path: phase.storage_path,
          reviewer_notes: `Automatically selected at ${Number(phase.time).toFixed(2)} seconds. Staff must verify this event before release.`,
          quality_note: phase.confidence_note,
          sort_order: index,
        }, { onConflict: 'report_id,position' })
      }
      setDraftMessage('Automated draft applied. Verify every score and phase frame before publishing.')
      await loadData()
    } catch (reason) {
      setDraftMessage(reason instanceof Error ? reason.message : 'Could not apply the automated draft.')
    } finally {
      setSaving(false)
    }
  }

  async function addDrill(drillId: string) {
    if (!reportId) return
    await supabase.from('assigned_drills').insert({ report_id: reportId, drill_id: drillId })
    await loadData()
  }

  async function removeDrill(assignedId: string) {
    await supabase.from('assigned_drills').delete().eq('id', assignedId)
    await loadData()
  }

  async function sendEmail() {
    setSendingEmail(true)
    await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, subject: emailSubject, body: emailBody }),
    })
    setSendingEmail(false)
    setEmailSent(true)
    setEmailSubject('')
    setEmailBody('')
    setTimeout(() => setEmailSent(false), 4000)
  }

  if (!order) {
    if (loadError) return <div className="card border-red-500/30 text-red-300">{loadError}</div>
    return (
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="h-8 bg-navy-800 rounded w-64 mb-8" />
        <div className="card h-48" />
      </div>
    )
  }

  const tabs = [
    { key: 'info', label: 'Athlete & Status' },
    { key: 'videos', label: 'Videos' },
    { key: 'report', label: 'Report Entry' },
    { key: 'drills', label: 'Drills' },
  ] as const

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <a href="/admin/orders" className="text-sm text-slate-500 hover:text-white block mb-2">← All Orders</a>
          <h1 className="text-2xl font-black text-white">Order #{id.slice(0, 8).toUpperCase()}</h1>
        </div>
        <div className="text-right"><OrderStatusBadge status={order.status} /><p className={`mt-2 text-xs font-bold ${order.payment_confirmed_at ? 'text-accent-green' : 'text-yellow-300'}`}>{order.payment_confirmed_at ? `Payment confirmed · $${((order.amount_paid_cents ?? 0)/100).toFixed(2)}` : 'Payment not confirmed'}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-surface-border">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'text-white border-electric-blue-light'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---- INFO TAB ---- */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Athlete summary */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Athlete Profile</h2>
            {profile ? (
              <dl className="space-y-2 text-sm">
                {[
                  ['Name', profile.athlete_full_name],
                  ['DOB', profile.date_of_birth ?? '—'],
                  ['Level', profile.playing_level ? PLAYING_LEVEL_LABELS[profile.playing_level as PlayingLevel] : '—'],
                  ['Throws', profile.throwing_hand],
                  ['Height', profile.height_feet ? `${profile.height_feet}'${profile.height_inches ?? 0}"` : '—'],
                  ['Weight', profile.weight_lbs ? `${profile.weight_lbs} lbs` : '—'],
                  ['Avg Velocity', profile.current_avg_velocity ? `${profile.current_avg_velocity} mph` : '—'],
                  ['Goal Velocity', profile.goal_velocity ? `${profile.goal_velocity} mph` : '—'],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-white font-medium">{v}</dd>
                  </div>
                ))}
                {profile.health_flagged && (
                  <div className="mt-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <p className="text-sm text-yellow-400 font-semibold">⚠ Health Flag Active</p>
                    <p className="text-xs text-yellow-300/70 mt-1">
                      This athlete flagged health concerns during intake. Review before analysis.
                    </p>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-slate-500 text-sm">Profile not found.</p>
            )}
          </div>

          {/* Status change */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-base font-semibold text-white mb-4">Change Status</h2>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="input mb-3"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                ))}
              </select>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Internal note for this status change (optional)"
                rows={2}
                className="input mb-3"
              />
              <button
                onClick={changeStatus}
                disabled={saving || !newStatus || newStatus === order.status}
                className="btn-primary w-full justify-center"
              >
                {saving ? 'Saving…' : 'Update Status'}
              </button>
            </div>

            {/* Email athlete */}
            <div className="card">
              <h2 className="text-base font-semibold text-white mb-4">Email Athlete</h2>
              {emailSent ? (
                <p className="text-sm text-accent-green font-semibold">Email sent!</p>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="input"
                  />
                  <textarea
                    placeholder="Message body…"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={4}
                    className="input"
                  />
                  <button
                    onClick={sendEmail}
                    disabled={sendingEmail || !emailSubject || !emailBody}
                    className="btn-secondary w-full justify-center"
                  >
                    <Send className="h-4 w-4" />
                    {sendingEmail ? 'Sending…' : 'Send Email'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- VIDEOS TAB ---- */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Video Review</h2>
          {videos.length === 0 && <p className="text-slate-500">No videos submitted yet.</p>}
          {videos.map((video) => (
            <div key={video.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white capitalize">{video.angle.replace('_', ' ')} View</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateVideoQuality(video.id, true)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason for athlete:')
                      if (reason !== null) updateVideoQuality(video.id, false, reason)
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>

              {videoUrls[video.id] ? (
                <video
                  src={videoUrls[video.id]}
                  controls
                  className="w-full rounded-lg bg-black max-h-80 object-contain mb-3"
                />
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Video className="h-4 w-4" />
                  {video.file_name} {video.file_size_bytes && `· ${formatFileSize(video.file_size_bytes)}`}
                </div>
              )}

              <div className="mb-4 rounded-xl border border-electric-blue/20 bg-navy-950 p-4">
                <h4 className="font-semibold text-white">Analysis-range trimmer</h4><p className="mt-1 text-xs text-slate-400">Set the start at the first movement of the delivery and the end after the athlete completes the full finish. This is non-destructive: the original video remains secure.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label><span className="label">Start (seconds)</span><input id={`trim-start-${video.id}`} type="number" min="0" step="0.01" defaultValue={(video as VideoSubmission & { trim_start_secs?: number }).trim_start_secs ?? 0} className="input" /></label><label><span className="label">End (seconds)</span><input id={`trim-end-${video.id}`} type="number" min="0" step="0.01" defaultValue={(video as VideoSubmission & { trim_end_secs?: number | null }).trim_end_secs ?? video.duration_secs ?? ''} className="input" /></label><button type="button" onClick={() => saveVideoTrim(video.id)} className="btn-primary self-end">Save analysis range</button></div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  video.quality_approved === true ? 'bg-accent-green/10 text-accent-green' :
                  video.quality_approved === false ? 'bg-red-400/10 text-red-400' :
                  'bg-slate-700/40 text-slate-400'
                }`}>
                  {video.quality_approved === true ? 'Approved' :
                   video.quality_approved === false ? 'Rejected' : 'Pending'}
                </span>
                {video.quality_rejection_reason && (
                  <span className="text-xs text-red-400">Reason: {video.quality_rejection_reason}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- REPORT TAB ---- */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="card border-electric-blue-light/30 bg-electric-blue/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">Automated review draft</p>
                <h2 className="mt-1 text-lg font-bold text-white">AI prepares the report; staff verifies it</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Pose tracking can generate score candidates and six phase images. Peak leg lift and finish are stronger candidates. Hand separation, foot contact, maximum external rotation, and ball release must be visually confirmed; ordinary 2D phone video cannot identify all of those events exactly.</p>
              </div>
              <button onClick={applyAutomatedDraft} disabled={!automatedAnalysis || saving} className="btn-primary shrink-0">
                <CheckCircle className="h-4 w-4" /> {saving ? 'Applying…' : 'Apply automated draft'}
              </button>
            </div>
            {!automatedAnalysis && <p className="mt-3 text-sm text-yellow-300">No saved Motion Lab result is connected to this athlete yet. Run and save Motion Lab processing before an automatic draft can be generated.</p>}
            {draftMessage && <p className="mt-3 text-sm text-accent-green">{draftMessage}</p>}
          </div>
          {/* Scorecard */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-6">Scorecard (1–5 each)</h2>
            <div className="space-y-4">
              {SCORECARD_CATEGORIES.map(({ key, label }) => {
                const existing = scorecard.find((s) => s.category === key)
                const automatic = automatedAnalysis?.category_scores?.find((item) => scorecardKey(item.category) === key)
                return (
                  <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    <label className="text-sm text-slate-300 pt-2">{label}</label>
                    <select
                      data-key={key}
                      defaultValue={existing?.score ?? automatic?.score ?? ''}
                      onChange={(e) => {
                        const score = parseInt(e.target.value)
                        const note = (document.getElementById(`note-${key}`) as HTMLTextAreaElement)?.value ?? ''
                        if (score) saveScorecardItem(key, score, note)
                      }}
                      className="input"
                    >
                      <option value="">Select score</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <input
                      id={`note-${key}`}
                      type="text"
                      defaultValue={existing?.notes ?? (automatic ? `${automatic.strength} ${automatic.development} Evidence: ${automatic.evidence} Confidence: ${automatic.confidence}.` : '')}
                      placeholder="Coach note…"
                      onBlur={(e) => {
                        const score = parseInt(
                          (document.querySelector(`[data-key="${key}"]`) as HTMLSelectElement)?.value ?? ''
                        )
                        saveScorecardItem(key, score || existing?.score || 3, e.target.value)
                      }}
                      className="input text-sm"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Position screenshots */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Position Screenshots</h2>
              <p className="text-xs text-slate-500">Upload via Supabase Storage → analysis-assets bucket</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(PITCH_POSITION_LABELS).map(([pos, label]) => {
                const existing = positions.find((p) => p.position === pos)
                const autoPhase = automatedAnalysis?.phase_snapshots?.find((phase) => POSITION_FROM_AUTOMATED[phase.key] === pos)
                const imageUrl = autoPhase ? phaseUrls[autoPhase.key] : undefined
                const limited = ['hand_separation', 'max_external_rotation', 'ball_release'].includes(pos)
                return (
                  <div key={pos} className="rounded-lg border border-surface-border bg-navy-800 p-3">
                    <p className="text-xs text-slate-400 mb-2">{label}</p>
                    {imageUrl && <img src={imageUrl} alt={`${label} automatically selected candidate frame`} className="mb-3 aspect-video w-full rounded-md object-contain bg-black" />}
                    {existing?.storage_path ? (
                      <div className="flex items-center gap-1 text-xs text-accent-green">
                        <CheckCircle className="h-3.5 w-3.5" /> Uploaded
                      </div>
                    ) : autoPhase ? (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-electric-blue-light"><CheckCircle className="h-3.5 w-3.5" /> Automated candidate</div>
                        <p className={`mt-2 text-[11px] ${limited ? 'text-yellow-300' : 'text-slate-500'}`}>{limited ? 'Limited-confidence event — staff confirmation required.' : autoPhase.confidence_note}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Upload className="h-3.5 w-3.5" /> Not uploaded
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Narrative fields */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-white mb-2">Analysis Narrative</h2>
            {[
              { label: 'Overall Assessment', key: 'reportNotes', val: reportNotes, set: setReportNotes },
              { label: 'Velocity Notes', key: 'velocityNotes', val: velocityNotes, set: setVelocityNotes },
              { label: 'Coach Private Notes (not shown to athlete)', key: 'overallNotes', val: overallNotes, set: setOverallNotes },
              { label: 'Follow-Up Recommendation', key: 'followUp', val: followUp, set: setFollowUp },
            ].map(({ label, key, val, set }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <textarea
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  rows={3}
                  className="input"
                />
              </div>
            ))}
            <button
              onClick={saveReport}
              disabled={saving}
              className="btn-primary"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Report Data'}
            </button>
          </div>
        </div>
      )}

      {/* ---- DRILLS TAB ---- */}
      {activeTab === 'drills' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned drills */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Assigned Drills ({assigned.length})</h2>
            {assigned.length === 0 ? (
              <p className="text-sm text-slate-500">No drills assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {assigned.map((a) => {
                  const drill = (a as AssignedDrill & { drills: Drill }).drills
                  return (
                    <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-surface-border p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{drill?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{drill?.category ? DRILL_CATEGORY_LABELS[drill.category as DrillCategory] : ''}</p>
                      </div>
                      <button
                        onClick={() => removeDrill(a.id)}
                        className="text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Drill library */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Drill Library</h2>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {drills
                .filter((d) => !assigned.some((a) => a.drill_id === d.id))
                .map((drill) => (
                  <li key={drill.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{drill.name}</p>
                      <p className="text-xs text-slate-500">{DRILL_CATEGORY_LABELS[drill.category as DrillCategory]}</p>
                    </div>
                    <button
                      onClick={() => addDrill(drill.id)}
                      className="text-electric-blue-light hover:text-white flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

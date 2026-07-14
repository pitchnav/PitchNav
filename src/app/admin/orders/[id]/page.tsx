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

const STATUS_OPTIONS: OrderStatus[] = [
  'submitted', 'video_quality_review', 'in_analysis',
  'additional_video_requested', 'report_being_prepared',
  'complete', 'follow_up_available', 'cancelled', 'refunded',
]

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  // Memoize the client so it's stable across renders and won't trigger infinite loops
  const supabase = useMemo(() => createClient(), [])

  const [order, setOrder] = useState<Order | null>(null)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [videos, setVideos] = useState<VideoSubmission[]>([])
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [drills, setDrills] = useState<Drill[]>([])
  const [assigned, setAssigned] = useState<AssignedDrill[]>([])
  const [scorecard, setScorecard] = useState<ScorecardCategory[]>([])
  const [positions, setPositions] = useState<PositionScreenshot[]>([])
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
      .select('*, athlete_profiles(*), video_submissions(*), scorecard_categories(*), position_screenshots(*), assigned_drills(*, drills(*))')
      .eq('id', id)
      .single()

    if (!orderData) return

    setOrder(orderData as Order)
    setProfile(orderData.athlete_profiles as AthleteProfile)
    setVideos((orderData.video_submissions as VideoSubmission[]) ?? [])
    setScorecard((orderData.scorecard_categories as ScorecardCategory[]) ?? [])
    setPositions((orderData.position_screenshots as PositionScreenshot[]) ?? [])
    setAssigned((orderData.assigned_drills as AssignedDrill[]) ?? [])
    setNewStatus(orderData.status as OrderStatus)

    // Report fields
    const { data: report } = await supabase
      .from('analysis_reports')
      .select('*')
      .eq('order_id', id)
      .single()
    if (report) {
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
    await supabase.from('analysis_reports').upsert({
      order_id: id,
      overall_assessment: reportNotes,
      velocity_notes: velocityNotes,
      notess: overallNotes,
      follow_up_recommendation: followUp,
    }, { onConflict: 'order_id' })
    setSaving(false)
  }

  async function saveScorecardItem(category: string, score: number, note: string) {
    await supabase.from('scorecard_categories').upsert({
      order_id: id,
      category,
      score,
      notes: note,
    }, { onConflict: 'order_id,category' })
  }

  async function addDrill(drillId: string) {
    await supabase.from('assigned_drills').insert({ order_id: id, drill_id: drillId })
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
        <OrderStatusBadge status={order.status} />
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
          {/* Scorecard */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-6">Scorecard (1–5 each)</h2>
            <div className="space-y-4">
              {SCORECARD_CATEGORIES.map(({ key, label }) => {
                const existing = scorecard.find((s) => s.category === key)
                return (
                  <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    <label className="text-sm text-slate-300 pt-2">{label}</label>
                    <select
                      defaultValue={existing?.score ?? ''}
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
                      defaultValue={existing?.notes ?? ''}
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
                return (
                  <div key={pos} className="rounded-lg border border-surface-border bg-navy-800 p-3">
                    <p className="text-xs text-slate-400 mb-2">{label}</p>
                    {existing?.storage_path ? (
                      <div className="flex items-center gap-1 text-xs text-accent-green">
                        <CheckCircle className="h-3.5 w-3.5" /> Uploaded
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

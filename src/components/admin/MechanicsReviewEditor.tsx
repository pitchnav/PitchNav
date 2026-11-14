'use client'

import { ManualAngleEvidence } from './ManualAngleEvidence'
import { FootStrikeReviewEditor } from './FootStrikeReviewEditor'
import { emptyFootStrike, footStrikeFinding, checkFootStrike, missingLandingFinding } from '@/lib/foot-strike-review'
import { useState } from 'react'
import { mechanicsFlags, type MechanicsFlag } from '@/lib/mechanics-library'
import type { MechanicsFinding } from '@/lib/mechanics-findings'
import { verdictLabels, type EvidenceFrame } from '@/components/reports/MechanicsFindings'

const requirements = {
  side_view: 'Side view',
  target_line: 'Target-line view',
  several_pitches: 'Multiple pitches',
  validated_3d: 'Validated 3D measurement',
  physical_measurement: 'Physical measurement',
}

type Props = {
  analysisId: string
  orderId: string
  revision: string
  recap: string
  initialFindings: MechanicsFinding[]
  frames: EvidenceFrame[]
  drills?: { name: string; description: string }[]
  onSaved: () => Promise<void>
  onDirty: (dirty: boolean) => void
}

export function MechanicsReviewEditor({ analysisId, orderId, revision, recap, initialFindings, frames, drills = [], onSaved, onDirty }: Props) {
  const landing = frames.find(frame => frame.key === 'lead_foot_contact')
  const checkpoint = initialFindings.find(finding => finding.foot_strike)
  const [footStrike, setFootStrike] = useState({ ...emptyFootStrike, ...checkpoint?.foot_strike })
  const [strikeEvidence, setStrikeEvidence] = useState(checkpoint?.evidence ?? '')
  const [armCue, setArmCue] = useState(checkpoint?.coaching_action ?? '')
  const [findings, setFindings] = useState(initialFindings.filter(finding => !finding.foot_strike))
  const [summary, setSummary] = useState(recap)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const results = mechanicsFlags.filter(flag => (flag.id + ' ' + flag.category + ' ' + flag.label).toLowerCase().includes(query.trim().toLowerCase()))
  function add(flag?: MechanicsFlag) {
    setFindings([...findings, { flag_id: flag?.id ?? null, topic: flag?.label ?? '', verdict: flag && flag.requirement !== 'side_view' ? 'unable_to_assess' : 'observed', answer: '', evidence: '', evidence_keys: [], coaching_action: null }])
    setSelectedId('')
    onDirty(true)
  }
  function update(index: number, patch: Partial<MechanicsFinding>) {
    setFindings(findings.map((item, i) => i === index ? { ...item, ...patch } : item))
    onDirty(true)
  }
  async function save() {
    const rows = [...findings]
    if (landing) {
      if (!footStrike.arm_observation.trim() || !footStrike.torso_observation.trim() || !strikeEvidence.trim()) {
        setMessage('Enter the arm and torso answers and the frame evidence for foot strike.')
        return
      }
      try {
        checkFootStrike(footStrike, armCue.trim() || null, landing.sampleTimes ?? [])
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Check the landing panels.')
        return
      }
      rows.push(footStrikeFinding(footStrike, strikeEvidence.trim(), armCue.trim() || null))
    } else {
      rows.push(missingLandingFinding())
    }
    const incomplete = findings.findIndex(finding => !finding.topic.trim() || !finding.answer.trim() || !finding.evidence.trim() || !finding.evidence_keys.length)
    if (incomplete !== -1) {
      setMessage('Finding ' + (incomplete + 1) + ' needs a topic, answer, evidence, and at least one supporting image.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/mechanics-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, orderId, revision, summary, findings: rows }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not save review.')
      onDirty(false)
      await onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save review.')
    } finally { setSaving(false) }
  }
  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-bold text-white">Mechanics review</h2>
      <label className="block"><span className="label">Assessment for the athlete</span><textarea className="input" rows={3} value={summary} onChange={e => { setSummary(e.target.value); onDirty(true) }} /></label>
      {!landing && <div className="rounded-xl border border-surface-border p-4"><b>Hand-up L at foot strike · View limited</b><p>No landing image is available for this staff review.</p></div>}
      {landing && <FootStrikeReviewEditor frame={landing} review={footStrike} evidence={strikeEvidence} action={armCue} drills={drills}
        onChange={value => { setFootStrike(value); onDirty(true) }} onEvidence={value => { setStrikeEvidence(value); onDirty(true) }}
        onAction={value => { setArmCue(value); onDirty(true) }} />}
      {findings.map((finding, index) => <fieldset key={index} className="space-y-3 rounded-xl border border-surface-border p-4">
        <legend className="px-1 font-semibold text-white">{finding.flag_id ? 'Library flag ' + finding.flag_id : 'Custom observation'}</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Topic</span><input className="input" value={finding.topic} onChange={e => update(index,{topic:e.target.value})} /></label>
          <label><span className="label">Verdict</span><select className="input" value={finding.verdict} onChange={e => update(index,{verdict:e.target.value as MechanicsFinding['verdict'], coaching_action:null})}>
            {Object.entries(verdictLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        <label className="block"><span className="label">Answer</span><textarea className="input" value={finding.answer} onChange={e => update(index,{answer:e.target.value})} /></label>
        <label className="block"><span className="label">Evidence from this delivery</span><textarea className="input" value={finding.evidence} onChange={e => update(index,{evidence:e.target.value})} /></label>
        <fieldset><legend className="label">Supporting images</legend><div className="flex flex-wrap gap-3">
          {frames.map(frame => <label key={frame.key} className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={finding.evidence_keys.includes(frame.key)} onChange={e => update(index,{evidence_keys:e.target.checked ? [...finding.evidence_keys, frame.key] : finding.evidence_keys.filter(key=>key!==frame.key)})} />
            {frame.url ? <a className="text-electric-blue-light underline" href={frame.url} target="_blank" rel="noreferrer">{frame.label}</a> : frame.label}
            {typeof frame.time === 'number' && <span>{frame.time.toFixed(2)} s</span>}
          </label>)}
        </div></fieldset>
        <ManualAngleEvidence frames={frames} onAttach={(key, text) => update(index, {
          evidence: [finding.evidence, text].filter(Boolean).join('\n'),
          evidence_keys: Array.from(new Set([...finding.evidence_keys, key])),
        })} />
        {finding.verdict === 'observed' && <label className="block"><span className="label">Drill or practice task (optional)</span><input className="input" value={finding.coaching_action ?? ''} onChange={e => update(index,{coaching_action:e.target.value || null})} /></label>}
        <button className="text-sm text-red-300" type="button" onClick={() => { setFindings(findings.filter((_, i) => i !== index)); onDirty(true) }}>Remove finding</button>
      </fieldset>)}
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className="label">Search the mechanics library</span><input className="input" placeholder="Flag, category, or number" value={query} onChange={e=>{setQuery(e.target.value); setSelectedId('')}} /></label>
        <label><span className="label">Matching flags ({results.length})</span><select className="input" value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
          <option value="">Choose a flag</option>
          {results.map(flag=><option key={flag.id} value={flag.id} disabled={findings.some(finding=>finding.flag_id===flag.id)}>{flag.id}. {flag.label} · {requirements[flag.requirement]}</option>)}
        </select></label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" disabled={!selectedId} onClick={()=>add(mechanicsFlags.find(flag=>flag.id===Number(selectedId)))}>Add selected flag</button>
        <button type="button" className="btn-secondary" onClick={()=>add()}>Add custom observation</button>
        <button type="button" className="btn-primary" disabled={saving || !summary.trim()} onClick={save}>{saving ? 'Saving…' : 'Save review draft'}</button>
      </div>
      {message && <p role="alert" className="text-sm text-red-300">{message}</p>}
    </section>
  )
}

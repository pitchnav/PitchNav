import type { EvidenceFrame } from '@/components/reports/MechanicsFindings'
import { emptyFootStrike, footStrikeTitle, handBreakDrill, type FootStrikeReview } from '@/lib/foot-strike-review'
import { ManualAngleEvidence } from './ManualAngleEvidence'

type Props = {
  frame: EvidenceFrame
  review: FootStrikeReview
  evidence: string
  action: string
  onChange: (value: FootStrikeReview) => void
  onEvidence: (value: string) => void
  onAction: (value: string) => void
}

export function FootStrikeReviewEditor({ frame, review, evidence, action, onChange, onEvidence, onAction }: Props) {
  const times = frame.url ? frame.sampleTimes ?? [] : []
  const bracketed = review.contact_status === 'bracketed'
  function selectPanel(label: string, field: 'last_airborne_time' | 'first_planted_time') {
    return <label><span className="label">{label}</span>
      <select className="input" value={review[field] ?? ''} onChange={e => onChange({
        ...review, [field]: e.target.value === '' ? null : Number(e.target.value),
      })}>
        <option value="">Choose a panel</option>
        {times.map(time => <option key={time} value={time}>{time.toFixed(3)} s</option>)}
      </select>
    </label>
  }
  return <fieldset className="space-y-3 rounded-xl border border-surface-border p-4">
    <legend className="px-1 font-semibold text-white">{footStrikeTitle}</legend>
    {!frame.url && <p className="text-sm text-slate-400">The landing image is unavailable. Record the viewing limit below.</p>}
    {frame.url && <a className="text-sm text-electric-blue-light underline" href={frame.url} target="_blank" rel="noreferrer">Open the landing images</a>}
    <label className="block"><span className="label">Foot strike</span>
      <select className="input" value={review.contact_status} onChange={e => {
        if (e.target.value === 'bracketed') onChange({ ...review, contact_status: 'bracketed' })
        else {
          onChange({ ...emptyFootStrike, arm_observation: review.arm_observation, torso_observation: review.torso_observation })
          onAction('')
        }
      }}>
        <option value="unresolved">Contact unresolved</option>
        <option value="bracketed" disabled={times.length < 2}>Airborne and planted panels identified</option>
      </select>
    </label>
    {bracketed && <div className="grid gap-3 md:grid-cols-2">
      {selectPanel('Last airborne foot', 'last_airborne_time')}
      {selectPanel('First planted foot', 'first_planted_time')}
    </div>}
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="block"><span className="label">Hand-up L at landing</span>
          <select className="input" disabled={!bracketed} value={review.hand_up_l}
            onChange={e => onChange({ ...review, hand_up_l: e.target.value as FootStrikeReview['hand_up_l'] })}>
            <option value="unresolved">View limited</option>
            <option value="visible">Present at landing</option>
            <option value="absent">Absent at landing</option>
          </select>
        </label>
        <p className="text-sm text-slate-400">Look for the upper arm near shoulder height, elbow bent roughly 90°, and forearm pointing up with the ball or wrist above the elbow.</p>
        <label className="block"><span className="label">Arm timing</span>
          <select className="input" value={review.arm_timing} disabled={!bracketed} onChange={e => {
            const arm = e.target.value as FootStrikeReview['arm_timing']
            onChange({ ...review, arm_timing: arm })
            if (arm !== 'issue_visible') onAction('')
          }}>
            <option value="unresolved">Timing unresolved</option>
            <option value="no_clear_issue">No clear arm timing issue</option>
            <option value="issue_visible">Arm-path or timing issue visible across frames</option>
          </select>
        </label>
        <p className="text-sm text-slate-400">Check elbow bend and upper arm height against the shoulder line. Record whether the wrist is below, level with, or above the elbow, and when that changes. Use a near-90° inside elbow angle as a coaching reference. Judge timing from the arm and torso moving across frames.</p>
        <label className="block"><span className="label">Arm position and path</span>
          <textarea className="input" value={review.arm_observation} onChange={e => onChange({ ...review, arm_observation: e.target.value })} />
        </label>
      </div>
      <div className="space-y-2">
        <label className="block"><span className="label">Torso opening</span>
          <select className="input" value={review.torso_opening} disabled={!bracketed}
            onChange={e => onChange({ ...review, torso_opening: e.target.value as FootStrikeReview['torso_opening'] })}>
            <option value="unresolved">Chest rotation unresolved</option>
            <option value="no_clear_issue">No clear early opening</option>
            <option value="early_visible">Early opening visible across frames</option>
          </select>
        </label>
        <p className="text-sm text-slate-400">Compare shoulders to hips before and at landing. Describe forward lean separately from the chest turning toward the plate. Mark rotation unresolved if the camera hides the shoulder or hip line.</p>
        <label className="block"><span className="label">Torso position and rotation</span>
          <textarea className="input" value={review.torso_observation} onChange={e => onChange({ ...review, torso_observation: e.target.value })} />
        </label>
      </div>
    </div>
    <label className="block"><span className="label">Evidence across frames</span>
      <textarea className="input" value={evidence} onChange={e => onEvidence(e.target.value)} />
    </label>
    <ManualAngleEvidence frames={[frame]} initialJoint="Throwing elbow" onAttach={(_, text) => onEvidence([evidence, text].filter(Boolean).join('\n'))} />
    {bracketed && review.arm_timing === 'issue_visible' && <div className="space-y-2">
      <label className="block"><span className="label">Arm-path drill and cue</span>
        <textarea className="input" value={action} onChange={e => onAction(e.target.value)} />
      </label>
      <button type="button" className="btn-secondary text-sm" onClick={() => onAction(handBreakDrill)}>Use dry reps for a confirmed late hand break</button>
    </div>}
  </fieldset>
}

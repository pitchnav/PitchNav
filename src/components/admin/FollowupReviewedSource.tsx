import type { CoachingFollowupSource } from '@/lib/coaching-followup'

const verdictLabels = { observed: 'Observed', unsupported: 'No clear issue', unable_to_assess: 'Unresolved' }
const armLabels = { issue_visible: 'Timing issue visible', no_clear_issue: 'No clear timing issue', unresolved: 'Unresolved' }
const chestLabels = { early_visible: 'Early opening visible', no_clear_issue: 'No clear early opening', unresolved: 'Unresolved' }
const handLabels = { visible: 'Visible', absent: 'Absent', unresolved: 'Unresolved' }

export function FollowupReviewedSource({ source, revision }: { source: CoachingFollowupSource; revision: string }) {
  const findings = source.findings ?? []
  const contact = findings.find(finding => finding.foot_strike)?.foot_strike
  return <details className="rounded-lg border border-surface-border p-4">
    <summary className="cursor-pointer font-semibold text-white">Reviewed source for this draft</summary>
    <div className="mt-3 space-y-4 text-sm text-slate-300">
      <p className="text-slate-400">Approval recorded {new Date(revision).toLocaleString(undefined, { timeZone: 'UTC' })} UTC</p>
      {source.summary && <p className="whitespace-pre-wrap">{source.summary}</p>}
      {source.strengths?.length > 0 && <div><h3 className="font-semibold text-white">Strengths</h3>
        <ul className="list-disc pl-5">{source.strengths.map((strength, i) => <li key={i}>{strength}</li>)}</ul></div>}
      <div><h3 className="font-semibold text-white">At foot strike</h3>
        <p>Hand-up L · {handLabels[contact?.hand_up_l ?? 'unresolved']}</p>
        <p>Arm timing · {armLabels[contact?.arm_timing ?? 'unresolved']}</p>
        <p>Torso opening · {chestLabels[contact?.torso_opening ?? 'unresolved']}</p>
        {contact?.arm_observation && <p>{contact.arm_observation}</p>}
        {contact?.torso_observation && <p>{contact.torso_observation}</p>}
      </div>
      {findings.map((finding, i) => <div key={i}>
        <h3 className="font-semibold text-white">{finding.topic} · {verdictLabels[finding.verdict]}</h3>
        <p className="whitespace-pre-wrap">{finding.answer}</p>
        {finding.evidence && <p className="whitespace-pre-wrap">{finding.evidence}</p>}
        {finding.evidence_keys?.length > 0 && <p className="text-slate-400">Phase evidence · {finding.evidence_keys.map(key => key.replaceAll('_', ' ')).join(', ')}</p>}
        {finding.coaching_action && <p>{finding.coaching_action}</p>}
      </div>)}
      {source.approvedDrills?.length > 0 && <div><h3 className="font-semibold text-white">Assigned drills</h3>
        {source.approvedDrills.map((drill, i) => <p key={i}>{drill.name} · {drill.custom_note ||
          [drill.sets == null ? '' : drill.sets + ' sets', drill.reps].filter(Boolean).join(' × ') || 'No dose recorded'}</p>)}</div>}
      {source.session && <div><h3 className="font-semibold text-white">Assigned session</h3><p className="whitespace-pre-wrap">{source.session}</p></div>}
      {source.bullpenTransfer && <div><h3 className="font-semibold text-white">Bullpen transfer</h3><p className="whitespace-pre-wrap">{source.bullpenTransfer}</p></div>}
      {source.retest && <div><h3 className="font-semibold text-white">Retest</h3><p className="whitespace-pre-wrap">{source.retest}</p></div>}
    </div>
  </details>
}

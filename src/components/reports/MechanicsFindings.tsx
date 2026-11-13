import type { MechanicsFinding } from '@/lib/mechanics-findings'
import { handUpAnswers } from '@/lib/foot-strike-review'

export type EvidenceFrame = { key: string; label: string; url?: string | null; time?: number; sampleTimes?: number[]; columns?: number }

export const verdictLabels = {
  observed: 'Visible in this delivery',
  unsupported: 'Flag unsupported',
  unable_to_assess: 'View limited',
}

export function MechanicsFindings({ findings, frames }: { findings?: MechanicsFinding[] | null; frames: EvidenceFrame[] }) {
  if (!Array.isArray(findings) || !findings.length) return null
  return (
    <section className="card space-y-5">
      <h2 className="text-2xl font-bold text-white">Delivery findings</h2>
      {findings.map((finding, index) => (
        <article key={index} className="space-y-2 border-t border-surface-border pt-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className="text-lg font-bold text-white">{finding.topic}</h3>
            {!finding.foot_strike && <span className="text-xs text-slate-400">{verdictLabels[finding.verdict]}</span>}
          </div>
          {finding.foot_strike ? <div className="space-y-2">
            <p className="text-base text-white"><b>Throwing arm</b> · {handUpAnswers[finding.foot_strike.hand_up_l ?? 'unresolved']} {finding.foot_strike.arm_observation}</p>
            <p className="text-base text-white"><b>Torso</b> · {finding.foot_strike.torso_observation}</p>
            <p className="text-sm text-slate-400">{finding.foot_strike.contact_status === 'bracketed'
              ? `Last airborne foot at ${finding.foot_strike.last_airborne_time?.toFixed(3)} s. First planted foot at ${finding.foot_strike.first_planted_time?.toFixed(3)} s.`
              : finding.evidence_keys.length ? 'The landing images leave the moment of foot strike unresolved.' : 'Foot strike was not captured in the assessment images.'}</p>
          </div> : <p className="text-base text-white">{finding.answer}</p>}
          <p className="text-sm leading-6 text-slate-300">{finding.evidence}</p>
          <div className="flex flex-wrap gap-3">
            {finding.evidence_keys.map(key => {
              const frame = frames.find(item => item.key === key)
              if (!frame) return null
              const text = frame.label + (!finding.foot_strike && typeof frame.time === 'number' ? ' · ' + frame.time.toFixed(2) + ' s' : '')
              return frame.url ? <a key={key} className="text-sm text-electric-blue-light underline" href={frame.url} target="_blank" rel="noreferrer">{text}</a> : <span key={key} className="text-sm text-slate-400">{text}</span>
            })}
          </div>
          {finding.coaching_action && <p className="text-sm text-white"><b>Coaching cue</b> · {finding.coaching_action}</p>}
        </article>
      ))}
    </section>
  )
}

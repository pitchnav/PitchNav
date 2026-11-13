import { z } from 'zod'
import { mechanicsFlags } from './mechanics-library'
import { checkFootStrike, footStrikeFinding, footStrikeSchema } from './foot-strike-review'

const text = z.string().trim().min(1)
const finding = z.object({
  flag_id: z.number().int().nullable(),
  topic: text,
  verdict: z.enum(['observed', 'unsupported', 'unable_to_assess']),
  answer: text,
  evidence_keys: z.array(text),
  evidence: text,
  coaching_action: text.nullable(),
  foot_strike: footStrikeSchema.optional(),
}).strict()

export type MechanicsFinding = z.infer<typeof finding>

// Catalog questions that specifically judge the arm against landing or trunk timing.
const landingArmFlags = new Set([189, 203, 224, 226, 227])

// This endpoint evaluates one side-view delivery. Phase IDs are also the
// connection back to the actual stills the athlete can inspect after review.
export function validateMechanicsFindings(input: unknown, availableKeys: readonly string[], landingTimes?: readonly number[]): MechanicsFinding[] {
  const findings = z.array(finding).parse(input)
  const checkpoints = findings.filter(finding => finding.foot_strike)
  if (landingTimes !== undefined && checkpoints.length !== 1) {
    throw new Error('Complete the arm and torso check at foot strike.')
  }
  const usedIds = new Set<number>()
  for (const result of findings) {
    if ((!result.foot_strike && !result.evidence_keys.length) || result.evidence_keys.some(key => !availableKeys.includes(key))) {
      throw new Error('A finding references a phase without a supplied image.')
    }
    if (result.foot_strike) {
      const hasLanding = availableKeys.includes('lead_foot_contact')
      if ((hasLanding ? !result.evidence_keys.includes('lead_foot_contact') : result.evidence_keys.length !== 0) || result.flag_id !== null) {
        throw new Error('The paired foot-strike check must cite the landing images.')
      }
      checkFootStrike(result.foot_strike, result.coaching_action, landingTimes ?? [])
      Object.assign(result, footStrikeFinding(result.foot_strike, result.evidence, result.coaching_action, hasLanding ? ['lead_foot_contact'] : []))
    }
    if (result.flag_id !== null) {
      const flag = mechanicsFlags.find(candidate => candidate.id === result.flag_id)
      if (!flag) throw new Error('A finding references an unknown library flag.')
      if (landingTimes !== undefined && result.coaching_action && landingArmFlags.has(flag.id) &&
          checkpoints[0]?.foot_strike?.arm_timing !== 'issue_visible') {
        throw new Error('A corrective arm-path cue for landing needs a visible arm-path issue in the paired foot-strike check.')
      }
      if (usedIds.has(flag.id)) throw new Error('The same library flag has multiple verdicts.')
      usedIds.add(flag.id)
      if (flag.requirement !== 'side_view' && result.verdict !== 'unable_to_assess') {
        throw new Error(`Flag ${flag.id} requires ${flag.requirement.replaceAll('_', ' ')} evidence.`)
      }
    }
    if (result.verdict !== 'observed' && result.coaching_action !== null) {
      throw new Error('Only a visible finding can support a coaching action.')
    }
  }
  return findings
}

// Older single images can support a description and visibility limits. Only a
// timestamped sequence can establish a contact bracket.
export function landingSampleTimes(phases: readonly { key?: unknown; sample_times?: unknown }[]) {
  const landing = phases.find(phase => phase.key === 'lead_foot_contact')
  if (!landing) return []
  return Array.isArray(landing.sample_times)
    ? landing.sample_times.filter((time): time is number => typeof time === 'number' && Number.isFinite(time))
    : []
}

type StoredPhase = {
  key: string; storage_path: string; label?: string; time?: number; sample_times?: number[]; columns?: number
}

export function sourcePhaseImages(input: unknown, owner: string, analysisId: string): StoredPhase[] {
  if (!Array.isArray(input)) return []
  return input.filter((phase): phase is StoredPhase => phase && typeof phase.key === 'string' &&
    phase.storage_path === owner + '/motion-lab/' + analysisId + '/phases/' + phase.key + '.png')
}

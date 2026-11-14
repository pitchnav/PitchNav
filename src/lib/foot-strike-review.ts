import { z } from 'zod'
import type { MechanicsFinding } from './mechanics-findings'

const observation = z.string().trim().min(1)
const panelTime = z.number().finite().nonnegative().nullable()

export const footStrikeSchema = z.object({
  contact_status: z.enum(['bracketed', 'unresolved']),
  last_airborne_time: panelTime,
  first_planted_time: panelTime,
  hand_up_l: z.enum(['visible', 'absent', 'unresolved']),
  arm_timing: z.enum(['issue_visible', 'no_clear_issue', 'unresolved']),
  arm_observation: observation,
  torso_opening: z.enum(['early_visible', 'no_clear_issue', 'unresolved']),
  torso_observation: observation,
}).strict()

export type FootStrikeReview = z.infer<typeof footStrikeSchema>
export const footStrikeTitle = 'Arm and torso at foot strike'
export const emptyFootStrike: FootStrikeReview = {
  contact_status: 'unresolved', last_airborne_time: null, first_planted_time: null,
  hand_up_l: 'unresolved',
  arm_timing: 'unresolved', arm_observation: '', torso_opening: 'unresolved', torso_observation: '',
}

export function footStrikeFinding(review: FootStrikeReview, evidence: string, action: string | null, evidenceKeys: string[] = ['lead_foot_contact']): MechanicsFinding {
  const issue = review.arm_timing === 'issue_visible' || review.torso_opening === 'early_visible'
  const limited = review.arm_timing === 'unresolved' || review.torso_opening === 'unresolved'
  const verdict = issue ? 'observed' : limited ? 'unable_to_assess' : 'unsupported'
  return {
    foot_strike: review, flag_id: null, topic: footStrikeTitle, verdict,
    answer: [review.arm_observation, review.torso_observation].join(' '),
    evidence_keys: evidenceKeys, evidence, coaching_action: action,
  }
}

export function checkFootStrike(review: FootStrikeReview, action: string | null, sampleTimes: readonly number[]) {
  if (review.contact_status === 'bracketed') {
    const before = review.last_airborne_time, after = review.first_planted_time
    // A draft may quote the timestamp rounded to the three decimals printed on the image.
    const panelAt = (time: number) => sampleTimes.findIndex(sample => Math.abs(time - sample) <= 0.00051)
    if (before === null || after === null || after <= before || panelAt(before) < 0 || panelAt(after) <= panelAt(before)) {
      throw new Error('Choose distinct airborne and planted panels in time order from the landing images.')
    }
  } else if (review.last_airborne_time !== null || review.first_planted_time !== null ||
      review.arm_timing !== 'unresolved' || review.torso_opening !== 'unresolved' || review.hand_up_l !== 'unresolved') {
    throw new Error('Timing at foot strike requires a visible contact bracket. Describe the visible positions when contact is unresolved.')
  }
  if (action && review.arm_timing !== 'issue_visible') {
    throw new Error('An arm-path drill needs a visible arm-path or timing issue across the landing sequence.')
  }
}

export const handUpAnswers = {
  visible: 'The hand-up L is visible at landing.',
  absent: 'The arm has not reached the hand-up L at landing.',
  unresolved: 'The landing view leaves the hand-up L uncertain.',
}

export function missingLandingFinding() {
  return footStrikeFinding({
    ...emptyFootStrike,
    arm_observation: 'The assessment has no landing image showing the throwing arm at foot strike.',
    torso_observation: 'Chest position relative to the hips at foot strike is also unresolved.',
  }, 'No lead-foot contact image was available for review.', null, [])
}

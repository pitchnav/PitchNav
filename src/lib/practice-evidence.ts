import { z } from 'zod'
import { landingSampleTimes, validateMechanicsFindings } from './mechanics-findings'

export const practicePhases = [
  'peak_leg_lift', 'hand_separation', 'lead_foot_contact', 'maximum_external_rotation', 'ball_release', 'finish',
] as const
const phrase = z.string().trim().min(1)
const seconds = z.number().finite().nonnegative()
const phase = z.object({
  key: z.enum(practicePhases), time: seconds,
  sample_times: z.array(seconds).min(1).max(48),
  columns: z.number().int().positive().max(12), label: phrase.max(180), quality_note: phrase.max(1500).optional(),
}).strict()
const schema = z.object({
  title: phrase.max(160), summary: phrase.max(20000), strengths: z.array(phrase.max(2000)).max(30),
  phases: z.array(phase).length(practicePhases.length), findings: z.array(z.unknown()).min(1).max(400),
}).strict()

export function parsePracticeEvidence(value: unknown) {
  const parsed = schema.parse(value)
  if (new Set(parsed.phases.map(item => item.key)).size !== practicePhases.length) throw Error('Include each of the six phases once.')
  for (const row of parsed.phases) {
    if (row.columns > row.sample_times.length || row.sample_times.some((t, i, all) => i > 0 && t <= all[i-1])) {
      throw Error('Phase panels must be listed in time order with the actual number of columns.')
    }
  }
  const findings = validateMechanicsFindings(parsed.findings, practicePhases, landingSampleTimes(parsed.phases))
  return { ...parsed, findings }
}

export function evidenceFiles(owner: string, analysisId: string, extension: 'mov' | 'mp4') {
  const root = owner + '/motion-lab/' + analysisId
  return [
    { bucket:'pitch-videos', path:root + '/source.' + extension, name:'source' },
    ...practicePhases.map(key => ({bucket:'analysis-assets', path:root + '/phases/' + key + '.png', name:key})),
  ]
}

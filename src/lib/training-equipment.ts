import { seasonsSchema } from './season-calendar'
import { z } from 'zod'

export const gearLabels = {
  barbellRack: 'Barbell, plates and squat rack',
  trapBar: 'Trap bar and plates', dumbbells: 'Dumbbells', kettlebell: 'Kettlebell',
  bench: 'Bench or sturdy step', medicineBall: 'Medicine ball and a safe throwing area',
  cable: 'Cable station', landmine: 'Landmine and barbell',
} as const

export const equipmentSchema = z.object({
  playingSeasons: seasonsSchema.optional(),
  season: z.enum(['offseason','in-season']).optional(),
  offseasonStart: z.string().date().optional(),
  firstGame: z.string().date().optional(),
  tripod: z.literal(true), plyos: z.boolean(), bands: z.boolean(), gym: z.boolean(),
  gear: z.array(z.enum(['barbellRack', 'trapBar', 'dumbbells', 'kettlebell', 'bench', 'medicineBall', 'cable', 'landmine'])),
})
export type TrainingEquipment = z.infer<typeof equipmentSchema>
type Gear = keyof typeof gearLabels | 'bands'
type Choice = [string, ...Gear[]]

// Ordered by preference. The final two choices in each group need no equipment.
const hinge: Choice[] = [['Dumbbell Romanian deadlift','dumbbells'], ['Kettlebell deadlift','kettlebell'], ['Bodyweight kickstand hip hinge'], ['Glute bridge']]
const squat: Choice[] = [['Goblet squat','dumbbells'], ['Bodyweight split squat'], ['Tempo squat']]
const core: Choice[] = [['Suitcase march','dumbbells'], ['Dead bug'], ['Bird dog']]
const push: Choice[] = [['Single-arm dumbbell floor press','dumbbells'], ['Kneeling push-up'], ['Wall push-up']]
const pull: Choice[] = [['Standing band row','bands'], ['Prone W raise'], ['Reverse snow angel']]
const power: Choice[] = [['Lateral bound to stick'], ['Squat jump to stick']]
const mobility: Choice[] = [['Side-lying open book'], ['Quadruped thoracic rotation']]
const rules: [RegExp, Gear[], Choice[]][] = [
  [/barbell back squat/i,['barbellRack'],squat],
  [/barbell reverse lunge/i,['barbellRack'],[['Dumbbell reverse lunge','dumbbells'],['Bodyweight reverse lunge'],['Bodyweight split squat']]],
  [/dumbbell bench press/i,['bench','dumbbells'],push],
  [/dumbbell reverse lunge/i,['dumbbells'],[['Bodyweight reverse lunge'],['Bodyweight split squat']]],
  [/trap-bar/i,['trapBar'],hinge], [/nordic/i,[],hinge],
  [/rear-foot-elevated|low box/i,['bench'],squat], [/goblet/i,['dumbbells'],squat],
  [/pallof/i,['bands'],core], [/suitcase/i,['dumbbells'],core], [/bottoms-up/i,['kettlebell'],core],
  [/landmine/i,['landmine'],push], [/chest-supported/i,['bench','dumbbells'],pull],
  [/cable row/i,['cable'],pull], [/medicine-ball/i,['medicineBall'],power],
  [/bench thoracic/i,['bench'],mobility], [/loaded open-book/i,['dumbbells'],mobility],
]

export function adaptExercise(name: string, equipment: TrainingEquipment) {
  const available = (key: Gear) => key === 'bands' ? equipment.bands : equipment.gear.includes(key)
  const rule = rules.find(([pattern]) => pattern.test(name))
  if (!rule) {
    const fallback = /jump|bound/i.test(name) ? 'Step and stick the landing'
      : /rotation|mobility|rock|floss|wall.slide/i.test(name) ? 'Quadruped rock-back'
      : /hip.flexor/i.test(name) ? 'Standing march hold'
      : /dead bug/i.test(name) ? 'Bird dog'
      : /calf raise/i.test(name) ? 'Two-leg calf raise'
      : /deadlift/i.test(name) ? 'Glute bridge' : 'Bodyweight split squat'
    return 'Choose one (' + name + ' or ' + fallback + ')'
  }
  const [, needs, choices] = rule
  const options = choices.filter(([, ...requires]) => requires.every(available)).map(([label]) => label)
  if (needs.length && needs.every(available)) options.unshift(name)
  return 'Choose one (' + Array.from(new Set(options)).slice(0, 2).join(' or ') + ')'
}

export function drillFitsEquipment(text: string, equipment: TrainingEquipment) {
  const requirements: [RegExp, boolean][] = [
    [/plyo ball|plyoball|weighted (base)?ball/i, equipment.plyos],
    [/\bband(s|ed)?\b/i, equipment.bands],
    [/med(?:icine)?[- ]ball/i, equipment.gear.includes('medicineBall')],
    [/cable/i, equipment.gear.includes('cable')],
  ]
  return requirements.every(([pattern, has]) => has || !pattern.test(text))
}

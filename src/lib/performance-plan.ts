import { liftingCalendar } from './season-calendar'
import { adaptExercise, type TrainingEquipment } from './training-equipment'

export type LikelyCause =
  | 'hamstring_tightness_or_weakness'
  | 'hip_mobility_limitation'
  | 'ankle_stability_limitation'
  | 'core_pelvis_control'
  | 'thoracic_mobility_limitation'
  | 'scapular_control_limitation'
  | 'general_repeatability'

export const CAUSE_LABELS: Record<LikelyCause, string> = {
  hamstring_tightness_or_weakness: 'hamstring tightness or strength',
  hip_mobility_limitation: 'hip mobility',
  ankle_stability_limitation: 'ankle stability',
  core_pelvis_control: 'core and pelvis control',
  thoracic_mobility_limitation: 'upper-back (thoracic) mobility',
  scapular_control_limitation: 'shoulder-blade control',
  general_repeatability: 'general movement repeatability',
}

export type CategoryAssessment = {
  category: string
  score: number
  confidence?: string
  development?: string
  evidence?: string
  likely_cause?: LikelyCause | string
}

export type PerformanceCorrelation = {
  assessment_category: string
  score: number
  observed_deficiency: string
  lift_emphasis: string
  mobility_emphasis: string
  rationale: string
}

export type PerformanceDay = {
  day: string
  focus: string
  work: string
  cues: string[]
  common_mistake: string
  correlation?: string
}

export type PerformanceWeek = {
  week: number
  phase: string
  tailored_focus: string
  correlations: PerformanceCorrelation[]
  days: PerformanceDay[]
}

type TrainingMatch = {
  category: string
  primaryLift: string
  secondaryLift: string
  power: string
  mobility: string
  rationale: string
}

const TRAINING_MATCHES: Record<string, TrainingMatch> = {
  Direction: {
    category: 'Direction',
    primaryLift: 'Lateral lunge',
    secondaryLift: 'Split-stance Pallof press',
    power: 'Lateral bound to stick',
    mobility: 'Adductor rock-back and 90/90 hip switches',
    rationale: 'Frontal-plane leg strength, hip control, and anti-rotation capacity support a repeatable move toward the target without prescribing a forced stride path.',
  },
  'Lower-Half Sequencing': {
    category: 'Lower-Half Sequencing',
    primaryLift: 'Trap-bar deadlift',
    secondaryLift: 'Rear-foot-elevated split squat',
    power: 'Step-behind medicine-ball scoop toss',
    mobility: '90/90 hip rotation and ankle rocker mobility',
    rationale: 'Lower-body force production, unilateral control, and rotational power provide physical capacity for the lower half to initiate and transfer energy before the upper body accelerates.',
  },
  'Upper-Half Timing': {
    category: 'Upper-Half Timing',
    primaryLift: 'Half-kneeling landmine press',
    secondaryLift: 'Chest-supported one-arm row',
    power: 'Shot-put medicine-ball throw',
    mobility: 'Open-book thoracic rotation and shoulder controlled-articular rotations',
    rationale: 'Split-position pressing, rowing, and thoracic motion support trunk-to-arm coordination without trying to manufacture an arm slot or internal joint position.',
  },
  'Front-Side Stability': {
    category: 'Front-Side Stability',
    primaryLift: 'Rear-foot-elevated split-squat isometric',
    secondaryLift: 'Single-leg Romanian deadlift',
    power: 'Low box step-down to stick',
    mobility: 'Knee-to-wall ankle mobility and half-kneeling hip-flexor mobility',
    rationale: 'Single-leg strength, deceleration control, and ankle mobility support accepting force over the lead leg while preserving a natural, pain-free finish.',
  },
  Posture: {
    category: 'Posture',
    primaryLift: 'Front-loaded goblet squat',
    secondaryLift: 'Suitcase carry',
    power: 'Tall-kneeling medicine-ball slam',
    mobility: 'Bench thoracic extension and half-kneeling hip-flexor mobility',
    rationale: 'Anterior loading, unilateral carries, and trunk control build the capacity to organize the rib cage and pelvis without coaching the athlete into a rigid posture.',
  },
  'Release Consistency': {
    category: 'Release Consistency',
    primaryLift: 'One-arm cable row',
    secondaryLift: 'Bottoms-up kettlebell carry',
    power: 'Step-behind medicine-ball shot put',
    mobility: 'Wall-slide with lift-off and open-book thoracic rotation',
    rationale: 'Scapular control, trunk rotation, and repeatable full-body positioning support a consistent release window; they do not claim to directly change ball velocity or diagnose arm health.',
  },
}

// Physical root-cause hypotheses, independent of which of the six mechanics
// categories they show up in. When the AI draft names one of these for a
// weak category (e.g. a loose lead-leg block traced to hamstring tightness
// or weakness), it overrides that category's generic lift/mobility default
// with the more specific intervention below — this is what lets two
// athletes with the same weak category end up with different plans.
const CAUSE_INTERVENTIONS: Partial<Record<LikelyCause, TrainingMatch>> = {
  hamstring_tightness_or_weakness: {
    category: 'Hamstring tightness or weakness',
    primaryLift: 'Single-leg Romanian deadlift',
    secondaryLift: 'Nordic curl (or slider/towel hamstring curl regression)',
    power: 'Broad jump to stick',
    mobility: 'Standing active hamstring floss and 90/90 hip switches',
    rationale: 'Eccentric hamstring strength and hip-hinge control help the lead leg block and absorb force at foot strike instead of the knee sliding or the front side collapsing.',
  },
  hip_mobility_limitation: {
    category: 'Hip mobility limitation',
    primaryLift: 'Rear-foot-elevated split squat',
    secondaryLift: 'Half-kneeling hip-flexor isometric hold',
    power: 'Lateral bound to stick',
    mobility: '90/90 hip rotation and half-kneeling hip-flexor mobility',
    rationale: 'Hip rotational range and hip-flexor length support getting into and out of loaded positions without compensating at the low back or trail leg.',
  },
  ankle_stability_limitation: {
    category: 'Ankle stability limitation',
    primaryLift: 'Single-leg calf raise',
    secondaryLift: 'Rear-foot-elevated split-squat isometric',
    power: 'Low box step-down to stick',
    mobility: 'Knee-to-wall ankle rocker mobility',
    rationale: 'Ankle range and single-leg landing stability support absorbing force through the foot and shin instead of losing the position on contact.',
  },
  core_pelvis_control: {
    category: 'Core and pelvis control',
    primaryLift: 'Dead bug with full exhale',
    secondaryLift: 'Suitcase carry',
    power: 'Tall-kneeling medicine-ball slam',
    mobility: 'Bench thoracic extension and 90/90 hip switches',
    rationale: 'Trunk and pelvis control let the lower half and upper half work in the right order instead of the trunk compensating for a late or early hip.',
  },
  thoracic_mobility_limitation: {
    category: 'Thoracic mobility limitation',
    primaryLift: 'Half-kneeling landmine press',
    secondaryLift: 'Loaded open-book thoracic rotation',
    power: 'Shot-put medicine-ball throw',
    mobility: 'Open-book thoracic rotation and wall slide with lift-off',
    rationale: 'Upper-back rotation and overhead positioning support trunk-to-arm timing without extra compensation at the shoulder.',
  },
  scapular_control_limitation: {
    category: 'Scapular control limitation',
    primaryLift: 'Chest-supported one-arm row',
    secondaryLift: 'Bottoms-up kettlebell carry',
    power: 'Step-behind medicine-ball scoop toss',
    mobility: 'Wall slide with lift-off and shoulder controlled-articular rotations',
    rationale: 'Shoulder-blade control and scapular strength support a repeatable arm path and release window.',
  },
}

function normalizedConfidence(confidence?: string) {
  const value = (confidence ?? '').toLowerCase()
  if (value === 'high') return 0
  if (value === 'moderate') return 0.2
  return 0.65
}

function resolveMatch(category: string, cause?: string, equipment?: TrainingEquipment) {
  const causeMatch = cause ? CAUSE_INTERVENTIONS[cause as LikelyCause] : undefined
  const match = causeMatch ?? TRAINING_MATCHES[category] ?? TRAINING_MATCHES.Posture
  if (!equipment) return match
  return {...match, primaryLift: adaptExercise(match.primaryLift, equipment),
    secondaryLift: adaptExercise(match.secondaryLift, equipment), power: adaptExercise(match.power, equipment),
    mobility: adaptExercise(match.mobility, equipment)}
}

/**
 * Converts the two clearest, lowest-scoring mechanics categories into a
 * conservative baseball strength and mobility plan. The mapping is explicit
 * so staff can see why every exercise was selected and can replace it before
 * publishing when athlete history, equipment, or throwing workload requires.
 */
export function buildBaseballPerformancePlan(
  categories: CategoryAssessment[],
  priorities: string[] = [],
  equipment?: TrainingEquipment,
  startsOn = new Date().toISOString().slice(0, 10)
): PerformanceWeek[] {
  const ranked = [...categories]
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => (a.score + normalizedConfidence(a.confidence)) - (b.score + normalizedConfidence(b.confidence)))

  const primaryCategory = ranked[0] ?? { category: 'Posture', score: 3, development: priorities[0] }
  const secondaryCategory = ranked.find((item) => item.category !== primaryCategory.category)
    ?? { category: 'Lower-Half Sequencing', score: 3, development: priorities[1] }
  const primaryCause = primaryCategory.likely_cause as LikelyCause | undefined
  const secondaryCause = secondaryCategory.likely_cause as LikelyCause | undefined
  const primary = resolveMatch(primaryCategory.category, primaryCause, equipment)
  const secondary = resolveMatch(secondaryCategory.category, secondaryCause, equipment)
  const primaryCauseLabel = primaryCause ? CAUSE_LABELS[primaryCause] : undefined
  const secondaryCauseLabel = secondaryCause ? CAUSE_LABELS[secondaryCause] : undefined

  const correlations: PerformanceCorrelation[] = [
    {
      assessment_category: primaryCategory.category,
      score: primaryCategory.score,
      observed_deficiency: primaryCategory.development || priorities[0] || 'The first video does not show this movement clearly enough yet. Use the next same-angle video to identify the exact position that needs work.',
      lift_emphasis: `${primary.primaryLift}; ${primary.secondaryLift}; ${primary.power}`,
      mobility_emphasis: primary.mobility,
      rationale: primaryCauseLabel ? `Likely driven by ${primaryCauseLabel}. ${primary.rationale}` : primary.rationale,
    },
    {
      assessment_category: secondaryCategory.category,
      score: secondaryCategory.score,
      observed_deficiency: secondaryCategory.development || priorities[1] || 'The supporting movement needs a clearer same-angle comparison. The next video check should show whether it stays steady when throwing effort increases.',
      lift_emphasis: `${secondary.primaryLift}; ${secondary.secondaryLift}; ${secondary.power}`,
      mobility_emphasis: secondary.mobility,
      rationale: secondaryCauseLabel ? `Likely driven by ${secondaryCauseLabel}. ${secondary.rationale}` : secondary.rationale,
    },
  ]

  const weekMs = 7 * 86400000
  const planStart = Date.parse(startsOn.slice(0, 10))
  const liftingStart = equipment?.offseasonStart ? Date.parse(equipment.offseasonStart) : planStart
  const opener = equipment?.firstGame ? Date.parse(equipment.firstGame) : undefined

  // Baseball plyometric programs improved long jump and side-step performance
  // (PMID 35510439). A pitcher trial also measured ball speed (PMID 42907284).
  // These findings concern whole programs. The pairings and doses here are coaching choices.
  const linearPower = {
    goal: 'Lower-body power', first: 'Broad jump or squat jump', second: 'Two-foot ankle hops',
    cue: 'Jump hard, stick the landing and reset. Compare standing broad-jump distance across the block.',
  }
  const lateralPower = {
    goal: 'Lateral power', first: 'Lateral bound or lateral hop over a line', second: 'Two-foot zigzag hops',
    cue: 'Push sideways and land quietly. Use the same line and spacing when comparing reps.',
  }
  // Rotational medicine-ball work improved rotational strength and throw-test
  // performance in baseball players (PMID 17685676). It requires a safe throwing space.
  const rotationPower = {
    goal: 'Rotational power', first: 'Rotational medicine-ball scoop toss or rotational shot put',
    second: 'Split-stance rotational medicine-ball throw',
    cue: 'Turn from the hips and throw through the target. Compare throws using the same ball, stance and distance.',
  }
  return Array.from({ length: 8 }, (_, index) => {
    const week = index + 1
    const date = planStart + index * weekMs
    const beforeStart = equipment?.season === 'offseason' && date + weekMs <= liftingStart
    const trainingWeek = Math.max(0, Math.floor((date - liftingStart) / weekMs))
    const remaining = opener === undefined ? Infinity : Math.ceil((opener - date) / weekMs)
    const maintenance = equipment?.season !== 'offseason' || remaining <= 0
    const taper = !maintenance && remaining <= 2
    // Longer offseasons repeat six loading weeks and a recovery week between peaks.
    const cycle = trainingWeek % 7
    const deload = cycle === 6 || taper
    const rpe = maintenance ? 6 : taper ? (remaining === 1 ? 5 : 6) : [6, 7, 8, 9, 9, 9, 6][cycle]
    const sets = maintenance || deload ? 2 : 3
    const fallbackPhase = beforeStart ? 'Before lifting starts' : maintenance ? 'Strength maintenance' : taper ? 'Preseason taper' : cycle === 6 ? 'Offseason deload' : rpe === 9 ? 'Offseason peak' : 'Offseason on-ramp'
    const seasonAt = (time:number) => equipment?.playingSeasons?.length
      ? liftingCalendar(equipment.playingSeasons,time,equipment.offseasonStart)
      : {phase:fallbackPhase,rpe,sets,maintenance}
    const phase = seasonAt(date).phase
    const choice = (name: string) => equipment ? adaptExercise(name, equipment) : name
    const liftDay = (day: string, title: string, power: typeof linearPower, strength: string, pairedLift: string): PerformanceDay => {
      const weekday = day === 'Monday' ? 1 : day === 'Wednesday' ? 3 : 5
      const offset = (weekday - new Date(date).getUTCDay() + 7) % 7
      const {phase:sessionPhase,rpe,sets,maintenance} = seasonAt(date + offset*86400000)
      if (maintenance && day === 'Friday' && sets) return {
        day, focus:'Throwing readiness',work:'Follow your game or bullpen plan.',cues:['Place lifts around your throwing schedule.'],common_mistake:'Making up a lift before a start.',
      }
      if (!sets || (!equipment?.playingSeasons && !maintenance && date + offset * 86400000 < liftingStart)) return {
        day, focus: 'Before lifting starts', work: 'Follow your current schedule until the lifting start date.',
        cues: [], common_mistake: 'Making up sessions from before your start date.',
      }
      const mainLift = choice(strength)
      const individualLift = mainLift === primary.primaryLift ? primary.secondaryLift : primary.primaryLift
      const mobility = resolveMatch(primaryCategory.category, primaryCause).mobility.split(' and ')[0]
      return {
        day, focus: title,
        work: [
          sessionPhase + ' · Do exercise 1, then exercise 2. Rest after the pair and finish all rounds before starting the next block.',
          `A · ${power.goal} · ${sets} rounds
A1 · ${power.first} · 3 reps
A2 · ${power.second} · 3 reps. Rest between rounds. ${power.cue}`,
          `B · Strength · ${sets} rounds
B1 · ${mainLift} · ${sets} × ${rpe === 9 ? 3 : 5} at RPE ${rpe}/10, one set per round${strength.includes('lunge') ? ' per side' : ''}
B2 · ${choice(pairedLift)} · 6 reps at RPE ${Math.min(rpe, 7)}/10 (each side for single-arm work). Rest until ready for the next main set.`,
          `C · ${primaryCategory.category} · 2 rounds
C1 · ${individualLift} · 6 controlled reps or a 15-second hold for an isometric
C2 · ${choice(mobility)} · 5 slow reps per side.`,
        ].join('\n\n'),
        cues: ['Where two options are listed, pick one for that slot and keep it across the block.', 'B1 follows the weekly strength target. Keep B2 at the listed effort so both lifts stay clean.'],
        common_mistake: 'Rushing the next set before your jumps or lifts feel sharp again.',
        correlation: primary.rationale,
      }
    }

    if (!equipment?.playingSeasons && beforeStart) return {week, phase, tailored_focus: 'Your lifting block starts on ' + equipment?.offseasonStart + '.', correlations: [], days: []}
    return {
      week,
      phase,
      tailored_focus: `Primary: ${primaryCategory.category} (${primaryCategory.score}/5). Supporting: ${secondaryCategory.category} (${secondaryCategory.score}/5). ${week % 2 === 0 ? `Use the week-${week} video and workload check to adjust the next two weeks.` : 'Build the physical capacity that supports the current video priorities.'} ${week === 8 ? 'After this review, replace the program with in-season, preseason, or offseason work instead of repeating week 1.' : ''}`,
      correlations,
      days: [
        liftDay('Monday', 'Lift 1 · Hinge and press', linearPower, 'Trap-bar deadlift', 'Dumbbell bench press'),
        {
          day: 'Tuesday',
          focus: 'Primary mobility + recovery',
          work: `${primary.mobility}: 2–3 controlled rounds; easy aerobic recovery 15–20 minutes.`,
          cues: ['Use slow breathing', 'Stay in a pain-free range'],
          common_mistake: 'Forcing range or using mobility to work through pain.',
          correlation: `Mobility emphasis selected from the ${primaryCategory.category.toLowerCase()} assessment.`
        },
        liftDay('Wednesday', 'Lift 2 · Squat and pull', lateralPower, 'Barbell back squat', 'Chest-supported one-arm row'),
        {
          day: 'Thursday',
          focus: 'Supporting mobility',
          work: `${secondary.mobility}: 2–3 controlled rounds; optional easy walk or bike.`,
          cues: ['Leave the session feeling better', 'Do not force the throwing shoulder'],
          common_mistake: 'Adding aggressive stretching before high-intent throwing.',
          correlation: `Mobility emphasis selected from the ${secondaryCategory.category.toLowerCase()} assessment.`
        },
        liftDay('Friday', 'Lift 3 · Lunge and angled press', equipment?.gear.includes('medicineBall') ? rotationPower : linearPower, 'Barbell reverse lunge', 'Half-kneeling landmine press'),
        {
          day: 'Saturday',
          focus: 'Throwing-day preparation',
          work: 'Dynamic warm-up and pain-free mobility. Coordinate this work around the athlete’s bullpen and game schedule.',
          cues: ['Keep volume low', 'Prioritize readiness for throwing'],
          common_mistake: 'Heavy lower-body loading immediately before high-intent throwing.',
          correlation: 'Preserves the weekly baseball workload instead of treating lifting as a separate, competing program.'
        },
        {
          day: 'Sunday',
          focus: week === 8 ? 'Final review + season reprogramming' : week % 2 === 0 ? `${week}-week video and workload reassessment` : 'Rest + workload check-in',
          work: week === 8
            ? 'No required lifting. Compare the first and final same-angle videos, review throwing volume and recovery, then replace this program with work that matches the current in-season, preseason, or offseason schedule.'
            : week % 2 === 0
              ? 'No required lifting. Compare the new same-angle pitching video with the last check, review throwing volume, soreness, sleep, and completed exercises, then adjust the next two weeks.'
              : 'No required lifting. Record throwing volume, session RPE, soreness, sleep, and completed exercises.',
          cues: ['Report pain instead of training through it', 'Use the log to adjust the next week'],
          common_mistake: 'Ignoring unusual fatigue or trying to make up missed volume.',
          correlation: 'Recovery and workload monitoring support safer coordination of throwing, lifting, and mobility.'
        },
      ],
    }
  })
}

export type CategoryAssessment = {
  category: string
  score: number
  confidence?: string
  development?: string
  evidence?: string
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

function normalizedConfidence(confidence?: string) {
  const value = (confidence ?? '').toLowerCase()
  if (value === 'high') return 0
  if (value === 'moderate') return 0.2
  return 0.65
}

function resolveMatch(category: string) {
  return TRAINING_MATCHES[category] ?? TRAINING_MATCHES.Posture
}

/**
 * Converts the two clearest, lowest-scoring mechanics categories into a
 * conservative baseball strength and mobility plan. The mapping is explicit
 * so staff can see why every exercise was selected and can replace it before
 * publishing when athlete history, equipment, or throwing workload requires.
 */
export function buildBaseballPerformancePlan(
  categories: CategoryAssessment[],
  priorities: string[] = []
): PerformanceWeek[] {
  const ranked = [...categories]
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => (a.score + normalizedConfidence(a.confidence)) - (b.score + normalizedConfidence(b.confidence)))

  const primaryCategory = ranked[0] ?? { category: 'Posture', score: 3, development: priorities[0] }
  const secondaryCategory = ranked.find((item) => item.category !== primaryCategory.category)
    ?? { category: 'Lower-Half Sequencing', score: 3, development: priorities[1] }
  const primary = resolveMatch(primaryCategory.category)
  const secondary = resolveMatch(secondaryCategory.category)

  const correlations: PerformanceCorrelation[] = [
    {
      assessment_category: primaryCategory.category,
      score: primaryCategory.score,
      observed_deficiency: primaryCategory.development || priorities[0] || 'The first video does not show this movement clearly enough yet. Use the next same-angle video to identify the exact position that needs work.',
      lift_emphasis: `${primary.primaryLift}; ${primary.secondaryLift}; ${primary.power}`,
      mobility_emphasis: primary.mobility,
      rationale: primary.rationale,
    },
    {
      assessment_category: secondaryCategory.category,
      score: secondaryCategory.score,
      observed_deficiency: secondaryCategory.development || priorities[1] || 'The supporting movement needs a clearer same-angle comparison. The next video check should show whether it stays steady when throwing effort increases.',
      lift_emphasis: `${secondary.primaryLift}; ${secondary.secondaryLift}; ${secondary.power}`,
      mobility_emphasis: secondary.mobility,
      rationale: secondary.rationale,
    },
  ]

  return Array.from({ length: 8 }, (_, index) => {
    const week = index + 1
    const phase = week === 8 ? 'Final reassessment + season reprogramming' : week % 2 === 0 ? 'Two-week reassessment' : week <= 2 ? 'Movement foundation' : week <= 4 ? 'Baseball strength' : week <= 6 ? 'Strength-to-power transfer' : 'Deload'
    const strengthPrescription = week === 7 ? '2 × 6 at RPE 4–5' : week <= 2 ? '3 × 8 at RPE 5–6' : week <= 4 ? '3 × 6 at RPE 6–7' : '4 × 4 at RPE 6–7'
    const accessoryPrescription = week === 7 ? '2 × 8 each side' : '3 × 6–8 each side'
    const powerPrescription = week <= 2 ? '3 × 3 at low-to-moderate intent' : week === 7 ? '2 × 3, crisp and easy' : '4 × 3 with full rest'

    return {
      week,
      phase,
      tailored_focus: `Primary: ${primaryCategory.category} (${primaryCategory.score}/5). Supporting: ${secondaryCategory.category} (${secondaryCategory.score}/5). ${week % 2 === 0 ? `Use the week-${week} video and workload check to adjust the next two weeks.` : 'Build the physical capacity that supports the current video priorities.'} ${week === 8 ? 'After this review, replace the program with in-season, preseason, or offseason work instead of repeating week 1.' : ''}`,
      correlations,
      days: [
        {
          day: 'Monday',
          focus: `${primaryCategory.category} strength`,
          work: `${primary.primaryLift}: ${strengthPrescription}; ${primary.secondaryLift}: ${accessoryPrescription}; calf/soleus raise: 3 × 10.`,
          cues: ['Leave 3–4 quality repetitions in reserve', 'Stop the set if position or tempo changes'],
          common_mistake: 'Adding load to chase fatigue instead of clean movement.',
          correlation: primary.rationale,
        },
        {
          day: 'Tuesday',
          focus: 'Primary mobility + recovery',
          work: `${primary.mobility}: 2–3 controlled rounds; easy aerobic recovery 15–20 minutes.`,
          cues: ['Use slow breathing', 'Stay in a pain-free range'],
          common_mistake: 'Forcing range or using mobility to work through pain.',
          correlation: `Mobility emphasis selected from the ${primaryCategory.category.toLowerCase()} assessment.`
        },
        {
          day: 'Wednesday',
          focus: `${secondaryCategory.category} strength`,
          work: `${secondary.primaryLift}: ${strengthPrescription}; ${secondary.secondaryLift}: ${accessoryPrescription}; dead bug with full exhale: 3 × 6/side.`,
          cues: ['Keep ribs and pelvis organized', 'Control the return on every repetition'],
          common_mistake: 'Turning accessory work into a maximal-effort session.',
          correlation: secondary.rationale,
        },
        {
          day: 'Thursday',
          focus: 'Supporting mobility',
          work: `${secondary.mobility}: 2–3 controlled rounds; optional easy walk or bike.`,
          cues: ['Leave the session feeling better', 'Do not force the throwing shoulder'],
          common_mistake: 'Adding aggressive stretching before high-intent throwing.',
          correlation: `Mobility emphasis selected from the ${secondaryCategory.category.toLowerCase()} assessment.`
        },
        {
          day: 'Friday',
          focus: 'Baseball power transfer',
          work: `${primary.power}: ${powerPrescription}; ${secondary.power}: ${powerPrescription}; full recovery between sets.`,
          cues: ['Fast intent with low fatigue', 'Finish balanced and reset between repetitions'],
          common_mistake: 'Using high-volume medicine-ball work as conditioning.',
          correlation: `Power exercises connect the ${primaryCategory.category.toLowerCase()} and ${secondaryCategory.category.toLowerCase()} priorities to explosive, baseball-relevant movement.`
        },
        {
          day: 'Saturday',
          focus: 'Throwing-day preparation',
          work: 'Dynamic warm-up, light carries, and only pain-free mobility. Coordinate this work around the athlete’s bullpen and game schedule.',
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

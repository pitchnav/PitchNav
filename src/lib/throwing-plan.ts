export type ThrowingAssessment = {
  category: string
  score: number
  confidence?: string
  development?: string
  evidence?: string
}

export type ThrowingPlanDay = {
  day: string
  focus: string
  work: string
}

export type ThrowingPlanWeek = {
  week: number
  priority: string
  coaching_cue: string
  prescription: string
  reassessment: boolean
  days: ThrowingPlanDay[]
  completed: boolean
}

const WEEK_BLOCKS = [
  {
    priority: 'Learn the main movement change',
    cue: 'Move at a controlled speed and make the same good rep three times in a row.',
    prescription: '2 drill sessions; 3 sets of 5 controlled reps. Keep normal throwing volume unless your coach changes it.',
  },
  {
    priority: 'Repeat the change, then complete your 2-week video check',
    cue: 'Use one short cue. Do not try to fix several body parts during the same throw.',
    prescription: '2 drill sessions; 3 sets of 5 reps, plus one same-angle video check at normal intent.',
  },
  {
    priority: 'Use the first check-in to sharpen the plan',
    cue: 'Keep the part that improved and give most of your attention to the part that still breaks down.',
    prescription: '2 throwing sessions with 6–10 focused pitches after the normal warm-up.',
  },
  {
    priority: 'Hold the change at higher intent, then complete your 4-week video check',
    cue: 'Only add speed when the movement still looks the same and you feel in control.',
    prescription: '2 throwing sessions with a gradual intent build, plus one same-angle video check.',
  },
  {
    priority: 'Carry the change into bullpen work',
    cue: 'Think about the target during the pitch and check the movement on video after the set.',
    prescription: '1 drill session and 1–2 bullpen sessions with short video checkpoints between sets.',
  },
  {
    priority: 'Test the change in game-like work, then complete your 6-week video check',
    cue: 'Keep the cue simple when a hitter, count, or pitch target is added.',
    prescription: '1 drill session, 1 game-like bullpen, and one same-angle video check.',
  },
  {
    priority: 'Keep the change while reducing drill volume',
    cue: 'Use fewer drill reps, but make every rep focused and repeatable.',
    prescription: '1 short drill session and normal baseball throwing planned with your coach.',
  },
  {
    priority: 'Complete the 8-week test and build the next season-based program',
    cue: 'Show the same camera angle and effort so your first and final videos are easy to compare.',
    prescription: '1 light drill session and one final same-angle video check. This program ends after the review.',
  },
] as const

function confidencePenalty(confidence?: string) {
  const value = (confidence ?? '').toLowerCase()
  if (value === 'high') return 0
  if (value === 'moderate') return 0.25
  return 0.75
}

export function buildEightWeekThrowingPlan(
  categories: ThrowingAssessment[],
  priorities: string[] = []
): ThrowingPlanWeek[] {
  const ranked = [...categories]
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => (a.score + confidencePenalty(a.confidence)) - (b.score + confidencePenalty(b.confidence)))

  const primary = ranked[0]
  const primaryCategory = primary?.category || 'delivery repeatability'
  const primaryFix = primary?.development || priorities[0] || 'Repeat the same delivery from leg lift through finish.'

  return WEEK_BLOCKS.map((block, index) => {
    const week = index + 1
    const reassessment = week % 2 === 0
    const reassessmentWork = week === 8
      ? `Record the final follow-up from the same angle and at the same effort as week 1. Compare ${primaryCategory.toLowerCase()} at the same key moments. After this review, your coach replaces this plan with a new eight-week program built for your current season: in-season, preseason, or offseason. This plan stops here and does not repeat.`
      : `Record a follow-up from the same angle and at the same effort as your first video. Compare ${primaryCategory.toLowerCase()} at the same key moments. Use what changed to adjust the cue and workload for weeks ${week + 1}–${week + 2}; do not restart the full plan.`

    return {
      week,
      priority: block.priority,
      coaching_cue: block.cue,
      prescription: block.prescription,
      reassessment,
      days: [
        {
          day: 'Monday',
          focus: `${primaryCategory} drill work`,
          work: `Warm up, then complete 3 sets of 5 controlled reps. Your main correction is: ${primaryFix}`,
        },
        {
          day: 'Tuesday',
          focus: 'Throwing development',
          work: 'Follow your normal coach-approved throwing program. Use the week’s cue for a small group of focused pitches instead of thinking about it on every throw.',
        },
        {
          day: 'Wednesday',
          focus: 'Recovery and video review',
          work: 'Use light, pain-free mobility and review one good rep and one missed rep. Write down the visible difference in plain words.',
        },
        {
          day: 'Thursday',
          focus: 'Repeatability session',
          work: `Complete 3 sets of 5 reps for ${primaryCategory.toLowerCase()}. Reset between reps and stop the set when the movement changes.`
        },
        {
          day: 'Friday',
          focus: week <= 2 ? 'Controlled bullpen' : 'Intent or bullpen progression',
          work: week <= 2
            ? 'Use moderate intent and finish each rep under control. Do not add speed when the movement falls apart.'
            : 'Build intent only when you are pain-free and the movement stays repeatable. Keep this inside your normal throwing workload.',
        },
        {
          day: 'Saturday',
          focus: 'Strength, mobility, or game schedule',
          work: 'Follow the strength work included with your membership or your existing team plan. Move this day as needed around games and high-intent throwing.',
        },
        {
          day: 'Sunday',
          focus: reassessment ? `${week}-week video reassessment` : 'Rest and check-in',
          work: reassessment
            ? reassessmentWork
            : 'Rest from pitching. Record throwing volume, soreness, confidence, and whether you completed the week’s work.',
        },
      ],
      completed: false,
    }
  })
}

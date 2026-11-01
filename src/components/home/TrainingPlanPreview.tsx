import { CalendarDays, ChevronDown, Dumbbell, FileBarChart2, Target } from 'lucide-react'

const examples = [
  {
    icon: FileBarChart2,
    title: 'Assess',
    description: 'Find what works in your delivery and what needs work.',
    heading: 'A clear read on your delivery',
    rows: [
      ['Strength', 'You stay on line toward the plate.'],
      ['Priority', 'Make your front-side finish more repeatable.'],
      ['Next step', 'Review the marked frames with your coach and pick one cue for your next session.'],
    ],
    note: 'Fictional assessment excerpt. Your feedback comes from your own video.',
  },
  {
    icon: Target,
    title: 'Throw',
    description: 'Take your drills and throwing plan to the field.',
    heading: 'A bullpen with a purpose',
    rows: [
      ['Schedule', 'Wednesday command pen before a Friday outing.'],
      ['Sample pitch mix', '10 fastballs · 6 changeups · 4 sliders'],
      ['During the pen', 'Pitch 5 of 20 · Fastball · glove-side target'],
      ['Effort & velo', 'Your coach sets the effort target and any pitch-specific velocity range.'],
    ],
    note: 'Illustrative session, not a throwing prescription. Planned tracking features are still in development.',
  },
  {
    icon: Dumbbell,
    title: 'Build',
    description: 'Pair your throwing with lifting and mobility.',
    heading: 'Training around your throwing',
    rows: [
      ['Strength', 'A lifting day with a split squat and a row selected for this sample athlete.'],
      ['Mobility', 'Hip and upper-back work tied to the athlete’s movement checks.'],
      ['Around outings', 'Your coach adjusts the day’s work around games and bullpen sessions.'],
    ],
    note: 'Example layout for Complete Development. Exercises, volume and timing depend on your assessment.',
  },
  {
    icon: CalendarDays,
    title: 'Review',
    description: 'Log your work and review your progress.',
    heading: 'See how the session went',
    rows: [
      ['Planned vs. actual', '20 pitches planned · 18 logged'],
      ['Sample command recap', '12 of 16 scored pitches on target · 75%'],
      ['Missing locations', '2 pitches unscored. They do not count as hits or misses.'],
      ['Next session', 'Review the misses, effort check-in and upcoming schedule with your coach.'],
    ],
    note: 'Illustrative numbers, not athlete results. Command compares location with the intended target.',
  },
]

export function TrainingPlanPreview() {
  return (
    <div className="my-8 space-y-4">
      <p className="text-xs text-slate-500">Tap a step to see an example.</p>
      {examples.map(({ icon: Icon, title, description, heading, rows, note }) => (
        <details key={title} id={`plan-example-${title.toLowerCase()}`} className="group scroll-mt-24 overflow-hidden rounded-xl border border-transparent bg-navy-900 open:border-electric-blue/30">
          <summary className="cursor-pointer list-none p-5 transition-colors hover:bg-white/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-electric-blue-light [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <Icon aria-hidden="true" className="h-5 w-5 text-electric-blue-light" />
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
            </div>
            <h4 className="mt-3 text-lg font-bold text-white">{title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
            <span className="mt-3 inline-block text-xs font-semibold text-electric-blue-light"><span className="group-open:hidden">View example</span><span className="hidden group-open:inline">Close example</span></span>
          </summary>
          <div className="mx-5 mb-5 border-t border-surface-border pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-electric-blue-light">Sample only</p>
            <h5 className="mt-2 text-base font-bold text-white">{heading}</h5>
            <dl className="mt-4 space-y-4">
              {rows.map(([label, text]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-slate-300">{label}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-400">{text}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-slate-500">{note}</p>
          </div>
        </details>
      ))}
    </div>
  )
}

import { CalendarDays, ChevronDown, Dumbbell, FileBarChart2, Target } from 'lucide-react'

const examples = [
  {
    icon: FileBarChart2, title: 'Assess', description: 'Why does your fastball sail when you aim for the corner?',
    heading: 'Your best fastball gives us a starting point',
    rows: [
      ['Keep', 'You carry your chest well as you stride. Keep that posture.'],
      ['Work on', 'On the high miss, your front knee keeps bending and your chest opens while the throwing hand is still coming up. Then you rush the arm forward. On your best strike, the knee steadies sooner and you turn through the throw.'],
      ['First move', 'Use step-over med-ball throws on lift day to work on the landing. Before the pen, use three easy rocker throws to find that turn with a baseball.'],
    ],
  },
  {
    icon: Target, title: 'Throw', description: 'Take one adjustment from warmups into your regular delivery.',
    heading: 'Wednesday bullpen before a Friday start',
    rows: [
      ['Before the pen', 'Stand sideways in your stride stance with a baseball. Shift onto your front foot, rock back, then shift forward and throw to your partner in one motion. Make three easy throws at normal warmup effort.'],
      ['What to feel', 'Let your shirt turn toward your partner as you throw. If you have to shove the ball to reach them, move closer.'],
      ['On the mound', 'Start your planned pen with five fastballs to the same glove. Have your catcher count how many they receive without lifting the mitt. Those five count toward the pen total.'],
    ],
  },
  {
    icon: Dumbbell, title: 'Build', description: 'See why a coach might put a step-over med-ball throw in your lift.',
    heading: 'Give your front leg something to turn against',
    rows: [
      ['Why it’s here', 'On the same high misses, your front knee keeps drifting toward the plate after your foot lands. On your best strike it takes your weight, then steadies while your chest turns.'],
      ['Step-over throw', 'Stand sideways to a throwing wall with a light medicine ball at your chest. Step over a rolled towel with your lead foot. As that foot takes your weight, turn and toss the ball into the wall with both hands. Reset between reps.'],
      ['Check the rep', 'Let the knee bend on landing. Can you finish facing the wall with your lead foot still planted? If you need a second step to catch yourself, shorten the stride. Without a ball, rehearse the same step and turn.'],
    ],
  },
  {
    icon: CalendarDays, title: 'Review', description: 'See what carried over when the drill was over.',
    heading: 'What we’d take into the next pen',
    rows: [
      ['Catcher’s log', 'Last Wednesday, two of five fastballs stayed at the glove. This Wednesday, three did. Both misses were still high.'],
      ['Coach’s call', 'Keep the rocker in warmups for one more pen. Film a strike and a high miss from the same side angle. Compare what the chest does from foot plant until the ball leaves your hand.'],
      ['In the weight room', 'Last lift: dumbbell bench, 40 lb per hand for six clean reps. Start there next time and log how the set feels.'],
    ],
  },
]

export function TrainingPlanPreview() {
  return (
    <div className="my-8 space-y-4">
      <p className="text-xs text-slate-500">Follow one fictional pitcher from assessment to his next bullpen. Tap any step.</p>
      {examples.map(({ icon: Icon, title, description, heading, rows }) => (
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
          </div>
        </details>
      ))}
    </div>
  )
}

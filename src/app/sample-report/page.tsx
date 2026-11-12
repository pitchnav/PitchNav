import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'

export const metadata: Metadata = {
  title: 'Sample Report',
  description: 'View a sample Pitch Nav pitching mechanics analysis report — fictional demo athlete showing the scorecard, position breakdown, drills, and development plan format.',
}

// Demo data — clearly labeled as fictional
const DEMO_ATHLETE = {
  name: 'Sample assessment · High school right-hander',
  age: 16,
  height: '6\'1"',
  weight: 175,
  hand: 'Right-Handed',
  level: 'High School',
  currentVelocity: 78,
  goalVelocity: 85,
  analysisDate: 'Sample Report — Fictional Data',
}

const SCORECARD = [
  { category: 'Stride Direction', score: 3, notes: 'Your stride carries you toward home. At landing, check where your hips are relative to the front foot.' },
  { category: 'Lower-Half Sequencing', score: 3, notes: 'Your lift knee starts down while your hips stay over the rubber. Most of your move toward home happens late in the stride.' },
  { category: 'Arm Timing', score: 2, notes: 'At foot strike your chest has started to open while your throwing hand is still coming up behind you. The arm has to hurry from there.' },
  { category: 'Lead-Leg Block', score: 2, notes: 'Your front knee takes your weight at landing, then keeps bending as your chest turns.' },
  { category: 'Postural Control', score: 4, notes: 'You carry your chest well through the stride. The extra lean toward your glove side shows up late, near release.' },
  { category: 'Fastball Command', score: 3, notes: 'Optional bullpen log from the catcher, scored separately for this example. Two of five fastballs reached the glove. The side-view assessment uses one delivery.' },
]

const deliveryScore = SCORECARD.reduce((sum, c) => sum + c.score, 0)

const phases = [
  ['Leg Lift & Forward Move', 'You load the back hip well. The pause comes as the lift knee drops. Let your belt start traveling toward the catcher with the knee so you have room to stride at your own pace.'],
  ['Hand Break & Arm Path', 'After your hands split, the ball swings a long way behind your back hip. By the time your front foot is down, the hand is still coming up. Use the frame where the lead shoe touches down to check the timing.'],
  ['Foot Strike & Lead-Leg Stability', 'Your front knee bends as the shoe takes your weight. Follow it from foot plant to release. It keeps moving forward while your chest turns. That’s where we’ll start.'],
  ['Hip-Shoulder Separation & Trunk Rotation', 'Your belt and the lettering on your jersey start facing the catcher almost together. In the step-over drill, let the lead foot take your weight before you turn the ball into the wall.'],
  ['Arm Acceleration & Release', 'Your chest opens early, then your elbow straightens and you reach for the glove. That last reach is the push we want to clean up. Use the rocker to feel the shoulder come around with the throw.'],
  ['Deceleration & Follow-Through', 'After release your upper body carries toward your glove side. Work on the landing first and let the arm finish naturally.'],
]

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Demo notice */}
        <div className="mb-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400/90">
            <strong>Sample Report — All data on this page is fictional.</strong> Your report includes
            screenshots from your video, a review of your mechanics, and drills for your delivery.
          </p>
        </div>

        {/* Athlete summary */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <h1 className="text-2xl font-black text-white">{DEMO_ATHLETE.name}</h1>
              <p className="text-electric-blue-light text-sm mt-1">{DEMO_ATHLETE.analysisDate}</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-electric-blue/10 border border-electric-blue/20 px-5 py-3">
              <div className="text-center">
                <p className="text-3xl font-black text-white">{deliveryScore}</p>
                <p className="text-xs text-slate-500">out of 30</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Delivery Score</p>
                <p className="text-xs text-slate-500">Your personal coaching benchmark</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border">
            {[
              { label: 'Age', value: `${DEMO_ATHLETE.age} years` },
              { label: 'Height / Weight', value: `${DEMO_ATHLETE.height} / ${DEMO_ATHLETE.weight} lbs` },
              { label: 'Throws', value: DEMO_ATHLETE.hand },
              { label: 'Level', value: DEMO_ATHLETE.level },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-surface-border">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Current Velocity (Athlete-Provided)</p>
              <p className="text-2xl font-black text-white">{DEMO_ATHLETE.currentVelocity} <span className="text-base font-normal text-slate-400">mph</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Goal Velocity</p>
              <p className="text-2xl font-black text-accent-green">{DEMO_ATHLETE.goalVelocity} <span className="text-base font-normal text-slate-400">mph</span></p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Velocity is athlete-provided and not independently verified by Pitch Nav.</p>
        </div>

        <section className="card mb-8">
          <h2 className="text-xl font-bold text-white">Overall Mechanical Assessment</h2>
          <h3 className="mt-4 font-bold text-electric-blue-light">High priority · Lower-half stability and rotational sequencing</h3>
          <p className="mt-3 text-slate-300">Your posture through the stride is a strength. The part we’d work on first is landing. After foot plant, your front knee keeps giving while your chest opens and your throwing hand is still behind you. From there the throw looks rushed and pushy. The goal is to let the front leg take your weight and steady as you turn through the throw.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Give the front leg a chance to take your weight and firm up as you turn.</li>
            <li>Let the hips lead the turn toward home. Compare your belt and shoulders at landing.</li>
            <li>Check when the throwing hand comes up relative to that turn on your regular fastball.</li>
            <li>Carry the easy arm action from your rocker throws into the pen. Use the first five fastballs to check command.</li>
          </ol>
        </section>

        {/* Scorecard */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-2">Mechanics Scorecard</h2>
          <p className="text-sm text-slate-500 mb-6">
            The Delivery Score tracks your own progress over time. It is not a medical score, a
            laboratory score, or a prediction of injury.
          </p>
          <div className="space-y-5">
            {SCORECARD.map(({ category, score, notes }) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-white">{category}</span>
                  <span className="text-sm font-bold text-electric-blue-light">{score}/5</span>
                </div>
                <ProgressBar accessibleLabel={category} value={score} max={5} color="blue" size="sm" />
                <p className="text-xs text-slate-500 mt-1.5">{notes}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-surface-border flex justify-between items-center">
            <span className="text-base font-semibold text-slate-300">Total Delivery Score</span>
            <span className="text-3xl font-black text-accent-green">{deliveryScore}/30</span>
          </div>
        </div>

        <section className="card mb-8">
          <h2 className="text-xl font-bold text-white">The delivery, from lift to finish</h2>
          <p className="mt-2 text-sm text-slate-400">One side-view pitch, from the first move off the rubber through the finish.</p>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {phases.map(([name, detail]) => <div key={name}><dt className="font-bold text-white">{name}</dt><dd className="mt-1 text-sm text-slate-300">{detail}</dd></div>)}
          </dl>
        </section>

        <section className="card mb-8">
          <h2 className="text-xl font-bold text-white">What goes in your plan</h2>
          <h3 className="mt-5 font-bold text-white">Before you throw · Rocker throws</h3>
          <p className="mt-2 text-slate-300">Face sideways with your feet already in your stride. Rock forward, back, then forward into an easy throw to your partner. Feel your chest carry your throwing shoulder around. Three easy reps, then throw from your normal delivery and see if you can get the same finish.</p>
          <h3 className="mt-5 font-bold text-white">On lift day · Step-over med-ball throws</h3>
          <p className="mt-2 text-slate-300">Stand sideways to a throwing wall. Hold a light medicine ball at your chest and step over a rolled towel with your lead foot. As it lands, turn and toss the ball into the wall with both hands. A good rep ends with your front foot planted and your chest facing the wall. Shorten the step if you stumble forward.</p>
        </section>

        <section className="card mb-8">
          <h2 className="text-xl font-bold text-white">First four weeks of the sample development plan</h2>
          <ol className="mt-5 space-y-4 text-slate-300">
            <li><strong>Week 1 · Get a baseline.</strong> Use the first five fastballs in your scheduled pen. Keep one target and count how often the catcher has to lift the glove. Save one side-view delivery for your next mechanics check.</li>
            <li><strong>Week 2 · Try the rocker.</strong> Use three warmup throws for the drill. Repeat the five-fastball check at the same effort. In this example the pitcher went from two at the glove to three. Keep working before calling that progress.</li>
            <li><strong>Week 3 · Mix your pitches.</strong> Call a changeup between fastballs. See if you can come back to the glove when you only get one shot at the fastball.</li>
            <li><strong>Week 4 · Review the carryover.</strong> Compare regular pitches from weeks one and four. If the high miss keeps showing up, revisit the landing with your coach before adding another drill.</li>
          </ol>
          <Link href="/tailored-development" className="btn-secondary mt-6">Explore Tailored Development <ArrowRight className="h-4 w-4" /></Link>
        </section>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Get Your Delivery Reviewed</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Send us your pitching video. Get a breakdown of your mechanics and drills to take to your next session.
          </p>
          <Link href="/pricing" className="btn-action text-base px-8 py-4">
            Choose My Membership <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

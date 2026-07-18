import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, AlertTriangle, Star } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'

export const metadata: Metadata = {
  title: 'Sample Report',
  description: 'View a sample Pitch Nav pitching mechanics analysis report — fictional demo athlete showing the scorecard, position breakdown, drills, and development plan format.',
}

// Demo data — clearly labeled as fictional
const DEMO_ATHLETE = {
  name: 'Demo Athlete (Fictional)',
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
  { category: 'Direction', score: 4, notes: 'Good hip-to-plate direction. Minor early rotation tendency at peak leg lift.' },
  { category: 'Lower-Half Sequencing', score: 3, notes: 'Moderate hip-to-shoulder separation. Stride tends to shorten under game conditions.' },
  { category: 'Upper-Half Timing', score: 4, notes: 'Good arm layback timing. Scapular loading is adequate.' },
  { category: 'Front-Side Stability', score: 3, notes: 'Front knee collapses slightly at contact. Leads to early trunk rotation and a lower release point.' },
  { category: 'Posture', score: 5, notes: 'Excellent posture throughout the delivery. Head stays on the target.' },
  { category: 'Release Consistency', score: 4, notes: 'Consistent release point on fastball. Slight variation on off-speed.' },
]

const deliveryScore = SCORECARD.reduce((sum, c) => sum + c.score, 0)

const POSITIONS = [
  {
    position: 'Peak Leg Lift',
    image: null,
    notes: 'Good balance at the peak. Slight early hip rotation beginning to show as the knee comes down.',
    strength: 'Balanced and controlled at the top of the leg lift.',
    opportunity: 'Delay hip rotation slightly longer to maximize hip-to-shoulder separation.',
    cue: '"Hold the hip square until the knee starts to drive."',
  },
  {
    position: 'Hand Separation',
    image: null,
    notes: 'Clean hand break. Ball comes out on time with a downward arc toward the power position.',
    strength: 'Efficient hand break with good arm direction.',
    opportunity: 'Ensure the glove stays firm at chest-height rather than pulling across the body.',
    cue: '"Glove stays, arm goes."',
  },
  {
    position: 'Lead-Foot Contact',
    image: null,
    notes: 'Stride is directed well toward the plate. Foot lands in line with the target.',
    strength: 'Consistent landing direction. Front foot aligns with the target line.',
    opportunity: 'Landing foot contact could be slightly firmer to improve the blocking action.',
    cue: '"Land firm, not soft."',
  },
  {
    position: 'Maximum External Rotation',
    image: null,
    notes: 'Good layback. Elbow is at shoulder height at ball release. Scap loading is adequate.',
    strength: 'Elbow maintains proper height through layback.',
    opportunity: 'Continue developing scapular stability to maintain this position under fatigue.',
    cue: '"Stay back until the hip fires."',
  },
  {
    position: 'Ball Release',
    image: null,
    notes: 'Release point is consistent but slightly early on some pitches, likely related to front-knee collapse.',
    strength: 'Good finger pressure through the ball on most pitches.',
    opportunity: 'Improving front-knee stability should bring the release point forward 2–4 inches.',
    cue: '"Drive through the ball, not around it."',
  },
  {
    position: 'Finish & Deceleration',
    image: null,
    notes: 'Arm finishes across the body well. Follow-through is complete on most pitches.',
    strength: 'Good deceleration path. Arm swings all the way across and finishes near the opposite hip.',
    opportunity: 'Engage the core through the follow-through more consistently.',
    cue: '"Let the arm swing all the way through."',
  },
]

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Demo notice */}
        <div className="mb-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400/90">
            <strong>Sample Report — All data on this page is fictional.</strong> This is a
            demonstration of the Pitch Nav report format using a fictional athlete. Real reports
            include actual video screenshots, personalized analysis, and athlete-specific drills.
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
                <p className="text-xs text-slate-500">Internal coaching benchmark</p>
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
          <p className="text-xs text-slate-600 mt-2">Velocity is athlete-provided and not independently verified by Pitch Nav.</p>
        </div>

        {/* Scorecard */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-2">Mechanics Scorecard</h2>
          <p className="text-sm text-slate-500 mb-6">
            The Delivery Score is an internal coaching tool for tracking development in the same
            athlete over time. It is not a medical score, laboratory biomechanics score, or
            prediction of injury.
          </p>
          <div className="space-y-5">
            {SCORECARD.map(({ category, score, notes }) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-white">{category}</span>
                  <span className="text-sm font-bold text-electric-blue-light">{score}/5</span>
                </div>
                <ProgressBar value={score} max={5} color="blue" size="sm" />
                <p className="text-xs text-slate-500 mt-1.5">{notes}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-surface-border flex justify-between items-center">
            <span className="text-base font-semibold text-slate-300">Total Delivery Score</span>
            <span className="text-3xl font-black text-accent-green">{deliveryScore}/30</span>
          </div>
        </div>

        {/* Position breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Six-Position Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {POSITIONS.map(({ position, notes, strength, opportunity, cue }) => (
              <div key={position} className="card">
                {/* Image placeholder */}
                <div className="rounded-lg bg-navy-800 border border-surface-border h-40 flex items-center justify-center mb-4">
                  <p className="text-xs text-slate-600">[Annotated screenshot — {position}]</p>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{position}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{notes}</p>
                <div className="space-y-3">
                  <div className="rounded-lg bg-accent-green/5 border border-accent-green/20 p-3">
                    <p className="text-xs font-semibold text-accent-green mb-1">Strength</p>
                    <p className="text-xs text-slate-300">{strength}</p>
                  </div>
                  <div className="rounded-lg bg-electric-blue/5 border border-electric-blue/20 p-3">
                    <p className="text-xs font-semibold text-electric-blue-light mb-1">Development Opportunity</p>
                    <p className="text-xs text-slate-300">{opportunity}</p>
                  </div>
                  <div className="rounded-lg bg-surface-hover p-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Coaching Cue</p>
                    <p className="text-xs text-white italic">{cue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Priorities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-4">Three Strengths</h2>
            <ul className="space-y-3">
              {[
                'Excellent posture and head stability through the delivery',
                'Good arm-path direction and elbow height at ball release',
                'Clean hand break with efficient arm direction',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Star className="h-4 w-4 text-accent-green flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-4">Three Development Priorities</h2>
            <ul className="space-y-3">
              {[
                'Front-knee stability at and after lead-foot contact',
                'Hip-to-shoulder separation at hand separation',
                'Glove-side control through ball release',
              ].map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-electric-blue-light font-bold text-sm flex-shrink-0 w-5">{i + 1}.</span>
                  <span className="text-sm text-slate-300">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Drills */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Assigned Drills</h2>
          <div className="space-y-6">
            {[
              {
                name: 'Pivot Pickoff Drill',
                category: 'Lead-Leg Stability',
                sets: 3, reps: '6 reps',
                cue: 'Land firm, not soft. Feel the front knee stay over the foot for 2 seconds.',
                mistake: 'Collapsing the front knee or rushing out of the freeze position.',
              },
              {
                name: 'Rocker Drill',
                category: 'Direction / Hip Sequencing',
                sets: 3, reps: '10 reps',
                cue: 'Drive the hip directly at the plate on the third rock. Keep the glove side closed.',
                mistake: 'Opening the hips before the knee reaches the balance point.',
              },
              {
                name: 'Standing Decel Towel Drill',
                category: 'Deceleration / Arm Care',
                sets: 3, reps: '10 reps',
                cue: 'Let the arm swing all the way across the body. Finish with the palm down near the opposite hip.',
                mistake: 'Cutting the follow-through short.',
              },
            ].map((drill) => (
              <div key={drill.name} className="rounded-xl border border-surface-border bg-surface-hover p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{drill.name}</h3>
                    <span className="text-xs text-electric-blue-light">{drill.category}</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {drill.sets} sets × {drill.reps}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1 font-semibold">Coaching Cue</p>
                    <p className="text-slate-300 italic">"{drill.cue}"</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1 font-semibold">Common Mistake</p>
                    <p className="text-slate-300">{drill.mistake}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eight-week plan */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Eight-Week Focus Plan (Sample)</h2>
          <div className="space-y-4">
            {[
              { week: 1, focus: 'Front-Leg Stability', detail: 'Pivot Pickoff Drill daily (3×6). Focus on the feeling of a firm front leg through release on every bullpen pitch. Video yourself from the open side at least once.' },
              { week: 2, focus: 'Hip Sequencing & Direction', detail: 'Add Rocker Drill (3×10) before bullpen sessions. Aim to feel more hip-to-shoulder separation before hand separation.' },
              { week: 3, focus: 'Integration', detail: 'Connect the front-leg feel and the hip sequencing in live bullpen sessions. Record a comparison pitch from the open side.' },
              { week: 4, focus: 'Deceleration & Arm Care', detail: 'Introduce Towel Drill (3×10) at the end of bullpen sessions. Focus on complete follow-through on every pitch, especially when fatigued.' },
            ].map(({ week, focus, detail }) => (
              <div key={week} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-electric-blue/10 flex items-center justify-center">
                  <span className="text-sm font-black text-electric-blue-light">{week}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{focus}</p>
                  <p className="text-sm text-slate-400 mt-1">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Your Own Analysis?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Submit your pitching videos and receive a complete report like this one,
            personalized to your specific delivery.
          </p>
          <Link href="/pricing" className="btn-primary text-base px-8 py-4">
            Choose My Membership <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Training & Medical Disclaimer',
  description: 'Pitch Nav training and medical disclaimer — important information about the nature and limitations of Pitch Nav services.',
}

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">
            Training & Medical Disclaimer
          </h1>
          <p className="text-slate-400 text-sm">Last updated: [DATE — replace before launch]</p>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6 mb-10">
          <div className="flex gap-4">
            <AlertTriangle className="h-7 w-7 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-yellow-400 mb-3">
                Please Read Before Using Pitch Nav
              </h2>
              <p className="text-sm text-yellow-200/80 leading-relaxed">
                Pitch Nav provides educational baseball training information only.
                It does not provide medical care, diagnose injuries, calculate clinical
                injury risk, or guarantee any outcome. Athletes experiencing pain should
                stop throwing immediately and consult a qualified medical professional.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {[
            {
              heading: 'Educational Purpose Only',
              text: 'Pitch Nav is an educational baseball training service. All content, analysis reports, mechanics scores, drill recommendations, and focus plans are provided for general educational and athletic development purposes only. Nothing provided by Pitch Nav constitutes medical, clinical, or professional sports science advice.',
            },
            {
              heading: 'Not a Medical Service',
              text: 'Pitch Nav cannot and does not diagnose medical conditions, injuries, or physical abnormalities. Pitch Nav cannot and does not provide injury treatment plans, rehabilitation programs, or injury-prevention protocols. Mechanics assessments and development scores are coaching opinions — not medical evaluations. If you believe an athlete may have a throwing-related injury, stop throwing and consult an athletic trainer, physical therapist, orthopedic physician, or other qualified medical professional.',
            },
            {
              heading: 'No Injury Risk Prediction',
              text: 'The Delivery Score and mechanics scorecard in Pitch Nav reports are internal coaching tools designed to track mechanical changes in the same athlete over time. They do not predict injury risk, measure clinical biomechanical stress, assess load on specific anatomical structures, or indicate whether an athlete is safe to throw. Do not interpret any Pitch Nav score as a medical clearance or an injury-risk assessment.',
            },
            {
              heading: 'No Performance Guarantees',
              text: 'Pitch Nav does not guarantee specific velocity increases, mechanical corrections, scholarship offers, roster spots, or any athletic outcomes. Results depend on many variables outside of Pitch Nav\'s control, including the athlete\'s physical development, age, training consistency, rest, nutrition, coaching support, and individual biomechanical factors.',
            },
            {
              heading: 'Velocity Information',
              text: 'All velocity information included in Pitch Nav reports is based on data submitted by the athlete or the athlete\'s representative and is clearly labeled as athlete-provided velocity. Pitch Nav does not independently verify velocity readings. Standard phone video without calibration data cannot be used to accurately determine pitch velocity. If a reviewer includes video-based velocity estimates in a future report, they will be clearly labeled as estimates with stated assumptions and confidence levels.',
            },
            {
              heading: 'Health Screening Limitations',
              text: 'The health and safety questions asked during the intake process are not a medical screening tool. They are intended only to inform the reviewer of relevant context. Pitch Nav does not use health-screening responses to clear or disqualify an athlete from throwing. Any athlete who reports pain should consult a qualified medical professional regardless of the outcome of the intake process.',
            },
            {
              heading: 'Safe Filming Practices',
              text: 'Use a tripod or stable mounting solution for the throwing-arm side view, remain outside the path of thrown or batted balls, and follow safe filming practices at all times. Pitch Nav is not responsible for injuries that occur during filming.',
            },
            {
              heading: 'Parental Responsibility for Minor Athletes',
              text: 'Parents and guardians of minor athletes (under 18) are responsible for monitoring their athlete\'s training load, physical health, and throwing-related symptoms. Overuse injuries are serious and can have long-term consequences for developing athletes. If a minor athlete reports arm pain, fatigue, or decreased velocity, stop throwing and consult a physician.',
            },
          ].map(({ heading, text }) => (
            <div key={heading} className="card">
              <h2 className="text-base font-bold text-white mb-3">{heading}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

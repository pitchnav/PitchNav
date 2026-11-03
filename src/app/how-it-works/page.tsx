import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Camera, Upload, CreditCard, FileBarChart2, Clock, Shield } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how Pitch Nav works — create your profile, set up your camera, record your videos, submit payment, and receive your expert mechanics analysis.',
}

const steps = [
  {
    icon: <CheckCircle className="h-8 w-8" />,
    number: '01',
    title: 'Tell Us About Your Game',
    description: 'Tell us when you play, where you train and what you want to improve.',
    details: [
      'Name, age, height, weight, and playing level',
      'Throwing handedness and primary position',
      'Current and goal velocity (clearly labeled as athlete-provided)',
      'School, summer and fall dates, plus the equipment you can use',
      'Health and safety screening questions',
      'Parent or guardian consent for athletes under 18',
    ],
    note: 'Athletes under 13 are not accepted at this time.',
  },
  {
    icon: <Camera className="h-8 w-8" />,
    number: '02',
    title: 'Set Up Your Camera',
    description: 'Use the camera guide to frame your full delivery before you throw.',
    details: [
      'Open-side view: film from the throwing-arm side, perpendicular to the pitch',
      'Camera height: 6 feet high, with the lens level',
      'Recommended frame rate: 120 or 240 fps if your device supports it',
      'Full body must remain in frame through release',
      'Do not zoom or move the camera during the pitch',
      'Movement screens are filmed separately, facing the camera, each with its own phone placement',
    ],
    note: 'Submit one clear, complete pitch from the open-side angle. The movement screens have their own guide.',
  },
  {
    icon: <CreditCard className="h-8 w-8" />,
    number: '03',
    title: 'Check Out',
    description: 'Choose your assessment or membership. Once payment clears, open the upload link to send your pitch.',
    details: [
      'Secure checkout powered by Stripe',
      'Pitch Nav does not store your card number',
      'See the pricing page for current plans and assessment fees',
      'Order confirmation email sent immediately',
      'Your coach can begin once your video is in',
    ],
    note: null,
  },
  {
    icon: <Upload className="h-8 w-8" />,
    number: '04',
    title: 'Send Your Video',
    description: 'Upload a clear pitch from your camera roll. We accept MP4, MOV and other common video formats.',
    details: [
      'One open-side video (required)',
      'Radar screenshot or radar-backed video (optional)',
      'Video quality checklist before final submission',
    ],
    note: 'Your uploaded videos are private. You and your assigned reviewer can access them.',
  },
  {
    icon: <Clock className="h-8 w-8" />,
    number: '05',
    title: 'Track Your Order',
    description: 'Track your order in your dashboard. You\'ll get an email whenever your status changes.',
    details: [
      'Real-time status tracking in your dashboard',
      'Email notifications at key milestones',
      'Reviewer may request replacement videos if needed',
      'Typical delivery: one business day after complete submission',
    ],
    note: 'If your reviewer needs replacement videos, you\'ll be notified with a clear explanation and 14 days to re-upload at no extra charge.',
  },
  {
    icon: <FileBarChart2 className="h-8 w-8" />,
    number: '06',
    title: 'Get Your Report',
    description: 'When your analysis is complete, you\'ll receive an email and can access your full report in your dashboard.',
    details: [
      'Delivery Score and six-category scorecard',
      'Position-by-position annotated breakdowns',
      'Three strengths and three development priorities',
      'Three personalized drills with sets, reps, and coaching cues',
      'Development members get a throwing calendar. Complete adds seasonal lifts and mobility.',
      'Voice-over video walking you through the analysis',
      'Downloadable PDF report',
    ],
    note: null,
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Start Your Development Plan
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Here’s how to get your delivery reviewed and start training around your outings.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex flex-col sm:flex-row gap-8">
              {/* Icon + connector */}
              <div className="flex flex-col items-center sm:items-start">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-electric-blue/10 text-electric-blue-light flex-shrink-0">
                  {step.icon}
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden sm:block w-0.5 flex-1 bg-gradient-to-b from-surface-border to-transparent mt-4 ml-8" aria-hidden />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">
                    Step {step.number}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
                <p className="text-slate-400 leading-relaxed mb-6">{step.description}</p>

                <ul className="space-y-2.5 mb-4">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-accent-green flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{detail}</span>
                    </li>
                  ))}
                </ul>

                {step.note && (
                  <div className="mt-4 rounded-lg border border-electric-blue/20 bg-electric-blue/5 p-3">
                    <p className="text-xs text-electric-blue-glow leading-relaxed">ℹ️ {step.note}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Security note */}
        <div className="my-16 card border-accent-green/20">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-accent-green flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-white mb-2">Privacy & Security</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your videos are stored privately. Only you and your assigned reviewer can see them.
                You can request deletion of your videos or your entire account at any time from your dashboard.
              </p>
            </div>
          </div>
        </div>

        <SafetyDisclaimer />

        <div className="mt-12 text-center">
          <Link href="/pricing" className="btn-primary text-base px-8 py-4">
            Choose My Membership <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            Have questions first?{' '}
            <Link href="/faq" className="text-electric-blue-light hover:underline">
              Check the FAQ
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="text-electric-blue-light hover:underline">
              contact us
            </Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

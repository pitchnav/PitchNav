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
    title: 'Create Your Athlete Profile',
    description: 'Set up a free account and complete the multi-step intake form. You\'ll share information about your physical profile, velocity history, pitching background, and goals.',
    details: [
      'Name, age, height, weight, and playing level',
      'Throwing handedness and primary position',
      'Current and goal velocity (clearly labeled as athlete-provided)',
      'Secondary pitches, years of experience, coaching history',
      'Health and safety screening questions',
      'Parent or guardian consent for athletes under 18',
    ],
    note: 'Athletes under 13 are not accepted in the current version.',
  },
  {
    icon: <Camera className="h-8 w-8" />,
    number: '02',
    title: 'Set Up Your Camera',
    description: 'Follow the interactive camera-setup wizard before you film. Every angle has a diagram, distance recommendation, and a checklist you confirm before continuing.',
    details: [
      'Open-side view: film from the throwing-arm side, perpendicular to the pitch',
      'Rear view: position behind the mound, centered with the target line',
      'Camera height: approximately chest-high for both angles',
      'Recommended frame rate: 120 or 240 fps if your device supports it',
      'Full body must remain in frame through release',
      'Do not zoom or move the camera during the pitch',
    ],
    note: 'Submit one clear, complete pitch from each required angle.',
  },
  {
    icon: <Upload className="h-8 w-8" />,
    number: '03',
    title: 'Upload Your Videos',
    description: 'Record directly from your device or upload existing videos from your camera roll. We support MP4, MOV, and most common formats.',
    details: [
      'One open-side video (required)',
      'One rear-view video (required)',
      'Front-view video (optional)',
      'Radar screenshot or radar-backed video (optional)',
      'Previous delivery video for comparison (optional)',
      'Video quality checklist before final submission',
    ],
    note: 'Videos are stored securely in a private bucket. Only you and your assigned reviewer can access your files.',
  },
  {
    icon: <CreditCard className="h-8 w-8" />,
    number: '04',
    title: 'Pay & Submit',
    description: 'Review your order summary, agree to the terms and disclaimer, and complete your secure checkout. Your order is created only after payment is confirmed.',
    details: [
      'Secure checkout powered by Stripe',
      'Pitch Nav does not store your card number',
      'Monthly $25 membership — cancel anytime',
      'Order confirmation email sent immediately',
      'Order immediately enters the review queue',
    ],
    note: null,
  },
  {
    icon: <Clock className="h-8 w-8" />,
    number: '05',
    title: 'Track Your Order',
    description: 'Watch your order progress through the review pipeline in your athlete dashboard. You\'ll receive email notifications when your status changes.',
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
    title: 'View Your Complete Report',
    description: 'When your analysis is complete, you\'ll receive an email and can access your full report in your dashboard.',
    details: [
      'Delivery Score and six-category scorecard',
      'Position-by-position annotated breakdowns',
      'Three strengths and three development priorities',
      'Three personalized drills with sets, reps, and coaching cues',
      'Eight-week focus plan',
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
            How Pitch Nav Works
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            From your first video to your completed mechanics report — a clear, step-by-step overview of the entire process.
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
                Your videos are stored in a private, access-controlled storage bucket.
                Row-level security ensures you can only access your own files.
                Your reviewer is the only person who can view your submitted videos.
                You can request deletion of your videos or your entire account at any time from your dashboard.
              </p>
            </div>
          </div>
        </div>

        <SafetyDisclaimer />

        <div className="mt-12 text-center">
          <Link href="/start-analysis" className="btn-primary text-base px-8 py-4">
            Start My Analysis — $25/month <ArrowRight className="h-5 w-5" />
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

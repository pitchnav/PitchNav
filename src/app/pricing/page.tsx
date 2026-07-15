import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowRight, HelpCircle } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Pitch Nav membership — $25/month. Staff-reviewed pitching analysis every two weeks, velocity estimates, progress tracking, and an eight-week development plan.',
}

const included = [
  { item: 'Open-side video review', note: null },
  { item: 'Rear-view video review', note: null },
  { item: 'Six-position mechanics breakdown', note: 'Peak leg lift, hand separation, lead-foot contact, max external rotation, ball release, finish & deceleration' },
  { item: 'Mechanics scorecard', note: '6 categories scored 1–5, Delivery Score out of 30' },
  { item: 'Velocity profile', note: 'Based on athlete-provided readings with source clearly labeled' },
  { item: '3 identified strengths', note: null },
  { item: '3 development priorities', note: null },
  { item: '3 personalized drills', note: 'Sets, reps, coaching cues, and common mistakes for each' },
  { item: 'Eight-week Monday–Sunday development plan', note: 'Daily priorities, drills, recovery, progress checkboxes, and a retest date' },
  { item: 'One new analysis every two weeks', note: 'Compare deliveries and track score, angle, and velocity trends over time' },
  { item: 'Owner approval before release', note: 'Your results are reviewed before appearing in your dashboard' },
  { item: 'Voice-over video analysis', note: 'Your reviewer walks through the report verbally' },
  { item: 'Downloadable PDF report', note: null },
  { item: 'Annotated position images', note: null },
  { item: 'Follow-up analysis option', note: 'Available at a separate discounted rate after your first report' },
]

const faqs = [
  {
    q: 'Is there a money-back guarantee?',
    a: 'If your reviewer determines that your submitted videos are unusable for analysis and replacement videos cannot be obtained, we will issue a full refund. Completed analyses are not eligible for refunds. Contact support@pitchnav.com with any concerns.',
  },
  {
    q: 'What if I need to submit replacement videos?',
    a: 'If your videos do not meet quality standards, your reviewer will notify you and explain what is needed. You can upload replacement videos at no additional charge within 14 days of the request.',
  },
  {
    q: 'What does the $25 monthly membership include?',
    a: 'Your membership includes secure video storage, one staff-reviewed analysis every two weeks, skeleton motion visualization, video-estimated velocity when eligible, an eight-week plan, and progress comparisons.',
  },
  {
    q: 'How much does a follow-up analysis cost?',
    a: 'Follow-up analysis pricing is set by the admin and displayed in your dashboard once your first report is complete. Contact us for current pricing.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Ongoing development—not a one-time report. Submit every two weeks, receive staff-reviewed feedback, follow your daily plan, and measure what changes.
          </p>
        </div>

        {/* Main pricing card */}
        <div className="relative card overflow-hidden mb-16">
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent-gradient" aria-hidden />

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-black text-white">Pitch Nav Development Membership</h2>
              <p className="text-slate-400 mt-2 max-w-lg">
                A continuous pitching-development workspace with staff-reviewed video analysis, a clear biggest opportunity, velocity context, and a practical two-month roadmap.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="text-5xl font-black text-white">$25</div>
              <p className="text-slate-500 text-sm mt-1">per month · cancel anytime</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            {included.map(({ item, note }) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-accent-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">{item}</p>
                  {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/start-analysis" className="btn-accent flex-1 justify-center text-base py-4">
              Start Membership — $25/month <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/sample-report" className="btn-secondary flex-1 justify-center text-base py-4">
              View Sample Report
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-600 text-center">
            Secure checkout powered by Stripe. Pitch Nav does not store your card number.
          </p>
        </div>

        {/* Delivery score note */}
        <div className="card mb-12 border-electric-blue/20">
          <div className="flex items-start gap-4">
            <HelpCircle className="h-6 w-6 text-electric-blue-light flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-white mb-2">About the Delivery Score</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The Delivery Score (out of 30) is an internal coaching tool used to track changes
                in the same athlete over time. It is <strong className="text-white">not</strong> a
                medical score, a laboratory biomechanics measurement, or a prediction of injury or
                performance. It is intended purely as a relative development benchmark.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Pricing Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="card">
                <h3 className="text-base font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <SafetyDisclaimer compact />
      </div>
    </div>
  )
}

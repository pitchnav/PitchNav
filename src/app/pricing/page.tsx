import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowRight, HelpCircle } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Pitch Nav Complete Pitching Analysis — $49. Expert-reviewed mechanics breakdown, velocity profile, personalized drills, and a four-week development plan.',
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
  { item: 'Four-week focus plan', note: null },
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
    q: 'Does the $49 cover both video angles?',
    a: 'Yes. The price covers your complete analysis including both the open-side and rear-view videos you submit.',
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
            One package. Expert-reviewed. Everything you need to understand your delivery and plan your development.
          </p>
        </div>

        {/* Main pricing card */}
        <div className="relative card overflow-hidden mb-16">
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent-gradient" aria-hidden />

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-black text-white">Complete Pitching Analysis</h2>
              <p className="text-slate-400 mt-2 max-w-lg">
                A comprehensive frame-by-frame breakdown of your pitching mechanics,
                reviewed by an experienced pitching coach.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="text-5xl font-black text-white">$49</div>
              <p className="text-slate-500 text-sm mt-1">one-time · no subscription</p>
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
              Start My Analysis — $49 <ArrowRight className="h-5 w-5" />
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

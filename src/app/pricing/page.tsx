import type { Metadata } from 'next'
import { HelpCircle, Users } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { IndividualPricing } from '@/components/pricing/IndividualPricing'
import { TeamPricingForm } from '@/components/forms/TeamPricingForm'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Throwing and Pitch Tracking from $24.99/month, Complete Development $39.99/month. First-month offers, annual savings and per-player program pricing.',
}

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
    q: 'Which membership includes Pitch Tracking?',
    a: 'Throwing Development is $24.99/month and includes tailored throwing support. Complete Development is $39.99/month and adds lifting, mobility and access to Pitch Tracking when released. Standalone Pitch Tracking is $24.99/month with no paid assessment. Tracking is currently in development.',
  },
  {
    q: 'How do assessments and annual billing work?',
    a: 'Throwing and Complete have a $49.99 one-time initial assessment per athlete. Annual subscriptions are paid upfront, replace the first-month discount and do not include the assessment fee. Existing subscriptions are not automatically changed by these new-plan prices.',
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

        <div className="mb-16"><IndividualPricing /></div>

        {/*
          Refund guarantee. Deliberately narrow and specific: first report only,
          14 days, full refund. It is a real commitment -- staff must honour it
          without argument -- so it is written as a plain promise rather than
          hedged marketing language. It also gives the honest "no guarantees"
          messaging elsewhere on the site something concrete to sit beside:
          Pitch Nav does not promise velocity, but it does stand behind the work.
        */}
        <div className="mx-auto mb-16 max-w-2xl rounded-xl border border-accent-green/25 bg-accent-green/5 p-5 text-center">
          <p className="text-sm font-semibold text-white">
            If your first report isn&apos;t useful, we&apos;ll refund it.
          </p>
          <p className="mt-1.5 text-sm text-slate-400">
            Full refund on your first analysis within 14 days. No form to fill out — just email us.
          </p>
        </div>

        <section id="teams" className="card mb-12 scroll-mt-24 border-electric-blue/25">
          <div className="mb-8 max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-electric-blue-light"><Users className="h-4 w-4" /> Teams &amp; programs</p>
            <h2 className="mt-3 text-3xl font-black text-white">One program. Every player.</h2>
            <p className="mt-3 text-slate-400">Choose Pitch Tracking or Complete Development with tailored throwing, lifting, mobility and metrics. Tell us about your roster and we’ll follow up with a program proposal.</p>
          </div>
          <TeamPricingForm />
        </section>

        {/* Delivery score note */}
        <div className="card mb-12 border-electric-blue/20">
          <div className="flex items-start gap-4">
            <HelpCircle className="h-6 w-6 text-electric-blue-light flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-white mb-2">About the Delivery Score</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The Delivery Score (out of 30) is a coaching tool that tracks your own progress
                over time. It is <strong className="text-white">not</strong> a medical score, a
                laboratory measurement, or a prediction of injury or performance. It&apos;s meant
                only to show your own development over time.
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

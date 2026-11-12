import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { IndividualPricing } from '@/components/pricing/IndividualPricing'
import { TeamPricingForm } from '@/components/forms/TeamPricingForm'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Compare assessment costs, first payments, renewal prices and team quote options. Pitch Tracking is in testing.',
}

const faqs = [
  {
    q: 'What if I need to submit replacement videos?',
    a: 'If your videos do not meet quality standards, your reviewer will notify you and explain what is needed. You can upload replacement videos at no additional charge within 14 days of the request.',
  },
  {
    q: 'Which membership includes Pitch Tracking?',
    a: 'Throwing Development is $24.99/month and includes mechanics drills and a throwing calendar. Complete Development is $39.99/month and adds lifting and mobility. Pitch Tracking is planned for Complete when it launches. Standalone Pitch Tracking is $24.99/month with no paid assessment. Tracking is currently in development.',
  },
  {
    q: 'How do assessments and annual billing work?',
    a: 'Throwing and Complete have a $49.99 one-time initial assessment per athlete. For an annual plan, the first payment includes a year up front plus that assessment. The first-month discount applies only to monthly billing. Existing subscriptions are not automatically changed by these new-plan prices.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="page-intro">
          <h1 className="page-title text-white">Plans and pricing</h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-300">Compare your first payment and renewal for an individual plan. For a roster quote, <a className="text-electric-blue-light underline" href="#teams">see team pricing</a>.</p>
        </header>

        <section className="mb-14" aria-labelledby="individual-heading">
          <h2 id="individual-heading" className="mb-5 text-2xl font-bold text-white">Individual plans</h2>
          <IndividualPricing />
        </section>

        <section id="teams" className="card mb-12 scroll-mt-24 border-electric-blue/25">
          <div className="mb-8 max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-electric-blue-light"><Users className="h-4 w-4" /> Teams &amp; programs</p>
            <h2 className="mt-3 text-3xl font-black text-white">Request a team quote</h2>
            <p className="mt-3 text-slate-400">Tell us about your roster and the services you want to discuss. A quote request does not start a subscription.</p>
          </div>
          <TeamPricingForm />
        </section>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Plan Questions</h2>
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

'use client'

import { useState } from 'react'
import { checkoutPath } from '@/lib/individual-checkout'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { INDIVIDUAL_PLANS, STANDALONE_ASSESSMENT_CENTS, money, type Billing } from '@/lib/pricing-catalog'

const features = {
  throwing: ['Tailored throwing plan', 'Staff-reviewed mechanics feedback', 'Drills and progress tracking'],
  complete: ['Initial tailored assessment', 'Lifting and mobility plans', 'Pitch Tracking included when released'],
  metrics: ['iPhone tracking in development', 'Pitch maps, tracers and history in development', 'No assessment required'],
}
export function IndividualPricing() {
  const [billing, setBilling] = useState<Billing>('monthly')
  return <div>
    <div className="mb-6 inline-flex gap-1 rounded-xl border border-surface-border bg-navy-950 p-1" role="group" aria-label="Individual billing">
      {(['monthly','annual'] as const).map(option => <button key={option} type="button" aria-pressed={billing === option} onClick={() => setBilling(option)} className="min-h-11 rounded-lg px-5 text-sm font-semibold text-slate-300 aria-pressed:bg-navy-700 aria-pressed:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric-blue-light">{option === 'monthly' ? 'Monthly' : 'Annual'}</button>)}
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      {(Object.keys(INDIVIDUAL_PLANS) as (keyof typeof INDIVIDUAL_PLANS)[]).map(key => {
        const plan = INDIVIDUAL_PLANS[key]
        const periodPrice = billing === 'annual' ? plan.annual : plan.firstMonth
        return <article key={key} className="card flex flex-col text-left">
          <h3 className="min-h-14 text-2xl font-bold leading-tight text-white">{plan.name}</h3>
          <p className="mt-5 text-4xl font-black text-white">{money(periodPrice + plan.assessment)}</p>
          <p className="mt-2 text-sm text-slate-300">First payment before tax · {billing === 'annual' ? 'annual plan' : 'monthly plan'}</p>
          <p className="mt-2 text-sm text-slate-400">{plan.assessment ? `Includes ${money(periodPrice)} for the first ${billing === 'annual' ? 'year' : 'month'} and a one-time ${money(plan.assessment)} assessment.` : 'No assessment fee.'}</p>
          <p className="mt-2 text-sm text-slate-300">Renews at {money(billing === 'annual' ? plan.annual : plan.monthly)}/{billing === 'annual' ? 'year' : 'month'} until canceled.</p>
          <ul className="my-6 border-t border-surface-border pt-4 flex-1 space-y-3">{features[key].map(item => <li className="flex gap-2 text-sm text-slate-300" key={item}><CheckCircle className="h-4 w-4 shrink-0 text-electric-blue-light mt-0.5" />{item}</li>)}</ul>
          <Link className="btn-secondary justify-center" href={checkoutPath(key, billing)}>View {billing} plan details</Link>
        </article>
      })}
    </div>
    <article className="card mt-6 flex flex-wrap items-center justify-between gap-6 text-left">
      <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">One-time option</p><h3 className="mt-2 text-xl font-bold text-white">Standalone Pitching Assessment</h3><p className="mt-3 text-sm text-slate-300">Get a mechanics review, a written report and drills to take to practice. One payment. No subscription or ongoing updates.</p><p className="mt-2 text-xs text-slate-400">Starting a Throwing or Complete plan? Your assessment is $49.99. The standalone assessment does not include Pitch Tracking.</p></div>
      <div><p className="text-4xl font-black text-white">{money(STANDALONE_ASSESSMENT_CENTS)}</p><p className="mt-1 text-sm text-slate-400">one time · no recurring charge</p><Link className="btn-secondary mt-4" href={checkoutPath('assessment')}>View assessment details</Link></div>
    </article>
    <p className="mt-5 text-sm text-slate-400">Prices are in USD. Pitch Tracking is in testing. Check plan details for availability. <Link className="text-electric-blue-light underline" href="/billing">Cancellation and refunds</Link>.</p>
  </div>
}

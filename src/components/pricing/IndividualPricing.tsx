'use client'

import { useState } from 'react'
import { checkoutPath } from '@/lib/individual-checkout'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { INDIVIDUAL_PLANS, STANDALONE_ASSESSMENT_CENTS, money, type Billing } from '@/lib/pricing-catalog'

const features = {
  throwing: ['Tailored throwing plan', 'Staff-reviewed mechanics feedback', 'Drills and progress tracking'],
  complete: ['Initial tailored assessment', 'Seasonal lifts, mobility and a workout log', 'Pitch Tracking included when released'],
  metrics: ['Track your pitches with your iPhone', 'Pitch maps, tracers and history in development', 'No assessment required'],
}
export function IndividualPricing() {
  const [billing, setBilling] = useState<Billing>('monthly')
  return <div>
    <div className="mb-8 flex flex-wrap justify-center gap-3" role="group" aria-label="Individual billing">
      {(['monthly','annual'] as const).map(option => <button key={option} type="button" aria-pressed={billing === option} onClick={() => setBilling(option)} className={billing === option ? 'btn-primary' : 'btn-secondary'}>{option === 'monthly' ? 'Monthly' : 'Annual · better value'}</button>)}
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      {(Object.keys(INDIVIDUAL_PLANS) as (keyof typeof INDIVIDUAL_PLANS)[]).map(key => {
        const plan = INDIVIDUAL_PLANS[key]
        return <article key={key} className={`card flex flex-col text-left ${key === 'complete' ? '!border-amber-400/80 ring-1 ring-amber-400/30 shadow-[0_0_28px_rgba(251,191,36,0.10)]' : ''}`}>
          {key === 'complete' && <p className="mb-4 inline-flex w-fit rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">Best value · Our pick</p>}
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">{key === 'metrics' ? 'Beta in development' : key === 'complete' ? 'All-in-one development' : 'Throwing focus'}</p>
          <h3 className="mt-3 text-xl font-bold text-white">{plan.name}</h3>
          <p className="mt-5 text-4xl font-black text-white">{money(billing === 'annual' ? plan.annual : plan.firstMonth)}</p>
          <p className="mt-2 text-sm text-slate-300">{billing === 'annual' ? 'per year, paid upfront' : `first month, then ${money(plan.monthly)}/month`}</p>
          <p className="mt-2 text-sm text-slate-400">{plan.assessment ? `+ ${money(plan.assessment)} initial assessment` : 'No assessment fee'}</p>
          <ul className="my-6 flex-1 space-y-3">{features[key].map(item => <li className="flex gap-2 text-sm text-slate-300" key={item}><CheckCircle className="h-4 w-4 shrink-0 text-electric-blue-light mt-0.5" />{item}</li>)}</ul>
          <Link className="btn-primary justify-center" href={checkoutPath(key, billing)}>Subscribe {billing === 'annual' ? 'annually' : 'monthly'}</Link>
        </article>
      })}
    </div>
    <article className="card mt-6 flex flex-wrap items-center justify-between gap-6 text-left">
      <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">One-time option</p><h3 className="mt-2 text-xl font-bold text-white">Standalone Pitching Assessment</h3><p className="mt-3 text-sm text-slate-300">Get a mechanics review, a written report and drills to take to practice. One payment. No subscription or ongoing updates.</p><p className="mt-2 text-xs text-slate-400">Starting a Throwing or Complete plan? Your assessment is $49.99. The standalone assessment does not include Pitch Tracking.</p></div>
      <div><p className="text-4xl font-black text-white">{money(STANDALONE_ASSESSMENT_CENTS)}</p><p className="mt-1 text-sm text-slate-400">one time · no recurring charge</p><Link className="btn-secondary mt-4" href={checkoutPath('assessment')}>Buy assessment</Link></div>
    </article>
    <p className="mt-5 text-sm text-slate-400">Individual plans use online checkout. Pitch Tracking subscriptions open when testing is complete. Annual pricing replaces the first-month offer. Prices are USD before tax.</p>
  </div>
}

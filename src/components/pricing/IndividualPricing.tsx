'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { INDIVIDUAL_PLANS, STANDALONE_ASSESSMENT_CENTS, money, type Billing } from '@/lib/program-pricing'

const features = {
  throwing: ['Tailored throwing plan', 'Staff-reviewed mechanics feedback', 'Drills and progress tracking'],
  complete: ['Initial tailored assessment', 'Throwing, lifting and mobility plans', 'Pitch Tracking included when released'],
  metrics: ['Standalone phone-tracking membership', 'Planned pitch maps, tracers and session history', 'No paid training assessment'],
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
        return <article key={key} className="card flex flex-col text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">{key === 'metrics' ? 'Beta in development' : key === 'complete' ? 'All-in-one development' : 'Throwing focus'}</p>
          <h3 className="mt-3 text-xl font-bold text-white">{plan.name}</h3>
          <p className="mt-5 text-4xl font-black text-white">{money(billing === 'annual' ? plan.annual : plan.firstMonth)}</p>
          <p className="mt-2 text-sm text-slate-300">{billing === 'annual' ? 'per year, paid upfront' : `first month, then ${money(plan.monthly)}/month`}</p>
          <p className="mt-2 text-sm text-slate-400">{plan.assessment ? `+ ${money(plan.assessment)} initial assessment` : 'No assessment fee'}</p>
          <ul className="my-6 flex-1 space-y-3">{features[key].map(item => <li className="flex gap-2 text-sm text-slate-300" key={item}><CheckCircle className="h-4 w-4 shrink-0 text-electric-blue-light mt-0.5" />{item}</li>)}</ul>
          <Link className="btn-primary justify-center" href={key === 'metrics' ? '/pitch-metrics' : '/contact'}>{key === 'metrics' ? 'Explore Pitch Tracking' : 'Request enrollment'}</Link>
        </article>
      })}
    </div>
    <article className="card mt-6 flex flex-wrap items-center justify-between gap-6 text-left">
      <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">One-time option</p><h3 className="mt-2 text-xl font-bold text-white">Standalone Pitching Assessment</h3><p className="mt-3 text-sm text-slate-300">A staff-reviewed mechanics assessment, written report, development priorities and an initial throwing plan. No subscription or ongoing plan updates.</p><p className="mt-2 text-xs text-slate-400">The assessment bundled with a Throwing or Complete subscription is $49.99. Standalone assessment does not include Pitch Tracking access.</p></div>
      <div><p className="text-4xl font-black text-white">{money(STANDALONE_ASSESSMENT_CENTS)}</p><p className="mt-1 text-sm text-slate-400">one time · no recurring charge</p><Link className="btn-secondary mt-4" href="/contact">Request an assessment</Link></div>
    </article>
    <p className="mt-5 text-sm text-slate-400">New-plan enrollment is by request while billing is being connected. Pitch Tracking is in development, not a validated live tracking service. Annual pricing replaces the first-month offer. USD, before applicable tax.</p>
  </div>
}

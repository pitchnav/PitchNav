'use client'

import { useState, type FocusEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { checkoutPath } from '@/lib/individual-checkout'
import { INDIVIDUAL_PLANS, STANDALONE_ASSESSMENT_CENTS, money, type Billing } from '@/lib/pricing-catalog'
import styles from './IndividualPricing.module.css'

type Inclusion = 'throwing' | 'assessment' | 'metrics'

const features = {
  throwing: ['Personal throwing calendar', 'Mechanics drills', 'One brief monthly coach check-in'],
  metrics: ['iPhone pitch recording', 'Pitch maps and tracers', 'Pitch history'],
}
const completeFeatures: { source?: Inclusion; text: string }[] = [
  { source: 'throwing', text: 'Everything in Throwing Development' },
  { source: 'assessment', text: 'One full pitching assessment' },
  { text: 'Strength and mobility plans' },
  { source: 'metrics', text: 'All Pitch Tracking features at launch' },
]

export function IndividualPricing() {
  const [billing, setBilling] = useState<Billing>('monthly')
  const [hovered, setHovered] = useState<Inclusion | null>(null)
  const [focused, setFocused] = useState<Inclusion | null>(null)
  const active = hovered ?? focused
  const unit = billing === 'annual' ? 'year' : 'month'

  function clearFocus(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(null)
  }

  function sourceEvents(source: Inclusion) {
    return {
      onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') setHovered(source)
      },
      onPointerLeave: () => setHovered(null),
      onFocusCapture: () => setFocused(source),
      onBlurCapture: clearFocus,
    }
  }

  function compare(source: Inclusion) {
    return <a className={styles.compare} href={`#complete-includes-${source}`}
      onClick={() => { setHovered(null); document.getElementById(`complete-includes-${source}`)?.focus({ preventScroll: true }) }}>
      See in Complete <ArrowRight size={15} aria-hidden="true" />
    </a>
  }

  return <div>
    <div className="mb-6 inline-flex gap-1 rounded-md border border-surface-border bg-brand-band p-1" role="group" aria-label="Individual billing">
      {(['monthly', 'annual'] as const).map(option => <button key={option} type="button" aria-pressed={billing === option}
        onClick={() => setBilling(option)} className="min-h-11 rounded px-5 text-sm font-semibold text-brand-muted aria-pressed:bg-brand-blue aria-pressed:text-brand-ink">
        {option === 'monthly' ? 'Monthly' : 'Annual'}
      </button>)}
    </div>
    <div className={styles.plans}>
      {(Object.keys(INDIVIDUAL_PLANS) as (keyof typeof INDIVIDUAL_PLANS)[]).map(key => {
        const plan = INDIVIDUAL_PLANS[key]
        const complete = key === 'complete'
        const price = billing === 'annual' ? plan.annual : plan.firstMonth
        const introductory = billing === 'monthly' && price < plan.monthly
        return <article key={key} className={styles.plan} data-recommended={complete} {...(key !== 'complete' ? sourceEvents(key) : {})}>
          {complete && <span className={styles.flag}>Best value</span>}
          <h3>{plan.name}</h3>
          <p className={styles.price}><strong className="price-figure">{money(price).replace(/\.00$/, '')}</strong> <span>/ {unit}</span></p>
          <p className={styles.terms}>{introductory ? <><s>{money(plan.monthly)}</s> · {money(price)} for the first month. Renews at {money(plan.monthly)}/month.</>
            : <>Billed {billing === 'annual' ? 'annually' : 'monthly'} until canceled.</>}</p>
          {key === 'metrics' && <p className={styles.status}>In development</p>}
          <ul className={styles.features}>
            {complete ? completeFeatures.map(({ source, text }) => <li key={text}
              id={source && `complete-includes-${source}`} tabIndex={source ? -1 : undefined}
              data-highlighted={Boolean(source && active === source)}
              onFocus={source ? () => setFocused(source) : undefined} onBlur={clearFocus}>
              <Check aria-hidden="true" size={17} />{text}
            </li>) : features[key].map(text => <li key={text}><Check aria-hidden="true" size={17} />{text}</li>)}
          </ul>
          <div className={styles.actions}>
            <Link className={complete ? 'btn-action' : 'paper-link'} href={checkoutPath(key, billing)}>View plan details <span className="sr-only">for {plan.name}, {billing}</span><ArrowRight size={16} aria-hidden="true" /></Link>
            {key !== 'complete' && compare(key)}
          </div>
        </article>
      })}
    </div>
    <article className={styles.assessment} {...sourceEvents('assessment')}>
      <div><h3>Standalone Pitching Assessment</h3><p>A mechanics review, a written report and drills for your next session. One payment.</p>
        {compare('assessment')}</div>
      <div><p className={styles.price}><strong className="price-figure">{money(STANDALONE_ASSESSMENT_CENTS).replace(/\.00$/, '')}</strong> <span>one time</span></p>
        <Link className="btn-secondary" href={checkoutPath('assessment')}>View assessment details</Link></div>
    </article>
    <p className="mt-5 text-sm text-slate-400">Prices in USD before tax. <Link className="text-electric-blue-light underline" href="/billing">Cancellation and refunds</Link>.</p>
  </div>
}

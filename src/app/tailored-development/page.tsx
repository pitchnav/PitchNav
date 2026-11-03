import { checkoutPath } from '@/lib/individual-checkout'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Target, Dumbbell } from 'lucide-react'
import { TrainingPlanPreview } from '@/components/home/TrainingPlanPreview'
import { INDIVIDUAL_PLANS, STANDALONE_ASSESSMENT_CENTS, money } from '@/lib/pricing-catalog'

export const metadata: Metadata = {
  title: 'Tailored Development',
  description: 'Mechanics feedback, throwing plans, lifting and mobility built around your game. Explore Pitch Nav development plans.',
}

export default function TailoredDevelopmentPage() {
  return <main className="min-h-screen bg-navy-950 pt-28 pb-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <section className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Pitch Nav · Tailored Development</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">A plan built<br />for your game.</h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300">Tell us when you play school, summer or fall ball. Send a pitch from the side. Your coach uses that delivery and your team dates to plan what comes next.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/pricing" className="btn-primary">Choose your plan <ArrowRight className="h-4 w-4" /></Link><Link href="/sample-report" className="btn-secondary">See a sample assessment</Link></div>
          <div className="mt-10 space-y-6">
            {[
              { icon: Target, title: 'Start with your delivery', text: 'Your assessment breaks down what you do well, what needs work and the drills to take into your next session.' },
              { icon: CalendarDays, title: 'Work around your season', text: 'Your last team day and first practice tell us how much offseason you have. Each full lifting cycle builds up for three weeks and eases back for three. In season, enter your pen and game days each week.' },
              { icon: Dumbbell, title: 'Build beyond the mound', text: 'Lift Monday, Wednesday and Friday in the offseason. Each workout pairs power work, an upper- and lower-body strength superset, and work from your assessment. In season, up to two lifts fit around the mound days you enter.' },
            ].map(({icon: Icon,title,text})=><div key={title} className="flex gap-4"><Icon className="mt-1 h-5 w-5 shrink-0 text-electric-blue-light" /><div><h2 className="font-bold text-white">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p></div></div>)}
          </div>
        </div>
        <div className="card border-electric-blue/25"><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Inside your plan · examples</p><h2 className="mt-3 text-2xl font-black text-white">Know what to work on.</h2><TrainingPlanPreview /></div>
      </section>
      <section className="mt-20" aria-labelledby="development-plans">
        <h2 id="development-plans" className="text-3xl font-black text-white">Choose your training.</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {(['throwing', 'complete'] as const).map(key=>{
            const plan = INDIVIDUAL_PLANS[key]
            return <article key={key} className={`card ${key === 'complete' ? '!border-amber-400/80 ring-1 ring-amber-400/30 shadow-[0_0_28px_rgba(251,191,36,0.10)]' : ''}`}>{key === 'complete' && <p className="mb-4 inline-flex rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">Best value · Our pick</p>}<h3 className="text-2xl font-bold text-white">{plan.name}</h3><p className="mt-3 text-slate-400">{key === 'throwing' ? 'Mechanics feedback, throwing plans and drills for your next step.' : 'Throwing, lifting and mobility, plus Pitch Tracking when it launches.'}</p><p className="mt-6 text-3xl font-black text-white">{money(plan.firstMonth)}<span className="text-sm font-normal text-slate-400"> first month</span></p><p className="mt-2 text-sm text-slate-300">Then {money(plan.monthly)}/month · {money(plan.assessment)} initial assessment</p><p className="mt-4 text-sm text-slate-300">Or {money(plan.annual)}/year, paid upfront, plus your initial assessment.</p><div className="mt-6 flex flex-wrap gap-3"><Link href={checkoutPath(key, 'monthly')} className="btn-primary">Subscribe monthly</Link><Link href={checkoutPath(key, 'annual')} className="btn-secondary">Subscribe annually · save</Link></div></article>
          })}
        </div>
        <p className="mt-5 text-sm text-slate-400">Annual billing replaces the first-month offer. Prices are USD before tax.</p>
        <div className="mt-8 card"><h3 className="text-xl font-bold text-white">Just want an assessment?</h3><p className="mt-3 text-slate-400">Get a mechanics review, written report and drills to take to practice for {money(STANDALONE_ASSESSMENT_CENTS)}. One payment, no subscription or ongoing updates.</p><Link href={checkoutPath('assessment')} className="mt-4 inline-flex text-sm font-semibold text-electric-blue-light">Buy assessment <ArrowRight className="ml-2 h-4 w-4" /></Link></div>
      </section>
      <section className="mt-12 card"><h2 className="text-2xl font-bold text-white">Take your plan into the bullpen.</h2><p className="mt-4 max-w-3xl leading-relaxed text-slate-400">We’re connecting coach-reviewed pitch counts, pitch mixes and effort targets with the tracker. Follow your progress during the pen, then review where you hit your targets and where you missed. This connection is still in development.</p><p className="mt-4 text-sm text-slate-400">Guided training belongs to development plans. Standalone Pitch Tracking is for recording and reviewing your pitches.</p><Link href="/pitch-metrics" className="mt-5 inline-flex font-semibold text-electric-blue-light">Explore Pitch Tracking <ArrowRight className="ml-2 h-4 w-4" /></Link></section>
    </div>
  </main>
}

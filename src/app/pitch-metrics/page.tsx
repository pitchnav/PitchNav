import { checkoutPath } from '@/lib/individual-checkout'
import { PitchTrackingHUD } from '@/components/pricing/PitchTrackingHUD'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Camera, Target, Play, BarChart3, ArrowRight, Database } from 'lucide-react'
import { INDIVIDUAL_PLANS, money } from '@/lib/pricing-catalog'

export const metadata: Metadata = {
  title: 'Pitch Tracking System',
  description: 'Meet Pitch Nav phone-based pitch tracking. Explore planned metrics, replay and program pricing. Beta in development; accuracy validation is ongoing.',
}
export default function PitchMetricsPage() {
  const price = INDIVIDUAL_PLANS.metrics
  return <div className="min-h-screen bg-navy-950 pt-28 pb-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <section className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Pitch Nav Tracking · Single-camera pitching system</p>
          <h1 className="mt-5 page-title text-white">Your bullpen.<br />Tracked with your iPhone.</h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">We’re testing a way to film from behind the mound and see where each pitch crossed, how fast it traveled and how it got there.</p>
          <p className="mt-4 text-sm text-slate-400">Pitch Tracking is in testing and is not open to the public yet. We’re checking accuracy before launch.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="btn-action" href={checkoutPath('metrics', 'monthly')}>View monthly plan details <ArrowRight className="h-4 w-4" /></Link><Link className="btn-secondary" href="/pricing#teams">For teams &amp; programs</Link></div>
        </div>
        <div className="card border-electric-blue/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-electric-blue-light">Standalone launch pricing</p>
          <p className="price-figure mt-5 text-5xl text-white">{money(price.firstMonth)}</p><p className="mt-2 text-slate-300">first month, then {money(price.monthly)}/month</p>
          <div className="my-6 border-t border-surface-border" />
          <p className="price-figure text-2xl text-white">{money(price.annual)}<span className="text-sm font-normal text-slate-400"> / year, paid upfront</span></p>
          <p className="mt-4 text-sm text-slate-400">No assessment fee. Pay yearly or take the first-month offer. Prices are USD before tax. Subscriptions open when tracking is ready; no payment is taken during testing.</p>
          <Link className="btn-secondary mt-5" href={checkoutPath('metrics', 'annual')}>View annual plan details</Link><p className="mt-6 text-sm text-slate-300">Included with Complete Development when it launches. No extra tracking subscription.</p>
        </div>
      </section>
      <section className="mt-20 grid items-center gap-12 lg:grid-cols-2" aria-labelledby="tracking-hud-title">
        <div><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">The tracking interface</p><h2 id="tracking-hud-title" className="mt-4 text-3xl font-black text-white sm:text-4xl">Numbers first.<br />Replay when you’re ready.</h2><p className="mt-5 text-lg leading-relaxed text-slate-300">Throw your pitch, check the numbers, and get ready for the next one. The sample pitch map shows both strikes and misses.</p><p className="mt-4 text-sm leading-relaxed text-slate-400">The sample replay illustrates a planned ball tracer. Camera angle, calibration and visibility affect which estimates a recording can support.</p></div>
        <PitchTrackingHUD />
      </section>
      <section className="mt-20 card border-electric-blue/25" aria-labelledby="session-library-title">
        <Database className="h-7 w-7 text-electric-blue-light" />
        <h2 id="session-library-title" className="mt-4 text-3xl font-black text-white">A home for every session.</h2>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">The planned session library would group bullpen data by pitcher and date so you could compare sessions.</p>
        <div className="mt-6"><div><h3 className="font-bold text-white">Phone sync · coming later</h3><p className="mt-2 text-sm text-slate-400">We’re building phone-to-website sync so your sessions stay together. Automatic uploads and video storage are not ready yet.</p></div></div>
      </section>
      <section className="mt-20">
        <h2 className="text-3xl font-black text-white">Built for Bullpen Work</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[
            { icon: Camera, title: 'Calibrate once per setup', text: 'Set your phone, focus on the plate and calibrate before throwing. Set up again if you move the phone or change recording modes.' },
            { icon: Target, title: 'Metrics and pitch locations', text: 'The goal is to catch each throw and show its velo and location. If we cannot get a reliable read, we leave the number blank.' },
            { icon: Play, title: 'Replay with a tracer', text: 'Watch the throw back and follow the ball from release.' },
            { icon: BarChart3, title: 'Session history', text: 'Save your bullpens and compare sessions. Phone-to-website sync is still in development.' },
          ].map(({icon:Icon,title,text})=><article key={title} className="card"><Icon className="h-6 w-6 text-electric-blue-light" /><h3 className="mt-4 text-lg font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-400">{text}</p></article>)}
        </div>
        <p className="mt-6 text-sm text-slate-400">Spin, movement and Stuff+ are not ready yet. We’ll add them only when testing supports the results.</p>
      </section>
      <section className="mt-16 card flex flex-wrap items-center justify-between gap-6"><div><h2 className="text-2xl font-bold text-white">Put Your Bullpen Work to Use</h2><p className="mt-2 text-slate-400">Want a plan for your next pen? Development members get a throwing calendar. Complete adds lifting around outings and includes Pitch Tracking at launch.</p></div><Link className="btn-primary" href="/pricing">Compare memberships</Link></section>
    </div>
  </div>
}

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
  return <main className="min-h-screen bg-navy-950 pt-28 pb-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <section className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Pitch Nav Tracking · Single-camera pitching system</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">Your bullpen.<br />Tracked with your iPhone.</h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">Set your iPhone behind the mound. Get your velo and pitch locations, then watch the throw back with a ball tracer.</p>
          <p className="mt-4 text-sm text-slate-400">Pitch Tracking is in testing and is not open to the public yet. We’re checking accuracy before launch.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary" href="/contact">Ask about beta access <ArrowRight className="h-4 w-4" /></Link><Link className="btn-secondary" href="/pricing#teams">For teams &amp; programs</Link></div>
        </div>
        <div className="card border-electric-blue/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-electric-blue-light">Standalone launch pricing</p>
          <p className="mt-5 text-5xl font-black text-white">{money(price.firstMonth)}</p><p className="mt-2 text-slate-300">first month, then {money(price.monthly)}/month</p>
          <div className="my-6 border-t border-surface-border" />
          <p className="text-2xl font-bold text-white">{money(price.annual)}<span className="text-sm font-normal text-slate-400"> / year, paid upfront</span></p>
          <p className="mt-4 text-sm text-slate-400">No assessment fee. Pay yearly or take the first-month offer. Prices are USD before tax. Contact us about access; this page does not take payment.</p>
          <p className="mt-6 text-sm text-slate-300">Included with Complete Development when it launches. No extra tracking subscription.</p>
        </div>
      </section>
      <section className="mt-20 grid items-center gap-12 lg:grid-cols-2" aria-labelledby="tracking-hud-title">
        <div><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">The tracking interface</p><h2 id="tracking-hud-title" className="mt-4 text-3xl font-black text-white sm:text-4xl">Numbers first.<br />Replay when you’re ready.</h2><p className="mt-5 text-lg leading-relaxed text-slate-300">Throw your pitch, check the numbers, and get ready for the next one. Your pitch map keeps the strikes and the misses.</p><p className="mt-4 text-sm leading-relaxed text-slate-400">Watch your pitch with a ball tracer after processing. We’ll only show metrics the recording can support.</p></div>
        <PitchTrackingHUD />
      </section>
      <section className="mt-20 card border-electric-blue/25" aria-labelledby="session-library-title">
        <Database className="h-7 w-7 text-electric-blue-light" />
        <h2 id="session-library-title" className="mt-4 text-3xl font-black text-white">A home for every session.</h2>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">Keep your bullpen data organized by pitcher and date. Pull up past sessions and see how your pitches have changed.</p>
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
      <section className="mt-16 card flex flex-wrap items-center justify-between gap-6"><div><h2 className="text-2xl font-bold text-white">Put Your Bullpen Work to Use</h2><p className="mt-2 text-slate-400">Get throwing, lifting and mobility plans, plus Pitch Tracking when it launches.</p></div><Link className="btn-primary" href="/pricing">Compare memberships</Link></section>
    </div>
  </main>
}

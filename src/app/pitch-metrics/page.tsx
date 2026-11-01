import { PitchTrackingHUD } from '@/components/pricing/PitchTrackingHUD'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Camera, Target, Play, BarChart3, ArrowRight, Database } from 'lucide-react'
import { INDIVIDUAL_PLANS, money } from '@/lib/program-pricing'

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
          <p className="mt-6 max-w-xl text-lg text-slate-300">A dedicated pitch tracking system for velocity, pitch location and ball-flight review. Designed for one fixed iPhone camera, with numbers first and video review afterward.</p>
          <p className="mt-4 text-sm text-slate-400">We are testing capture, calibration and velocity accuracy. Live tracking is not publicly available yet, and no radar-equivalent accuracy claim is being made.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary" href="/contact">Ask about beta access <ArrowRight className="h-4 w-4" /></Link><Link className="btn-secondary" href="/pricing#teams">For teams &amp; programs</Link></div>
        </div>
        <div className="card border-electric-blue/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-electric-blue-light">Standalone launch pricing</p>
          <p className="mt-5 text-5xl font-black text-white">{money(price.firstMonth)}</p><p className="mt-2 text-slate-300">first month, then {money(price.monthly)}/month</p>
          <div className="my-6 border-t border-surface-border" />
          <p className="text-2xl font-bold text-white">{money(price.annual)}<span className="text-sm font-normal text-slate-400"> / year, paid upfront</span></p>
          <p className="mt-4 text-sm text-slate-400">No assessment fee. Annual pricing replaces the first-month offer. USD before tax. Enrollment by request; no payment is collected here.</p>
          <p className="mt-6 text-sm text-slate-300">Also included with Complete Development when released—no separate metrics subscription needed.</p>
        </div>
      </section>
      <section className="mt-20 grid items-center gap-12 lg:grid-cols-2" aria-labelledby="tracking-hud-title">
        <div><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">The tracking interface</p><h2 id="tracking-hud-title" className="mt-4 text-3xl font-black text-white sm:text-4xl">Numbers first.<br />Replay when you’re ready.</h2><p className="mt-5 text-lg leading-relaxed text-slate-300">Keep your session focused on the pitch. The planned portrait HUD puts velocity and the pitch map up front, with each location staying on the zone—even when it misses outside.</p><p className="mt-4 text-sm leading-relaxed text-slate-400">After processing, review your video with a ball tracer. Additional metrics appear only when supported by the recording and validated analysis.</p></div>
        <PitchTrackingHUD />
      </section>
      <section className="mt-20 card border-electric-blue/25" aria-labelledby="session-library-title">
        <Database className="h-7 w-7 text-electric-blue-light" />
        <h2 id="session-library-title" className="mt-4 text-3xl font-black text-white">A home for every session.</h2>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">Your Pitch Nav data library organizes saved sessions and pitch measurements by athlete and date, with the measurement source kept alongside the numbers.</p>
        <div className="mt-6"><div><h3 className="font-bold text-white">Phone-session sync · planned</h3><p className="mt-2 text-sm text-slate-400">We’re building automatic session and result sync between the capture app and your website account. Phone tracking is not connected to the data library yet; video storage and sync are still in development.</p></div></div>
      </section>
      <section className="mt-20">
        <h2 className="text-3xl font-black text-white">The experience we’re building</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[
            { icon: Camera, title: 'Calibrate once per setup', text: 'Position the camera, set focus and mark the plate before your session. Changing camera position or capture mode requires new calibration.' },
            { icon: Target, title: 'Metrics and pitch locations', text: 'The goal: automatic pitch detection, velocity estimates and persistent zone locations. Unreliable results stay unavailable rather than becoming misleading numbers.' },
            { icon: Play, title: 'Replay with a tracer', text: 'Review the recorded pitch after processing, with a tracer derived from the tracked ball path.' },
            { icon: BarChart3, title: 'Session history', text: 'Planned app and website sync brings your pitches and progress together. Complete Development connects that history to tailored training.' },
          ].map(({icon:Icon,title,text})=><article key={title} className="card"><Icon className="h-6 w-6 text-electric-blue-light" /><h3 className="mt-4 text-lg font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-400">{text}</p></article>)}
        </div>
        <p className="mt-6 text-sm text-slate-400">Spin rate, movement and Stuff+ are not validated features of the current beta. Availability will depend on what testing supports.</p>
      </section>
      <section className="mt-16 card flex flex-wrap items-center justify-between gap-6"><div><h2 className="text-2xl font-bold text-white">Metrics plus a plan to develop.</h2><p className="mt-2 text-slate-400">Complete Development combines throwing, lifting, mobility and future Pitch Tracking access.</p></div><Link className="btn-primary" href="/pricing">Compare memberships</Link></section>
    </div>
  </main>
}

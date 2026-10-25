import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Camera, CheckCircle, Info } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { MOVEMENT_SCREENS } from '@/lib/movement-screens'

export const metadata: Metadata = {
  title: 'Movement Screens',
  description:
    'How to film the Pitch Nav movement screens. Short held positions filmed facing the camera that measure the physical capacity behind your delivery.',
}

// The screen copy is read straight from src/lib/movement-screens.ts — the same
// definitions the measurement code uses. Restating the setup instructions here
// by hand would let the public guide drift away from what is actually measured.
const CORE_SCREENS = MOVEMENT_SCREENS.filter((screen) => screen.core)
const REQUESTABLE_SCREENS = MOVEMENT_SCREENS.filter((screen) => !screen.core)

function ScreenCard({ screen, index }: { screen: (typeof MOVEMENT_SCREENS)[number]; index: number }) {
  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-black text-electric-blue-light">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="text-lg font-bold text-white">{screen.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {screen.bilateral && (
            <span className="rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold text-slate-300">
              Both sides
            </span>
          )}
          <span
            className={
              screen.reliability === 'High'
                ? 'rounded-full bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green'
                : 'rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200'
            }
          >
            {screen.reliability} confidence
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-400">{screen.whyItMatters}</p>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-electric-blue-light">
            <Camera className="h-3.5 w-3.5" /> Phone setup
          </dt>
          <dd className="mt-1 text-slate-300">{screen.cameraSetup}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Starting position</dt>
          <dd className="mt-1 text-slate-300">{screen.position}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">What to do</dt>
          <dd className="mt-1 text-slate-300">{screen.action}</dd>
        </div>
      </dl>

      <p className="mt-4 border-t border-surface-border pt-3 text-xs leading-relaxed text-slate-500">
        {screen.reliabilityNote}
      </p>
    </article>
  )
}

export default function MovementScreensPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Movement Screens</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Short held positions you film facing the camera. They measure the physical capacity behind
            your delivery, so your plan is built on what your body can actually do rather than a guess
            made from pitching footage.
          </p>
        </div>

        <section className="card mb-10 border-electric-blue/30">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-electric-blue-light" />
            <div>
              <h2 className="text-lg font-bold text-white">Why these are filmed separately</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your pitching video shows <strong className="text-white">what</strong> changes in your
                delivery. It cannot reliably show <strong className="text-white">why</strong>. Reading a
                physical limitation off a 90&nbsp;mph blur is guesswork, and that guess would drive your
                entire strength and mobility plan.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                These screens are slow and held, and they move in a plane that faces the camera — the one
                situation where phone video measures a joint angle dependably. Where a screen exists, your
                report says the finding was measured. Where none exists, it says so and names the screen
                that would settle it.
              </p>
            </div>
          </div>
        </section>

        <section className="card mb-10">
          <h2 className="text-lg font-bold text-white">Filming any screen</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              'Whole body in frame, head to feet',
              'Do not zoom in on the limb being measured',
              'Phone steady on the floor, a chair, or a tripod',
              'Normal video mode is fine — these are slow movements',
              'Wear fitted clothing so joints stay visible',
              'Film both sides when the screen says Both sides',
              'Move only as far as you can without pain',
              'One clean attempt is better than a rushed one',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-electric-blue-light" />
                {tip}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs leading-relaxed text-yellow-200">
            Never push into pain to reach a better number. A limited screen result is useful information —
            a painful one tells us nothing and is not worth the risk.
          </p>
        </section>

        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white">The standard set</h2>
            <p className="mt-2 text-sm text-slate-400">
              {CORE_SCREENS.length} screens spanning the kinetic chain, from the ground up. The set is kept
              deliberately short — a long screening session gets rushed, and a rushed screen produces a
              worse number than no screen at all.
            </p>
          </div>
          <div className="grid gap-6">
            {CORE_SCREENS.map((screen, index) => (
              <ScreenCard key={screen.id} screen={screen} index={index} />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white">Screens we may request</h2>
            <p className="mt-2 text-sm text-slate-400">
              Not part of the standard set. Staff may ask for one of these when a specific question comes up
              in your review.
            </p>
          </div>
          <div className="grid gap-6">
            {REQUESTABLE_SCREENS.map((screen, index) => (
              <ScreenCard key={screen.id} screen={screen} index={index} />
            ))}
          </div>
        </section>

        <section className="card mb-10 text-center">
          <h2 className="text-xl font-black text-white">Ready to film your delivery too?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            The pitching video is a separate setup — filmed from your throwing-arm side, perpendicular to
            the pitch.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/camera-setup" className="btn-secondary">
              Pitching camera guide <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/start-analysis" className="btn-primary">
              Start your analysis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <SafetyDisclaimer />
      </div>
    </div>
  )
}

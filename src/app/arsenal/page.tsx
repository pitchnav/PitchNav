import { sampleArsenal } from '@/lib/arsenal-example'
import type { Metadata } from 'next'
import { MovementChart } from '@/components/arsenal/MovementChart'


export const metadata: Metadata = { title: 'Arsenal Analysis', description: 'Explore a sample pitching arsenal and compare velocity and movement by pitch type.' }
export default function ArsenalPreviewPage() {
  return <div className="min-h-screen bg-navy-950 pb-20 pt-28 text-white"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <div><h1 className="page-title text-white">Every pitch has a shape.<br />See how yours fit.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Compare this pitcher’s fastball, slider and changeup. Select a pitch on the chart to see its velocity and movement.</p><div className="mt-8 border-t border-brand-line pt-5"><p className="text-sm font-semibold text-brand-blue">Illustrative right-handed arsenal</p><p className="mt-2 text-sm leading-6 text-slate-400">All numbers and findings in this preview are fictional examples. They are not measurements from a Pitch Nav video assessment.</p></div></div>
      <MovementChart pitches={sampleArsenal} handedness="RHP" />
    </div>
    <div className="mt-10 grid gap-6 border-t border-brand-line pt-6 md:grid-cols-3 md:gap-8">
      <section className="min-w-0"><h2 className="text-lg font-bold">A relationship worth checking</h2><p className="mt-3 text-sm leading-7 text-slate-300">In this example, the changeup is only 5 mph slower than the fastball. Evaluate whether its lower vertical movement and extra arm-side movement create enough separation in practice.</p></section>
      <section className="min-w-0"><h2 className="text-lg font-bold">A shape worth testing</h2><p className="mt-3 text-sm leading-7 text-slate-300">A firmer cutter with a little glove-side movement could offer another option. Compare it with the existing slider before adding it. Command and hitter response decide whether it earns a place.</p></section>
      <section className="min-w-0"><h2 className="text-lg font-bold">Go deeper when you&apos;re ready</h2><p className="mt-3 text-sm leading-7 text-slate-300">Planned pricing is $6.99 for one Full Arsenal Assessment or $35/month for unlimited reports with Pro. Checkout opens after billing launches.</p></section>
    </div>
    <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-400">Horizontal break is shown from the pitcher’s view. Positive values move to the pitcher’s right. Vertical break is measured in inches.</p>
  </div></div>
}

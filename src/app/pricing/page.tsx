import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowRight, HelpCircle } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose $25/month for throwing development or $40/month for throwing, strength, and mobility programming.',
}

const throwingIncluded = [
  { item: 'Open-side video review', note: null },
  { item: 'Six-position mechanics breakdown', note: 'Peak leg lift, hand separation, lead-foot contact, max external rotation, ball release, finish & deceleration' },
  { item: 'Mechanics scorecard', note: '6 categories scored 1–5, Delivery Score out of 30' },
  { item: 'Velocity profile', note: 'Based on athlete-provided readings with source clearly labeled' },
  { item: '3 identified strengths', note: null },
  { item: '3 development priorities', note: null },
  { item: '3 personalized drills', note: 'Sets, reps, coaching cues, and common mistakes for each' },
  { item: 'Eight-week Monday–Sunday development plan', note: 'Daily priorities, drills, recovery, progress checkboxes, and a retest date' },
  { item: 'One new analysis every two weeks', note: 'Compare deliveries and track score, angle, and velocity trends over time' },
  { item: 'Staff approval before release', note: 'Your results are reviewed before appearing in your dashboard' },
  { item: 'Voice-over video analysis', note: 'Your reviewer walks through the report verbally' },
  { item: 'Downloadable PDF report', note: null },
  { item: 'Annotated position images', note: null },
  { item: 'Follow-up analysis option', note: 'Available at a separate discounted rate after your first report' },
]

const performanceExtras = [
  { item: 'Tailored eight-week strength plan', note: 'Conservative lifting recommendations tied to the report’s primary focus' },
  { item: 'Monday–Sunday mobility calendar', note: 'Mobility, recovery, cues, common mistakes, and completion tracking' },
  { item: 'Strength-to-throwing coordination', note: 'Programming designed to complement—not replace—the athlete’s existing throwing and coaching plan' },
]

const faqs = [
  {
    q: 'Is there a money-back guarantee?',
    a: 'If your reviewer determines that your submitted videos are unusable for analysis and replacement videos cannot be obtained, we will issue a full refund. Completed analyses are not eligible for refunds. Contact support@pitchnav.com with any concerns.',
  },
  {
    q: 'What if I need to submit replacement videos?',
    a: 'If your videos do not meet quality standards, your reviewer will notify you and explain what is needed. You can upload replacement videos at no additional charge within 14 days of the request.',
  },
  {
    q: 'What is the difference between the $25 and $40 memberships?',
    a: 'The $25 Throwing Development membership includes the pitching analysis, throwing drills, feedback, and eight-week throwing plan. The $40 Complete Performance membership includes everything in the $25 option plus a tailored eight-week strength and mobility plan.',
  },
  {
    q: 'How much does a follow-up analysis cost?',
    a: 'Follow-up analysis pricing is set by the admin and displayed in your dashboard once your first report is complete. Contact us for current pricing.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Ongoing development—not a one-time report. Submit every two weeks, receive staff-reviewed feedback, follow your daily plan, and measure what changes.
          </p>
        </div>

        {/* Membership options */}
        <div className="mb-16 grid gap-6 lg:grid-cols-2">
          <article className="card relative overflow-hidden flex flex-col">
            <div className="absolute inset-x-0 top-0 h-1 bg-electric-blue" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Throwing Development</p>
            <div className="mt-3 text-5xl font-black text-white">$25<span className="text-base font-medium text-slate-400">/month</span></div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Complete pitching analysis, throwing feedback, personalized drills, and an eight-week throwing plan.</p>
            <div className="my-6 space-y-3 flex-1">
              {throwingIncluded.map(({ item, note }) => <div key={item} className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-electric-blue-light" /><div><p className="text-sm font-medium text-white">{item}</p>{note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}</div></div>)}
            </div>
            <Link href="/start-analysis?plan=throwing" className="btn-primary w-full justify-center py-4">Choose $25 Throwing Plan <ArrowRight className="h-5 w-5" /></Link>
          </article>

          <article className="card relative overflow-hidden flex flex-col border-accent-green/35">
            <div className="absolute inset-x-0 top-0 h-1 bg-accent-green" aria-hidden />
            <span className="absolute right-5 top-5 rounded-full bg-accent-green/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-green">Most complete</span>
            <p className="pr-28 text-xs font-bold uppercase tracking-[0.2em] text-accent-green">Complete Performance</p>
            <div className="mt-3 text-5xl font-black text-white">$40<span className="text-base font-medium text-slate-400">/month</span></div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Everything in Throwing Development, plus a tailored two-month lifting and mobility plan.</p>
            <div className="my-6 space-y-3 flex-1">
              <div className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-green" /><p className="text-sm font-medium text-white">Everything in the $25 membership</p></div>
              {performanceExtras.map(({ item, note }) => <div key={item} className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-green" /><div><p className="text-sm font-medium text-white">{item}</p>{note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}</div></div>)}
            </div>
            <Link href="/start-analysis?plan=performance" className="btn-accent w-full justify-center py-4">Choose $40 Complete Plan <ArrowRight className="h-5 w-5" /></Link>
          </article>
        </div>

        <p className="-mt-10 mb-6 text-center text-xs text-slate-600">Secure checkout powered by Stripe. Both memberships renew monthly and may be cancelled anytime.</p>

        {/*
          Refund guarantee. Deliberately narrow and specific: first report only,
          14 days, full refund. It is a real commitment -- staff must honour it
          without argument -- so it is written as a plain promise rather than
          hedged marketing language. It also gives the honest "no guarantees"
          messaging elsewhere on the site something concrete to sit beside:
          Pitch Nav does not promise velocity, but it does stand behind the work.
        */}
        <div className="mx-auto mb-16 max-w-2xl rounded-xl border border-accent-green/25 bg-accent-green/5 p-5 text-center">
          <p className="text-sm font-semibold text-white">
            If your first report isn&apos;t useful, we&apos;ll refund it.
          </p>
          <p className="mt-1.5 text-sm text-slate-400">
            Full refund on your first analysis within 14 days. No form to fill out — just email us.
          </p>
        </div>

        {/*
          Cost comparison. Rules this table has to keep following:

          1. Every figure is checkable against a named third party. Lab
             assessment pricing is per VISIT, taken from published rates at
             UNO Pitching Lab ($400/pitcher), Premier Baseball KC ($350) and
             MedStar's Orioles Pitching Lab / 5 Tool Sports Science ($500).
             An earlier version of this row said "$5,000+", which is what the
             CAMERA HARDWARE costs -- no parent is deciding between Pitch Nav
             and buying a motion-capture rig, and a reader who knows that
             concludes the whole table is rigged.
          2. Units match. Pitch Nav is shown per REVIEW ($25/mo at one analysis
             every two weeks = ~$12.50), not per month, so it is compared
             like-for-like against a per-hour or per-visit price.
          3. It does not criticise private coaches or facilities. Those are the
             same people team packages get sold to, and plenty of them film
             their own sessions, so "nothing recorded" was both impolitic and
             not reliably true. Pitch Nav sits alongside lessons, not against
             them.
          4. Lead with what the athlete receives, not with being cheapest --
             a table built on price teaches parents to shop on price.

          Driveline is deliberately absent: they do not publish remote coaching
          prices, so any figure would be invented. Re-verify all of these
          before a major campaign; instruction pricing moves and varies by
          region.
        */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">How this fits with what you already do</h2>
          <p className="mb-6 text-sm text-slate-400">
            Typical US pricing for pitching instruction and analysis, for context.
          </p>
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Option</th>
                  <th className="px-4 py-3 font-semibold">What you get</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Typical cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Private lesson</td>
                  <td className="px-4 py-3 text-slate-400">One hour of in-person instruction</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">$50–120 / hour</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Lab assessment</td>
                  <td className="px-4 py-3 text-slate-400">Motion-capture analysis at a facility</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">$350–500 / visit</td>
                </tr>
                <tr className="bg-electric-blue/5">
                  <td className="px-4 py-3 font-bold text-white">Pitch Nav</td>
                  <td className="px-4 py-3 text-slate-300">Frame-by-frame coach review, written report, video breakdown, and an eight-week plan</td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-electric-blue-light">~$12.50 / review</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Pitch Nav isn&apos;t a replacement for your coach. Between lessons, a coach reviews every
            rep you send and you keep the report, the video breakdown, and the plan.
          </p>
        </div>

        {/* Delivery score note */}
        <div className="card mb-12 border-electric-blue/20">
          <div className="flex items-start gap-4">
            <HelpCircle className="h-6 w-6 text-electric-blue-light flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-white mb-2">About the Delivery Score</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The Delivery Score (out of 30) is a coaching tool that tracks your own progress
                over time. It is <strong className="text-white">not</strong> a medical score, a
                laboratory measurement, or a prediction of injury or performance. It&apos;s meant
                only to show your own development over time.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Pricing Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="card">
                <h3 className="text-base font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <SafetyDisclaimer compact />
      </div>
    </div>
  )
}

import Link from 'next/link'
import {
  ArrowRight, Play, CheckCircle, Camera, FileBarChart2, Dumbbell,
  Star, ChevronDown, Shield, Zap, Target, Users, TrendingUp, Award,
  Activity, CalendarDays, Gauge, LayoutDashboard
} from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { createClient } from '@/lib/supabase/server'
import { calculateDeliveryScore } from '@/lib/utils'

// ── Hero ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="flex flex-col lg:flex-row overflow-hidden bg-navy-950" style={{ minHeight: '100vh' }}>

      {/* ── Left panel ── */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-1/2 px-6 sm:px-12 lg:px-16 xl:px-24 pt-28 pb-16 lg:py-0">

        {/* Tag */}
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-electric-blue/30 bg-electric-blue/10 px-4 py-1.5 text-xs font-semibold text-electric-blue-light uppercase tracking-widest mb-8">
          <Zap className="h-3 w-3" />
          Expert-Reviewed Pitching Analysis
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl xl:text-7xl leading-[1.05] uppercase">
          UNDERSTAND<br />
          YOUR DELIVERY.<br />
          <span className="text-electric-blue">BUILD BETTER<br />VELOCITY.</span>
        </h1>

        {/* Subtext */}
        <p className="mt-6 max-w-md text-base text-slate-400 leading-relaxed">
          Expert-reviewed video feedback that shows what&apos;s working, what to improve, and what to work on next.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/start-analysis" className="btn-primary text-base px-8 py-4 uppercase tracking-wide font-bold">
            START MY ANALYSIS
          </Link>
          <Link href="/sample-report" className="btn-secondary text-base px-8 py-4 uppercase tracking-wide font-bold">
            VIEW SAMPLE REPORT
          </Link>
        </div>

        {/* Feature badges */}
        <div className="mt-14 flex flex-wrap gap-6">
          {[
            { icon: <TrendingUp className="h-4 w-4" />, label: 'DATA-DRIVEN', sub: 'Objective insights' },
            { icon: <Target className="h-4 w-4" />, label: 'MECHANICS', sub: 'Deeper understanding' },
            { icon: <Zap className="h-4 w-4" />, label: 'PERFORMANCE', sub: 'Better results' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="text-electric-blue-light">{icon}</div>
              <div>
                <p className="text-xs font-bold text-white tracking-widest">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — hero image ── */}
      <div className="flex w-full flex-col overflow-hidden bg-[#020817] lg:w-1/2 lg:min-h-screen lg:pt-16">
        <div className="border-b border-electric-blue/15 px-6 py-6 sm:px-10 lg:px-12 xl:px-16">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-electric-blue-light">Your delivery, translated</p>
          <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
            <h2 className="max-w-xl text-2xl font-black uppercase text-white sm:text-3xl">See what the reviewer sees.</h2>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">Key positions, video-based estimates, coaching context, and a practical development plan in one report.</p>
          </div>
        </div>

        <div className="relative min-h-[340px] flex-1 sm:min-h-[480px] lg:min-h-0">
          <img
            src="/pitcher-hero-v2.jpg"
            alt="Pitcher in Pitch Nav jersey with an example delivery-analysis breakdown"
            className="absolute inset-0 h-full w-full object-contain object-center"
          />
        </div>

        <div className="grid grid-cols-1 border-t border-electric-blue/15 sm:grid-cols-3">
          {[
            ['HUMAN REVIEWED', 'Coaching context—not automated claims'],
            ['SIX POSITIONS', 'Delivery checkpoints connected to video'],
            ['CLEAR NEXT STEPS', 'Strengths, priorities, drills, and plan'],
          ].map(([title, detail]) => (
            <div key={title} className="border-b border-electric-blue/10 px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <p className="text-xs font-black tracking-widest text-white">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}

// ── How It Works ─────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: <Users className="h-6 w-6" />,
      title: 'Create Your Profile',
      description: 'Tell us about your age, position, playing level, velocity history, and pitching goals.',
    },
    {
      step: '02',
      icon: <Camera className="h-6 w-6" />,
      title: 'Set Up & Film',
      description: 'Follow our guided camera-setup wizard and submit one clear, complete pitch from the throwing-arm side.',
    },
    {
      step: '03',
      icon: <Target className="h-6 w-6" />,
      title: 'Pay & Submit',
      description: 'Complete your secure checkout for the Pitch Nav Development Membership package. Your submission is immediately queued for review.',
    },
    {
      step: '04',
      icon: <FileBarChart2 className="h-6 w-6" />,
      title: 'Receive Your Report',
      description: 'Your expert reviewer analyzes your delivery frame-by-frame and delivers a full report, voice-over video, drills, and an eight-week focus plan.',
    },
  ]

  return (
    <section className="py-24 bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-heading">How It Works</h2>
          <p className="section-subheading">
            Four steps from your phone to your personalized mechanics report.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.step} className="relative">
              {i < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-surface-border to-transparent z-0"
                  aria-hidden
                />
              )}
              <div className="card relative z-10 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 rounded-lg bg-electric-blue/10 p-3 text-electric-blue-light">
                    {step.icon}
                  </div>
                  <span className="text-4xl font-black text-slate-800 leading-none">{step.step}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/how-it-works" className="btn-secondary">
            See Detailed Instructions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── What Is Included ─────────────────────────────────────────

function WhatIsIncluded() {
  const items = [
    'Open-side video review',
    'Six-position mechanics breakdown',
    'Mechanics scorecard (6 categories)',
    'Athlete-provided velocity profile',
    'Three identified strengths',
    'Three development priorities',
    'Three personalized drills with coaching cues',
    'Eight-week focus plan',
    'Voice-over video analysis',
    'Downloadable PDF report',
    'Follow-up analysis option',
  ]

  return (
    <section className="py-24 bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="section-heading">Everything in the Analysis</h2>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">
              Your Pitch Nav Development Membership delivers a thorough, professional breakdown of your
              delivery — designed to give you actionable information, not generic advice.
            </p>
            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent-green flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex gap-4">
              <Link href="/start-analysis" className="btn-primary">
                View Membership Options <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary">
                See Pricing Details
              </Link>
            </div>
          </div>

          {/* Visual card */}
          <div className="card bg-card-gradient">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Memberships</p>
                <p className="text-3xl font-black text-white mt-1">From $25/month</p>
              </div>
              <div className="rounded-lg bg-accent-green/10 px-3 py-1">
                <span className="text-sm font-semibold text-accent-green">Core analysis included</span>
              </div>
            </div>

            {/* Sample scorecard mini */}
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Sample Scorecard</p>
              {[
                { label: 'Direction', score: 4 },
                { label: 'Lower-Half Sequencing', score: 3 },
                { label: 'Upper-Half Timing', score: 4 },
                { label: 'Front-Side Stability', score: 3 },
                { label: 'Posture', score: 5 },
                { label: 'Release Consistency', score: 4 },
              ].map(({ label, score }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-44 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-electric-blue rounded-full"
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white w-6 text-right">{score}/5</span>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-surface-border flex justify-between">
                <span className="text-sm text-slate-400">Delivery Score</span>
                <span className="text-lg font-black text-accent-green">23/30</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              ★ Scores are a coaching tool for tracking your own progress over time — not a
              medical or laboratory score.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Camera Setup Preview ──────────────────────────────────────

function CameraSetupPreview() {
  const angles = [
    {
      name: 'Open-Side View',
      icon: '📹',
      description: 'Film from the pitcher\'s throwing-arm side, perpendicular to the direction of the pitch. Keep the full body visible.',
      tips: ['Camera at chest height', '120–240 fps recommended', 'Full body must be in frame'],
    },
  ]

  return (
    <section className="py-24 bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-heading">Simple Camera Setup</h2>
          <p className="section-subheading">
            No special equipment needed. Our guided wizard walks you through exactly where to place
            your phone before you record.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {angles.map((angle) => (
            <div key={angle.name} className="card">
              <div className="text-4xl mb-4">{angle.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{angle.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{angle.description}</p>
              <ul className="space-y-2">
                {angle.tips.map((tip) => (
                  <li key={tip} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-electric-blue-light flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/camera-setup" className="btn-secondary">
            View Full Camera Guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Why Pitch Nav ────────────────────────────────────────────

function WhyPitchNav() {
  const reasons = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'No Hype. No Guarantees.',
      description: 'We provide honest mechanical feedback — not velocity promises. Every report clearly labels athlete-provided data and reviewer estimates.',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'Track Your Development',
      description: 'Your Delivery Score is designed to track changes in the same athlete over time. Submit follow-up analyses to measure your progress.',
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: 'From Your Phone',
      description: 'No lab required. Most smartphones can record at 120–240 fps — enough for a quality frame-by-frame review of your mechanics.',
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: 'Expert Reviewers',
      description: 'Every analysis is completed by a human reviewer — an experienced pitching coach who evaluates your delivery manually, frame by frame.',
    },
  ]

  return (
    <section className="py-24 bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-heading">Why Pitch Nav</h2>
          <p className="section-subheading">
            Built with transparency, safety, and athlete development as the priority.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((reason) => (
            <div key={reason.title} className="card text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-xl bg-electric-blue/10 p-4 text-electric-blue-light">
                  {reason.icon}
                </div>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{reason.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing Section ───────────────────────────────────────────

function PricingSection() {
  const common = [
    'Staff-reviewed open-side analysis',
    'Six-position mechanics breakdown',
    'Mechanics scorecard and velocity context',
    'Three personalized throwing drills',
    'Eight-week throwing development plan',
    'One analysis every two weeks',
  ]

  return (
    <section className="py-24 bg-navy-900" id="pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="section-heading">Choose the Support You Need</h2>
        <p className="section-subheading">Start with throwing development, or add tailored strength and mobility programming.</p>

        <div className="mt-12 grid gap-6 text-left lg:grid-cols-2">
          <article className="card relative overflow-hidden flex flex-col">
            <div className="absolute inset-x-0 top-0 h-1 bg-electric-blue" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Throwing Development</p>
            <p className="mt-3 text-4xl font-black text-white">$25<span className="text-base font-medium text-slate-400">/month</span></p>
            <p className="mt-3 text-sm text-slate-400">Pitching mechanics, feedback, drills, and your complete throwing roadmap.</p>
            <div className="my-6 flex-1 space-y-3">{common.map((item) => <div key={item} className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 shrink-0 text-electric-blue-light" /><span className="text-sm text-slate-300">{item}</span></div>)}</div>
            <Link href="/start-analysis?plan=throwing" className="btn-primary w-full justify-center py-4">Choose $25 Plan <ArrowRight className="h-5 w-5" /></Link>
          </article>

          <article className="card relative overflow-hidden flex flex-col border-accent-green/35">
            <div className="absolute inset-x-0 top-0 h-1 bg-accent-green" aria-hidden />
            <span className="absolute right-5 top-5 rounded-full bg-accent-green/15 px-3 py-1 text-[10px] font-bold uppercase text-accent-green">Most complete</span>
            <p className="pr-28 text-xs font-bold uppercase tracking-[0.2em] text-accent-green">Complete Performance</p>
            <p className="mt-3 text-4xl font-black text-white">$40<span className="text-base font-medium text-slate-400">/month</span></p>
            <p className="mt-3 text-sm text-slate-400">Everything in Throwing Development, plus a tailored two-month strength and mobility plan.</p>
            <div className="my-6 flex-1 space-y-3">
              <div className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 shrink-0 text-accent-green" /><span className="text-sm text-slate-300">Everything in the $25 plan</span></div>
              {['Eight-week strength plan','Monday–Sunday mobility calendar','Lifting cues, recovery guidance, and tracking'].map((item) => <div key={item} className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 shrink-0 text-accent-green" /><span className="text-sm text-slate-300">{item}</span></div>)}
            </div>
            <Link href="/start-analysis?plan=performance" className="btn-accent w-full justify-center py-4">Choose $40 Plan <ArrowRight className="h-5 w-5" /></Link>
          </article>
        </div>

        <p className="mt-6 text-xs text-slate-600">Monthly memberships. Secure payment powered by Stripe.</p>
      </div>
    </section>
  )
}

// ── Testimonials (Placeholder) ────────────────────────────────

function Testimonials() {
  const testimonials = [
    {
      quote: 'PLACEHOLDER — Replace this testimonial with a real athlete review before launch.',
      name: 'Athlete Name',
      detail: 'High School Pitcher — Sample State',
      isPlaceholder: true,
    },
    {
      quote: 'PLACEHOLDER — Replace this testimonial with a real parent or coach review before launch.',
      name: 'Parent / Coach Name',
      detail: 'Travel Ball Parent — Sample City',
      isPlaceholder: true,
    },
    {
      quote: 'PLACEHOLDER — Replace this testimonial with a real athlete review before launch.',
      name: 'College Pitcher Name',
      detail: 'College Division — Sample University',
      isPlaceholder: true,
    },
  ]

  return (
    <section className="py-24 bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h2 className="section-heading">What Athletes Are Saying</h2>
        </div>
        <p className="text-center text-sm text-yellow-400/80 mb-12 border border-yellow-500/20 bg-yellow-500/5 rounded-lg py-2 px-4 mx-auto max-w-lg">
          ⚠️ PLACEHOLDER — These testimonials are sample content and must be replaced with real
          reviews before launch.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="card opacity-60 border-dashed">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-slate-500 italic leading-relaxed mb-6">&quot;{t.quote}&quot;</p>
              <div>
                <p className="text-sm font-semibold text-slate-500">{t.name}</p>
                <p className="text-xs text-slate-600">{t.detail}</p>
              </div>
              <div className="mt-3 text-xs text-yellow-400/60">[PLACEHOLDER — Replace before launch]</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FAQ Preview ───────────────────────────────────────────────

function FAQPreview() {
  const faqs = [
    {
      q: 'Do I need a radar gun to submit?',
      a: 'No. Velocity data is optional and clearly labeled as athlete-provided when you enter it yourself. If you have radar readings, we include them in your report with the source noted.',
    },
    {
      q: 'What phone do I need?',
      a: 'Any modern smartphone that can record video at 120 fps or higher. Most iPhones from the last several years and many Android devices support this in their native camera app.',
    },
    {
      q: 'How long does the analysis take?',
      a: 'Completed reports are reviewed and released within one business day after receiving your complete paid video submission.',
    },
    {
      q: 'Can I submit for a younger pitcher?',
      a: 'Yes, with some important restrictions. Pitch Nav does not accept submissions for athletes under 13. Athletes under 18 require a parent or guardian to complete the consent process during intake.',
    },
  ]

  return (
    <section className="py-24 bg-navy-900">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-heading">Common Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="card">
              <h3 className="text-base font-bold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/faq" className="btn-secondary">
            See All FAQs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────

type HomeCategory = { category: string; score: number; strength?: string }

function AuthenticatedHome({ firstName, latest, activeOrders }: { firstName: string; latest: any; activeOrders: number }) {
  const categories = (latest?.category_scores ?? []) as HomeCategory[]
  const deliveryScore = calculateDeliveryScore(categories, latest?.delivery_score)
  const plan = Array.isArray(latest?.training_plans) ? latest.training_plans[0] : latest?.training_plans
  const weekOne = plan?.weeks?.[0]
  return (
    <main className="min-h-screen bg-navy-950 pb-20 pt-24">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-electric-blue/20 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-6 shadow-card sm:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-electric-blue-light">Your Pitch Nav home</p><h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">Welcome back, {firstName}.</h1><p className="mt-3 max-w-2xl text-slate-400">Your latest scores, video feedback, velocity estimates, and weekly plan are collected here.</p></div>
            <div className="flex flex-wrap gap-3"><Link href="/dashboard" className="btn-primary"><LayoutDashboard className="h-4 w-4" /> Full Dashboard</Link><Link href="/dashboard/motion-lab" className="btn-secondary"><Activity className="h-4 w-4" /> Video Review</Link></div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-500">Overall score</p><p className="mt-2 text-4xl font-black text-white">{deliveryScore ?? '—'}<span className="text-lg text-electric-blue-light">/30</span></p></div>
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-500">Velocity estimate</p><p className="mt-2 text-3xl font-black text-white">{latest?.velocity_estimate_low != null ? `${Math.round(latest.velocity_estimate_low)}–${Math.round(latest.velocity_estimate_high)} mph` : '—'}</p><p className="mt-1 text-xs text-slate-500">Video-estimated; radar remains verified</p></div>
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-500">Current plan</p><p className="mt-2 text-3xl font-black text-white">{plan?.duration_weeks ? `${plan.duration_weeks} weeks` : '—'}</p><p className="mt-1 text-xs text-slate-500">Monday–Sunday calendar</p></div>
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-500">Active submissions</p><p className="mt-2 text-4xl font-black text-white">{activeOrders}</p><p className="mt-1 text-xs text-slate-500">Securely saved</p></div>
        </div>

        {latest ? <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Latest video feedback</p><h2 className="mt-1 text-2xl font-black text-white">Mechanics breakdown</h2></div><Gauge className="h-8 w-8 text-electric-blue-light" /></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{categories.map((item) => <div key={item.category} className="rounded-xl border border-surface-border bg-navy-950 p-4"><div className="flex justify-between gap-3"><p className="font-semibold text-white">{item.category}</p><p className="font-black text-electric-blue-light">{item.score}/5</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-700"><div className="h-full rounded-full bg-electric-blue" style={{ width: `${item.score * 20}%` }} /></div>{item.strength && <p className="mt-3 line-clamp-2 text-xs text-slate-400">{item.strength}</p>}</div>)}</div>
            <Link href={`/dashboard/feedback/${latest.id}`} className="btn-accent mt-6">View Full Feedback <ArrowRight className="h-4 w-4" /></Link>
          </section>
          <section className="card"><CalendarDays className="h-7 w-7 text-accent-green" /><p className="mt-4 text-xs font-bold uppercase tracking-widest text-accent-green">This week</p><h2 className="mt-1 text-xl font-black text-white">{weekOne?.priority ?? 'Plan ready after analysis'}</h2><div className="mt-5 space-y-3">{weekOne?.days?.slice(0, 3).map((day: any) => <div key={day.day} className="rounded-lg bg-navy-950 p-3"><p className="text-xs font-bold text-white">{day.day} · {day.focus}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{day.work}</p></div>)}</div><Link href={`/dashboard/feedback/${latest.id}`} className="mt-5 inline-flex text-sm font-semibold text-electric-blue-light">Open full calendar <ArrowRight className="ml-1 h-4 w-4" /></Link></section>
        </div> : <section className="card mt-8 py-12 text-center"><Activity className="mx-auto h-10 w-10 text-electric-blue-light" /><h2 className="mt-4 text-2xl font-black text-white">Start your first pitching analysis</h2><p className="mx-auto mt-2 max-w-lg text-slate-400">Submit a side-view pitching video to receive your score breakdown, key positions, feedback, and weekly plan.</p><Link href="/start-analysis" className="btn-primary mt-6">Start Analysis <ArrowRight className="h-4 w-4" /></Link></section>}
      </section>
    </main>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const [{ data: profile }, { data: latest }, { count: activeOrders }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('motion_analyses').select('id,title,delivery_score,velocity_estimate_low,velocity_estimate_high,category_scores,training_plans(duration_weeks,weeks)').eq('user_id', user.id).eq('status', 'published').not('published_at', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(complete,cancelled,refunded)'),
    ])
    const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Athlete'
    return <AuthenticatedHome firstName={firstName} latest={latest} activeOrders={activeOrders ?? 0} />
  }
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhatIsIncluded />
      <CameraSetupPreview />
      <WhyPitchNav />
      <PricingSection />
      <Testimonials />
      <FAQPreview />

      {/* Safety disclaimer section */}
      <section className="py-16 bg-navy-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SafetyDisclaimer />
        </div>
      </section>
    </>
  )
}

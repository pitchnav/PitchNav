import { PitchTrackingHUD } from '@/components/pricing/PitchTrackingHUD'
import { IndividualPricing } from '@/components/pricing/IndividualPricing'
import Link from 'next/link'
import {
  ArrowRight, Play, CheckCircle, Camera, FileBarChart2, Dumbbell,
  ChevronDown, Shield, Zap, Target, Users, TrendingUp, Award,
  Activity, CalendarDays, Gauge, LayoutDashboard
} from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { ADVISORS, hasAdvisors } from '@/lib/advisors'
import { createClient } from '@/lib/supabase/server'
import { calculateDeliveryScore } from '@/lib/utils'

// ── Hero ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-navy-950 pt-28 pb-20 sm:pt-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">Pitch Tracking + Tailored Development</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">Track your pitches.<br /><span className="text-electric-blue-light">Build your game.</span></h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">Track your bullpen with your iPhone. Get a throwing and training plan built around your game.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/pitch-metrics" className="btn-primary">Explore Pitch Tracking <ArrowRight className="h-4 w-4" /></Link>
            <Link href="#tailored-development" className="btn-primary">Explore Tailored Development <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-2">
          <article className="card flex flex-col border-electric-blue/25">
            <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Track your bullpen · In development</p>
            <h2 className="mt-3 text-3xl font-black text-white">Pitch Tracking</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">See your velo and where each pitch crossed the zone. Review the video and ball flight after your throw.</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-400">
              <li>Set up your phone once before the bullpen</li>
              <li>Keep every pitch on the map, including your misses</li>
              <li>Session history and phone sync coming later</li>
            </ul>
            <Link href="/pitch-metrics" className="btn-secondary mt-6 justify-center">Explore the tracking system <ArrowRight className="h-4 w-4" /></Link>
            <div className="mt-8"><PitchTrackingHUD /></div>
          </article>
          <article id="tailored-development" className="card flex flex-col scroll-mt-24 border-electric-blue/25">
            <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Develop your game · Staff-reviewed</p>
            <h2 className="mt-3 text-3xl font-black text-white">Tailored Development</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">Send us your delivery. We’ll review your mechanics and give you drills and a throwing plan. Add lifting and mobility with Complete Development.</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-400">
              <li>Mechanics feedback from the Pitch Nav staff</li>
              <li>Throwing, lifting and mobility built for you</li>
              <li>Follow your plan and check your progress</li>
            </ul>
            <Link href="/pricing" className="btn-secondary mt-6 justify-center">Explore development plans <ArrowRight className="h-4 w-4" /></Link>
            <div className="mt-8 flex flex-1 flex-col rounded-2xl border border-surface-border bg-navy-950 p-6">
              <div className="flex items-center justify-between gap-3"><span className="font-black italic text-white">PITCH <span className="text-electric-blue-light">NAV</span></span><span className="text-xs font-semibold text-slate-400">PLAN PREVIEW</span></div>
              <p className="mt-8 text-xs font-bold uppercase tracking-widest text-electric-blue-light">Your training plan</p>
              <h3 className="mt-3 text-2xl font-black text-white">Know what to work on.</h3>
              <div className="my-8 space-y-4">
                {[
                  {icon: FileBarChart2, title: 'Assess', text: 'Find what works in your delivery and what needs work.'},
                  {icon: Target, title: 'Throw', text: 'Take your drills and throwing plan to the field.'},
                  {icon: Dumbbell, title: 'Build', text: 'Pair your throwing with lifting and mobility.'},
                  {icon: CalendarDays, title: 'Review', text: 'Log your work and review your progress.'},
                ].map(({icon: Icon,title,text}) => <div key={title} className="rounded-xl bg-navy-900 p-5"><Icon className="h-5 w-5 text-electric-blue-light" /><h4 className="mt-3 text-lg font-bold text-white">{title}</h4><p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p></div>)}
              </div>
              <Link href="/sample-report" className="mt-auto text-sm font-semibold text-electric-blue-light">View a sample report <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
              <p className="mt-4 text-xs text-slate-500">Sample plan layout. We build your program after your assessment.</p>
            </div>
          </article>
        </div>
        <div className="mt-10 text-center"><h2 className="text-2xl font-bold text-white">Bring your bullpen and training together.</h2><p className="mx-auto mt-3 max-w-2xl text-slate-400">Complete Development includes your training plan and Pitch Tracking when it launches. Tracking and phone sync are still in testing.</p></div>
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
      description: 'Choose your plan and submit your video for review.',
    },
    {
      step: '04',
      icon: <FileBarChart2 className="h-6 w-6" />,
      title: 'Receive Your Report',
      description: 'The Pitch Nav staff analyzes your delivery frame by frame and delivers a full report, voice-over video, drills, and an eight-week focus plan.',
    },
  ]

  return (
    <section className="py-24 bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-heading">How Tailored Development Works</h2>
          <p className="section-subheading">
            Film your delivery. Get your mechanics reviewed. Take your plan to the field.
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
            <h2 className="section-heading">What you get</h2>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">
              Get a breakdown of your delivery, drills with coaching cues, and a plan for your next eight weeks.
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
                See Plans <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary">
                See Pricing
              </Link>
            </div>
          </div>

          {/* Visual card */}
          <div className="card bg-card-gradient">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Memberships</p>
                <p className="text-3xl font-black text-white mt-1">From $24.99/month</p>
              </div>
              <div className="rounded-lg bg-accent-green/10 px-3 py-1">
                <span className="text-sm font-semibold text-accent-green">Mechanics review</span>
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
          <h2 className="section-heading">Film Your Mechanics Assessment</h2>
          <p className="section-subheading">
            For a mechanics review, film from your throwing-arm side. Follow the guide to keep your full delivery in view.
          </p>
        </div>

        {/* One angle ships today, so a two-column grid left the single card
            sitting half-width like a failed image load. Centred and capped. */}
        <div className="grid grid-cols-1 gap-8 max-w-xl mx-auto">
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

// ── Movement Screens ─────────────────────────────────────────
// Added 2026-10-25. The screens had shipped and been measurable for months
// with zero presence outside the logged-in dashboard, so no prospect could
// discover the thing that most separates Pitch Nav from a video review.

function MovementScreensPreview() {
  return (
    <section className="py-24 bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-electric-blue-light">
              Movement Checks
            </p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              Build around how you move
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Your range of motion helps us put your delivery in context. Film five short movement checks alongside your pitching video.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              We use those checks to guide your training and compare your range of motion at follow-ups.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/movement-screens" className="btn-secondary">
                See the movement screens <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: 'See your measurements',
                body: 'Your report records each measurement and when you took it.',
              },
              {
                title: 'Know what needs another look',
                body: 'If we need another movement check, your report explains which one.',
              },
              {
                title: 'Understand the limits',
                body: 'Each check includes a confidence rating so you know how to use the result.',
              },
              {
                title: 'Check your progress',
                body: 'Repeat the checks at follow-ups to see what has changed.',
              },
            ].map((item) => (
              <div key={item.title} className="card">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-green" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
      title: 'Know what to work on',
      description: 'We review your delivery and explain what to work on. We label estimates and cannot promise velocity gains.',
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
      title: 'Staff-reviewed feedback',
      description: 'The Pitch Nav staff reviews your delivery frame by frame and checks your report before you receive it.',
    },
  ]

  return (
    <section className="py-24 bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-heading">Why Pitch Nav</h2>
          <p className="section-subheading">
            Clear feedback. Useful drills. A plan you can follow.
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
  return <section className="py-24 bg-navy-900" id="pricing">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="mb-10 text-center"><h2 className="section-heading">Find Your Plan</h2><p className="section-subheading">Choose training, Pitch Tracking, or both. Pay monthly or yearly.</p></div>
      <IndividualPricing />
      <div className="mt-8 text-center"><Link href="/pricing#teams" className="btn-secondary">Explore program pricing <ArrowRight className="h-4 w-4" /></Link></div>
    </div>
  </section>
}

// ── Athlete advisor strip ─────────────────────────────────────
//
// Sits directly under the hero, in normal page flow -- deliberately not a
// fixed/floating bar, so everyone who lands sees it once without it following
// them down the page.
//
// Says ADVISE, not review. These players do not read submissions, and the
// wording here has to keep saying so: a heading like "Your review staff" over
// these faces would tell a paying parent that a Vanderbilt pitcher looked at
// their kid's delivery. Reviewer credentials live in src/lib/reviewers.ts and
// render through their own surface.
//
// Renders nothing when the list is empty, so it can never ship as "[Name]"
// placeholders.

function AdvisorStrip() {
  if (!hasAdvisors()) return null

  return (
    <section className="relative overflow-hidden border-y border-electric-blue/15 bg-gradient-to-b from-navy-900 to-navy-950">
      {/* Soft brand glow behind the roster so the band reads as a feature
          rather than a footer. Pointer-events-none so it never eats clicks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-glow-blue opacity-60"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:w-60 lg:flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">
              Athlete advisors
            </p>
            <h2 className="mt-1.5 text-2xl font-black leading-tight text-white">
              College &amp; pro pitchers
            </h2>
          </div>

          <ul className="flex flex-wrap gap-x-9 gap-y-6">
            {ADVISORS.map((advisor) => (
              <li
                key={advisor.name}
                className="group flex items-center gap-3.5 transition-transform duration-200 hover:-translate-y-0.5"
              >
                {advisor.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={advisor.photo}
                    alt={advisor.name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-electric-blue/40 transition-all duration-200 group-hover:ring-electric-blue"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-800 text-lg font-black text-electric-blue-light ring-2 ring-electric-blue/25 transition-all duration-200 group-hover:ring-electric-blue/60"
                  >
                    {advisor.name.trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[15px] font-bold leading-tight text-white">{advisor.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-electric-blue-light">
                    {advisor.affiliation}
                  </p>
                  {advisor.previously && (
                    <p className="text-xs text-slate-500">formerly {advisor.previously}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────
//
// Removed 2026-10-24. The section shipped with three "PLACEHOLDER" quotes
// attributed to "Athlete Name, Sample State", above a visible warning banner
// saying the reviews were sample content to replace before launch. To a parent
// deciding whether to hand over a card, that reads as "this business is not
// real yet" -- worse than having no testimonial section at all.
//
// Bring this back when there is at least ONE real, attributable quote from a
// real athlete, parent or coach who has given permission. Do not restore it
// with invented or composite reviews; a fabricated testimonial is a false
// statement about a real product in a space where families are the customer.
// Until then, the social proof above it (deliveries reviewed, coach
// background, the sample report itself) carries this job.

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
          <h2 className="section-heading">Before You Start</h2>
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
            <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-electric-blue-light">Your Pitch Nav home</p><h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">Welcome back, {firstName}.</h1><p className="mt-3 max-w-2xl text-slate-400">Your latest scores, video feedback, and weekly plan are collected here.</p></div>
            <div className="flex flex-wrap gap-3"><Link href="/dashboard" className="btn-primary"><LayoutDashboard className="h-4 w-4" /> Full Dashboard</Link><Link href="/dashboard/motion-lab" className="btn-secondary"><Activity className="h-4 w-4" /> Video Review</Link></div>
          </div>
        </div>

        {/* Velocity-estimate tile removed 2026-10-25: D-010 deleted the producer,
            so velocity_estimate_low is never written and the tile always read "—". */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card"><p className="text-xs uppercase tracking-widest text-slate-500">Overall score</p><p className="mt-2 text-4xl font-black text-white">{deliveryScore ?? '—'}<span className="text-lg text-electric-blue-light">/30</span></p></div>
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
      supabase.from('motion_analyses').select('id,title,delivery_score,category_scores,training_plans(duration_weeks,weeks)').eq('user_id', user.id).eq('status', 'published').not('published_at', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(complete,cancelled,refunded)'),
    ])
    const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Athlete'
    return <AuthenticatedHome firstName={firstName} latest={latest} activeOrders={activeOrders ?? 0} />
  }
  return (
    <>
      <Hero />
      <AdvisorStrip />
      <HowItWorks />
      <WhatIsIncluded />
      <MovementScreensPreview />
      <CameraSetupPreview />
      <WhyPitchNav />
      <PricingSection />
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

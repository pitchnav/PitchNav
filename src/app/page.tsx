import Link from 'next/link'
import {
  ArrowRight, Play, CheckCircle, Camera, FileBarChart2, Dumbbell,
  Star, ChevronDown, Shield, Zap, Target, Users, TrendingUp, Award
} from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

// ── Hero ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-navy-950 pt-16">
      {/* Left side content */}
      <div className="relative z-10 w-full lg:w-1/2 px-6 sm:px-12 lg:px-16 xl:px-24 py-20">
        {/* Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-electric-blue/30 bg-electric-blue/10 px-4 py-1.5 text-xs font-semibold text-electric-blue-light uppercase tracking-widest mb-8">
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
          Data-driven biomechanics analysis that shows you what's working, what's not, and how to throw better.
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
            { icon: <Target className="h-4 w-4" />, label: 'BIOMECHANICS', sub: 'Deeper understanding' },
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

      {/* Right side — hero image */}
      <div className="hidden lg:block absolute right-0 top-0 h-full w-1/2">
        {/* Dark gradient blending left edge into page */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-navy-950 to-transparent z-10" />

        <img
          src="/pitcher-hero.jpg"
          alt="Pitcher in Pitch Nav jersey throwing from the mound"
          className="h-full w-full object-cover object-center"
        />

        {/* Stat overlay cards */}
        <div className="absolute top-1/4 right-6 z-20 space-y-3">
          {[
            { label: 'MECHANICS SCORE', value: '23/30', color: 'text-accent-green' },
            { label: 'DEVELOPMENT AREAS', value: '3 FOUND', color: 'text-electric-blue-light' },
            { label: 'DRILLS ASSIGNED', value: '3 DRILLS', color: 'text-white' },
            { label: 'TURNAROUND', value: '5–7 DAYS', color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-navy-950/85 backdrop-blur border border-white/10 px-4 py-2.5 text-right min-w-[140px]">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</p>
              <p className={`text-base font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: show image below text */}
      <div className="lg:hidden absolute inset-0 z-0">
        <img
          src="/pitcher-hero.jpg"
          alt="Pitcher in Pitch Nav jersey"
          className="h-full w-full object-cover object-center opacity-20"
        />
        <div className="absolute inset-0 bg-navy-950/70" />
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
      description: 'Follow our guided camera-setup wizard for open-side and rear-view angles. Submit at least 3 full-intent pitches from each angle.',
    },
    {
      step: '03',
      icon: <Target className="h-6 w-6" />,
      title: 'Pay & Submit',
      description: 'Complete your secure checkout for the Complete Pitching Analysis package. Your submission is immediately queued for review.',
    },
    {
      step: '04',
      icon: <FileBarChart2 className="h-6 w-6" />,
      title: 'Receive Your Report',
      description: 'Your expert reviewer analyzes your delivery frame-by-frame and delivers a full report, voice-over video, drills, and a four-week focus plan.',
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
    'Rear-view video review',
    'Six-position mechanics breakdown',
    'Mechanics scorecard (6 categories)',
    'Athlete-provided velocity profile',
    'Three identified strengths',
    'Three development priorities',
    'Three personalized drills with coaching cues',
    'Four-week focus plan',
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
              Your Complete Pitching Analysis delivers a thorough, professional breakdown of your
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
                Get Started — $49 <ArrowRight className="h-4 w-4" />
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
                <p className="text-xs text-slate-500 uppercase tracking-widest">Complete Package</p>
                <p className="text-3xl font-black text-white mt-1">$49</p>
              </div>
              <div className="rounded-lg bg-accent-green/10 px-3 py-1">
                <span className="text-sm font-semibold text-accent-green">All Included</span>
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
              ★ Scores are internal coaching tools for tracking development in the same athlete
              over time. Not a medical or laboratory biomechanics score.
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
    {
      name: 'Rear View',
      icon: '📷',
      description: 'Place the camera behind the mound, centered with the target line. Stay far enough back for full body visibility.',
      tips: ['Centered with the target', 'Stay stationary', 'Landing foot must be visible'],
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

// ── Why PitchFrame ────────────────────────────────────────────

function WhyPitchFrame() {
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
          <h2 className="section-heading">Why PitchFrame</h2>
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
  return (
    <section className="py-24 bg-navy-900" id="pricing">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="section-heading">Simple, Transparent Pricing</h2>
        <p className="section-subheading">One package. Everything included. No hidden fees.</p>

        <div className="mt-12 card relative overflow-hidden">
          {/* Glow border effect */}
          <div className="absolute inset-0 rounded-xl ring-1 ring-electric-blue/30" aria-hidden />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-white">Complete Pitching Analysis</h3>
              <p className="text-slate-400 mt-1">Everything you need to improve your delivery</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-white">$49</p>
              <p className="text-slate-500 text-sm">one-time</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {[
              'Open-side video review',
              'Rear-view video review',
              'Six-position mechanics breakdown',
              'Mechanics scorecard',
              'Velocity profile (athlete-provided)',
              '3 identified strengths',
              '3 development priorities',
              '3 personalized drills',
              'Four-week focus plan',
              'Voice-over video',
              'Downloadable PDF report',
              'Follow-up analysis option',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle className="h-4 w-4 text-accent-green flex-shrink-0" />
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>

          <Link href="/start-analysis" className="btn-accent w-full justify-center text-base py-4">
            Start My Analysis — $49 <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-600">
          Secure payment powered by Stripe. PitchFrame does not store your payment information.
        </p>
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
              <p className="text-sm text-slate-500 italic leading-relaxed mb-6">"{t.quote}"</p>
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
      a: 'Most analyses are delivered within 5–7 business days of receiving your complete video submission and payment confirmation.',
    },
    {
      q: 'Can I submit for a younger pitcher?',
      a: 'Yes, with some important restrictions. PitchFrame does not accept submissions for athletes under 13. Athletes under 18 require a parent or guardian to complete the consent process during intake.',
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

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhatIsIncluded />
      <CameraSetupPreview />
      <WhyPitchFrame />
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

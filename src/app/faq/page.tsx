'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'

const FAQ_SECTIONS = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Pitch Nav?',
        a: "Start with a mechanics assessment. Choose Throwing Development for drills and a throwing plan, or Complete Development to add strength and mobility. Our iPhone pitch tracker is in testing.",
      },
      {
        q: 'Who is Pitch Nav for?',
        a: "Pitchers ages 13 and up who want to understand their delivery and have a plan for their work between outings.",
      },
      {
        q: 'Is there an age requirement?',
        a: 'Yes. Pitch Nav does not accept submissions for athletes under 13. Athletes under 18 must have a parent or guardian complete the consent process during intake. Marketing permissions are optional and not required to use the service.',
      },
      {
        q: 'Do I need to visit a facility?',
        a: "No. Film your delivery where you throw and upload it from your phone.",
      },
    ],
  },
  {
    category: 'Video & Camera',
    questions: [
      {
        q: 'What phone do I need?',
        a: "For a mechanics assessment, use a phone that records at 120 fps or higher. Check the slow-motion settings in your camera app. Pitch Tracking is a separate iPhone system that is still in testing.",
      },
      {
        q: 'Do I need a tripod?',
        a: "You’ll need access to a tripod for program setup. A borrowed tripod works.",
      },
      {
        q: 'What video angles do I need to submit?',
        a: "For a mechanics assessment, film from your throwing-arm side with your full body in view. Film movement screens separately using their setup guide. Pitch Tracking uses a different camera position.",
      },
      {
        q: 'What are the movement screens?',
        a: "Five short positions you hold on camera, such as a leg raise or overhead reach. They give our staff more information about your range of motion when building your plan. Your report labels the limits of those measurements.",
      },
      {
        q: 'What video format is accepted?',
        a: 'We accept MP4, MOV, WebM, and most common video formats. Files must be under 500 MB each. If your slow-motion video is very large, you can trim it to include only the relevant pitches before uploading.',
      },
      {
        q: 'What if my video quality isn\'t perfect?',
        a: 'Our camera-setup wizard and video quality checklist will help you catch common issues before you submit. If your reviewer identifies a quality problem after submission, they will contact you and request a replacement video. You have 14 days to re-upload at no additional charge.',
      },
    ],
  },
  {
    category: 'Coming to your training calendar',
    questions: [
      {q: 'I play for two teams. Which dates should I enter?', a: 'Enter both. Count from your first required team day through your last one. If school and summer ball run back to back, your main offseason starts when summer ball ends.'},
      {q: 'What if my coach moves my start?', a: 'When weekly check-ins launch, open your training calendar. Change the game or bullpen day and save. Complete Development looks for room on either side of mound work and schedules fewer lifts if the week is packed.'},
      {q: 'Do I need plyo balls or a full weight room?', a: 'Tell us what you can use, including borrowed equipment. Plyos and bands are optional. If you train at home, your plan can use bodyweight exercises.'},
      {q: 'Where do my weights go?', a: 'When workout logging launches, open the workout, enter your reps and weight for each set, then save. The next time you choose that exercise, you can see what you used in your last completed session.'},
    ],
  },
  {
    category: 'The Analysis',
    questions: [
      {
        q: 'Who reviews my videos?',
        a: "The Pitch Nav staff reviews your delivery frame by frame and checks your report before you receive it.",
      },
      {
        q: 'What is the Delivery Score?',
        a: 'The Delivery Score (out of 30) comes from six categories, each scored 1–5. It tracks your own progress over time. It is not a medical score, a laboratory measurement, or a prediction of injury risk or future performance.',
      },
      {
        q: 'Can Pitch Nav tell me my velocity?',
        a: "Your mechanics report uses velocity readings you provide. Our separate Pitch Tracking system aims to measure velo from calibrated iPhone footage, but it is still in testing and is not publicly available.",
      },
      {
        q: 'How long does the analysis take?',
        a: "Review starts after payment and receipt of a usable submission. Check the order in your dashboard for its current estimate.",
      },
      {
        q: 'What six positions are analyzed?',
        a: "Peak leg lift, hand separation, lead-foot contact, maximum external rotation, ball release and finish. Your report includes images, notes and cues for each position.",
      },
    ],
  },
  {
    category: 'Health & Safety',
    questions: [
      {
        q: 'Can Pitch Nav diagnose or treat injuries?',
        a: 'No. Pitch Nav provides educational baseball training information and cannot diagnose injuries, calculate clinical injury risk, or treat any medical condition. If you are experiencing pain while throwing, stop throwing immediately and consult an athletic trainer, physical therapist, or physician.',
      },
      {
        q: 'What if I report pain during the health screening?',
        a: 'If you report current throwing-related pain during the intake process, Pitch Nav will display a clear warning and flag your submission for admin review. You will not be prevented from saving your intake form, but our team will review the flag before proceeding with your analysis.',
      },
      {
        q: 'What does the health screening ask?',
        a: 'The health screening asks whether you are currently experiencing pain while throwing, whether you experienced throwing-related pain in the last 30 days, whether you recently returned from an injury, and whether you have been medically cleared to throw. There is also an open notes field for anything else your reviewer should know.',
      },
    ],
  },
  {
    category: 'Account & Privacy',
    questions: [
      {
        q: 'Who can access my videos?',
        a: 'Pitch Nav staff use submitted videos for review. See the privacy policy for details on staff access and service providers.',
      },
      {
        q: 'How long are my videos retained?',
        a: 'Contact support to ask about a particular video or request its deletion. The privacy policy explains how to make a request.',
      },
      {
        q: 'Where can I find information about data sharing?',
        a: 'The privacy policy describes what Pitch Nav collects, why it is used, and which service providers may handle it.',
      },
      {
        q: 'How do I delete my account?',
        a: 'You can request account deletion through the contact form or by emailing support@pitchnav.com from the account address.',
      },
    ],
  },
  {
    category: 'Payments & Refunds',
    questions: [
      {
        q: 'What payment methods are accepted?',
        a: 'You can pay by credit or debit card. Our payment processor handles your card details.',
      },
      {
        q: 'Can I get a refund?',
        a: 'A first report that is not useful qualifies for the advertised 14-day refund. An unusable video that cannot be replaced also qualifies for an analysis refund. See billing and cancellation below for the request steps.',
      },
      {
        q: 'How much does a follow-up analysis cost?',
        a: 'Check your membership terms or ask billing support what your purchase includes before placing another order.',
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const answerId = useId()

  return (
    <div className="border-b border-surface-border last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={answerId}
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-electric-blue-light flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
        )}
      </button>
      <div id={answerId} hidden={!open} className="pb-5">
          <p className="max-w-prose text-base leading-relaxed text-slate-300">{a}</p>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 border-b border-surface-border pb-8">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/contact" className="text-electric-blue-light underline underline-offset-2">
              Contact us
            </Link>.
          </p>
        </header>

        {/* FAQ sections */}
        <div className="space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.category} id={section.category === 'Payments & Refunds' ? 'payments' : undefined} className="scroll-mt-24">
              <h2 className="mb-3 text-xl font-bold text-white">
                {section.category}
              </h2>
              <div className="card p-0 divide-y divide-surface-border overflow-hidden">
                {section.questions.map((faq) => (
                  <div key={faq.q} className="px-6">
                    <FAQItem q={faq.q} a={faq.a} />
                  </div>
                ))}
              </div>
              {section.category === 'Payments & Refunds' && <Link className="mt-3 inline-block text-electric-blue-light underline" href="/billing">Billing, cancellation and refunds</Link>}
              {section.category === 'Account & Privacy' && <Link className="mt-3 inline-block text-electric-blue-light underline" href="/privacy">Read the privacy policy</Link>}
            </div>
          ))}
        </div>

        <div className="mt-16">
          <SafetyDisclaimer compact />
        </div>

      </div>
    </div>
  )
}

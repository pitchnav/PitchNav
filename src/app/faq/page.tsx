'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { cn } from '@/lib/utils'

const FAQ_SECTIONS = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Pitch Nav?',
        a: 'Pitch Nav is a remote pitching mechanics analysis service. You upload pitching videos from your device, and an experienced pitching coach reviews them manually and delivers a comprehensive report including a mechanics scorecard, position-by-position breakdown, personalized drills, and a eight-week focus plan.',
      },
      {
        q: 'Who is Pitch Nav for?',
        a: 'Pitch Nav is designed for baseball pitchers from middle school through adult recreational levels. Whether you\'re a high school pitcher working toward a showcase, a travel ball player developing your secondary pitches, or an adult league pitcher looking to stay healthy and improve, Pitch Nav can help you understand your delivery.',
      },
      {
        q: 'Is there an age requirement?',
        a: 'Yes. Pitch Nav does not accept submissions for athletes under 13. Athletes under 18 must have a parent or guardian complete the consent process during intake. Marketing permissions are optional and not required to use the service.',
      },
      {
        q: 'Do I need to visit a facility?',
        a: 'No. Everything is done remotely. You film your pitching session using your smartphone and upload the videos through our secure platform.',
      },
    ],
  },
  {
    category: 'Video & Camera',
    questions: [
      {
        q: 'What phone do I need?',
        a: 'Any modern smartphone that can record video at 120 fps or higher. Most iPhones from the last several years and many mid-to-high-end Android devices support this. Check your native camera app settings for "slow motion" or high-frame-rate options.',
      },
      {
        q: 'Do I need a tripod?',
        a: 'A tripod or stable surface is strongly recommended. The camera must stay completely stationary during filming. Fence-mounted phone holders, portable tripods, and dugout fence clips all work well.',
      },
      {
        q: 'What video angles do I need to submit?',
        a: 'The standard analysis requires one throwing-arm side view, filmed approximately perpendicular to the pitch direction with the complete body visible. Radar-backed evidence can be uploaded separately when available.',
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
    category: 'The Analysis',
    questions: [
      {
        q: 'Who reviews my videos?',
        a: 'Your videos are reviewed by a human pitching coach — not automated software. Pitch Nav does not claim to use laboratory-grade automatic biomechanics analysis. Every report is the product of a human reviewer watching your delivery frame by frame.',
      },
      {
        q: 'What is the Delivery Score?',
        a: 'The Delivery Score (out of 30) comes from six categories, each scored 1–5. It tracks your own progress over time. It is not a medical score, a laboratory measurement, or a prediction of injury risk or future performance.',
      },
      {
        q: 'Can Pitch Nav tell me my velocity?',
        a: 'No. Pitch Nav cannot accurately determine pitch velocity from a regular phone video without calibration data. All velocity information in your report comes from readings you provide yourself. These are clearly labeled as athlete-provided velocity. If you include radar-backed video or a radar screenshot, your reviewer may note that in the report.',
      },
      {
        q: 'How long does the analysis take?',
        a: 'Most analyses are delivered within one business day of receiving a complete video submission and payment confirmation. Delivery time can vary based on current volume. Your dashboard shows a configured delivery estimate from the admin team.',
      },
      {
        q: 'What six positions are analyzed?',
        a: 'Peak leg lift, hand separation, lead-foot contact, maximum external rotation, ball release, and finish & deceleration. Each position includes annotated screenshots, reviewer notes, a strength, a development opportunity, and a coaching cue.',
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
        a: 'Only you and your assigned reviewer can access your uploaded videos. Your files are stored privately — no other user can see them.',
      },
      {
        q: 'How long are my videos retained?',
        a: 'Video retention periods are configurable by the admin. After your analysis is delivered, raw videos are retained for a period set in system settings (typically one year) to allow for potential follow-up analysis. You can request deletion of your videos at any time from your dashboard.',
      },
      {
        q: 'Will my data be sold?',
        a: 'No. Pitch Nav does not sell athlete data. Please review the full privacy policy for details on data collection, storage, and sharing.',
      },
      {
        q: 'How do I delete my account?',
        a: 'You can request account deletion from your dashboard or by contacting support@pitchnav.com. Your account and associated data will be processed within 30 days. You\'ll receive a confirmation email when the deletion is complete.',
      },
    ],
  },
  {
    category: 'Payments & Refunds',
    questions: [
      {
        q: 'What payment methods are accepted?',
        a: 'Pitch Nav accepts all major credit and debit cards through Stripe. We do not accept cash, checks, or cryptocurrency. Pitch Nav does not store your card number — it is handled securely by Stripe.',
      },
      {
        q: 'Can I get a refund?',
        a: 'If your submitted videos are unusable for analysis and a replacement cannot be obtained, we will issue a full refund. Completed analyses are not eligible for refunds. Contact support@pitchnav.com with any billing questions.',
      },
      {
        q: 'How much does a follow-up analysis cost?',
        a: 'Follow-up analysis pricing is available in your dashboard after your first report is complete. Contact us for current pricing.',
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-surface-border last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-electric-blue-light flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/contact" className="text-electric-blue-light hover:underline">
              Contact us
            </Link>.
          </p>
        </div>

        {/* FAQ sections */}
        <div className="space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.category}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-electric-blue-light mb-4">
                {section.category}
              </h2>
              <div className="card p-0 divide-y divide-surface-border overflow-hidden">
                {section.questions.map((faq) => (
                  <div key={faq.q} className="px-6">
                    <FAQItem q={faq.q} a={faq.a} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <SafetyDisclaimer compact />
        </div>

        <div className="mt-10 text-center">
          <p className="text-slate-400 mb-4">Still have questions?</p>
          <Link href="/contact" className="btn-secondary">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

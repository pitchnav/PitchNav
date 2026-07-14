import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'PitchFrame Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400 text-sm">Last updated: [DATE — replace before launch]</p>
        </div>

        <div className="mb-10 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <p className="text-sm text-yellow-400 font-semibold mb-1">⚠️ Attorney Review Required</p>
          <p className="text-xs text-yellow-400/80 leading-relaxed">
            Sections marked [PLACEHOLDER] require review by a qualified attorney before this
            website is launched publicly.
          </p>
        </div>

        <div className="space-y-8">
          {[
            {
              title: '1. Acceptance of Terms',
              content: 'By creating an account or using PitchFrame, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the service. If you are under 18, your parent or guardian must review and agree to these terms on your behalf.',
            },
            {
              title: '2. Description of Service',
              content: 'PitchFrame provides remote pitching mechanics analysis services. A human reviewer analyzes submitted pitching videos and delivers a written and video report containing a mechanics assessment, personalized drills, and a development plan. PitchFrame is an educational baseball training service — not a medical service.',
            },
            {
              title: '3. Not Medical Advice',
              content: 'PitchFrame does not provide medical care, diagnose injuries, calculate clinical injury risk, or guarantee any outcome. Nothing in a PitchFrame analysis constitutes medical advice. Delivery scores and mechanics ratings are coaching tools for tracking development in the same athlete over time, not medical or laboratory biomechanics measurements. Athletes experiencing pain should stop throwing and consult a qualified medical professional.',
            },
            {
              title: '4. No Performance Guarantees',
              content: 'PitchFrame does not guarantee specific velocity increases, scholarship offers, selection to any team, or any athletic outcome. Results vary based on many factors outside PitchFrame\'s control, including the athlete\'s physical development, training consistency, coaching, and health.',
            },
            {
              title: '5. Age Requirements',
              content: 'PitchFrame does not accept registrations from athletes under 13 years of age. Athletes between 13 and 17 must have a parent or guardian complete the consent process and agree to these terms before any submission is made. By completing the consent process for a minor athlete, the parent or guardian represents that they have the authority to do so.',
            },
            {
              title: '6. Video Submissions',
              content: 'By submitting videos to PitchFrame, you represent that you have the right to submit the videos, that the athlete depicted in the videos consents to the submission, and that no third party\'s rights are violated by the submission. For minor athletes, the parent or guardian provides this representation. You grant PitchFrame a limited license to view, store, and use your submitted videos for the purpose of completing your analysis. We do not use your videos for any other purpose without your explicit written consent.',
            },
            {
              title: '7. Payment and Refunds',
              content: '[PLACEHOLDER — add full refund policy language, chargeback policy, and billing terms with attorney guidance before launch.] Payment is collected at checkout via Stripe. Orders are created only after payment is confirmed. If submitted videos are unusable and a replacement cannot be obtained, we will issue a full refund. Completed analyses are not eligible for refunds. Contact support@pitchframe.com for billing concerns.',
            },
            {
              title: '8. Intellectual Property',
              content: 'The analysis reports, scorecard ratings, written feedback, and video commentary created by PitchFrame reviewers are the intellectual property of PitchFrame. You may download and use your report for personal, non-commercial training purposes. You may not reproduce, resell, or redistribute any PitchFrame analysis without written permission.',
            },
            {
              title: '9. Limitation of Liability',
              content: '[PLACEHOLDER — this section must be drafted by an attorney. Standard limitation of liability and disclaimer of warranties language must be included before launch.]',
            },
            {
              title: '10. Indemnification',
              content: '[PLACEHOLDER — indemnification clause must be drafted by an attorney before launch.]',
            },
            {
              title: '11. Governing Law',
              content: '[PLACEHOLDER — specify governing jurisdiction with attorney guidance before launch.]',
            },
            {
              title: '12. Changes to Terms',
              content: 'We may update these terms from time to time. We will notify you of significant changes by email. Continued use of the service after changes are posted constitutes acceptance of the updated terms.',
            },
            {
              title: '13. Contact',
              content: 'For questions about these terms, contact support@pitchframe.com.',
            },
          ].map(({ title, content }) => (
            <div key={title} className="card">
              <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

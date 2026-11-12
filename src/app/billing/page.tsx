import Link from 'next/link'
import { PolicyDocument, PolicySection } from '@/components/layout/PolicyDocument'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing, Cancellation & Refunds',
  description: 'Get help with a Pitch Nav subscription, assessment charge or refund.',
}

export default function BillingPage() {
  return (
    <PolicyDocument title="Billing, cancellation &amp; refunds" underReview={false}>
        <PolicySection title="Cancel a subscription">
          <p>Monthly and annual memberships renew automatically until canceled. To stop renewal, email support from the address you used to pay. Include the plan or order number if available. Please leave out card details and athlete footage.</p>
          <a href="mailto:support@pitchnav.com?subject=Cancel%20my%20subscription" className="btn-action mt-4">Email a cancellation request</a>
          <p className="mt-3 text-sm">You can also use the <Link href="/contact?topic=cancellation" className="text-electric-blue-light underline">cancellation request form</Link>. Ask for confirmation of the effective cancellation date.</p>
        </PolicySection>
        <PolicySection title="Assessment refunds">
          <p>If your first report isn&apos;t useful, email us within 14 days of receiving it for a full refund of your first analysis. If your reviewer cannot analyze your video and a usable replacement cannot be obtained, we will issue a full refund for that analysis.</p>
          <p className="mt-3">For a duplicate charge, a renewal or a question about an earlier offer, include the charge date and reference from your receipt. <a href="mailto:support@pitchnav.com?subject=Billing%20or%20refund%20request">Email billing support</a>.</p>
        </PolicySection>
        <PolicySection title="Your charge">
          <p>A standalone assessment is a one-time purchase. Individual Complete includes one assessment. Team quotes list any separate assessment fees. Review the first payment, renewal amount, billing interval and any taxes at checkout. Your receipt identifies the plan you purchased.</p>
        </PolicySection>
    </PolicyDocument>
  )
}

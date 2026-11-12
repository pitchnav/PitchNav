import Link from 'next/link'
import { PolicyDocument, PolicySection } from '@/components/layout/PolicyDocument'
import type { Metadata } from 'next'
import { billingPortalLogin } from '@/lib/billing-portal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Billing, Cancellation & Refunds',
  description: 'Get help with a Pitch Nav subscription, assessment charge or refund.',
}

export default async function BillingPage() {
  const portal = await billingPortalLogin()
  return (
    <PolicyDocument title="Billing, cancellation &amp; refunds" underReview={false}>
        <PolicySection title="Cancel a subscription">
          <p>Monthly and annual memberships renew until canceled. Sign in to see subscriptions linked to your Pitch Nav orders and stop the next renewal.</p>
          <Link href="/billing/manage" className="btn-action mt-4">Manage or cancel subscription</Link>
          {portal && <p className="mt-3"><a href={portal}>Open the Stripe customer portal</a> with the email you used at checkout.</p>}
          <p className="mt-3 text-sm">If your subscription is missing or you paid through a separate checkout link, send a <Link href="/contact?topic=cancellation">cancellation request</Link> or <a href="mailto:support@pitchnav.com?subject=Cancel%20my%20subscription">email billing support</a> from the address on your receipt. Ask for confirmation of the effective date. Leave out card details and athlete footage.</p>
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

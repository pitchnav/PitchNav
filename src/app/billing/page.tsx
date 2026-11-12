import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing, Cancellation & Refunds',
  description: 'Get help with a Pitch Nav subscription, assessment charge or refund.',
}

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-navy-950 px-4 pb-20 pt-28">
      <article className="mx-auto max-w-2xl space-y-8 text-slate-300">
        <h1 className="text-4xl font-black tracking-tight text-white">Billing, cancellation &amp; refunds</h1>
        <section>
          <h2 className="mb-2 text-xl font-bold text-white">Cancel a subscription</h2>
          <p>Monthly and annual memberships renew automatically until canceled. To stop renewal, email support from the address you used to pay. Include the plan or order number if available. Please leave out card details and athlete footage.</p>
          <a href="mailto:support@pitchnav.com?subject=Cancel%20my%20subscription" className="btn-action mt-4">Email a cancellation request</a>
          <p className="mt-3 text-sm">You can also use the <Link href="/contact?topic=cancellation" className="text-electric-blue-light underline">cancellation request form</Link>. Ask for confirmation of the effective cancellation date.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-bold text-white">Assessment refunds</h2>
          <p>If your first report isn&apos;t useful, email us within 14 days of receiving it for a full refund of your first analysis. If your reviewer cannot analyze your video and a usable replacement cannot be obtained, we will issue a full refund for that analysis.</p>
          <p className="mt-3">For a duplicate charge, a renewal or a question about an earlier offer, include the charge date and reference from your receipt. <a className="text-electric-blue-light underline" href="mailto:support@pitchnav.com?subject=Billing%20or%20refund%20request">Email billing support</a>.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-bold text-white">Your charge</h2>
          <p>A standalone assessment is a one-time purchase. Some development subscriptions include an initial assessment charge in the first payment. Review the first payment, renewal amount, billing interval and any taxes at checkout. Your receipt identifies the plan you purchased.</p>
        </section>
      </article>
    </div>
  )
}

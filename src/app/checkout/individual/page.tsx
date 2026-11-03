import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { configuredCheckoutUrl, getCheckoutOption } from '@/lib/individual-checkout'
import { money } from '@/lib/pricing-catalog'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Individual Checkout', robots: { index: false, follow: false } }

export default async function IndividualCheckout({ searchParams }: {
  searchParams: Promise<{ plan?: string; billing?: string }>
}) {
  const { plan, billing } = await searchParams
  const option = getCheckoutOption(plan, billing)
  if (!option) notFound()
  const destination = configuredCheckoutUrl(process.env[option.environmentKey])
  // Enable only after prices AND account/report fulfillment are tested in Stripe.
  // This does not activate or alter the legacy checkout or existing memberships.
  const ready = process.env.INDIVIDUAL_CHECKOUT_READY === 'true'
  const trackingReady = option.plan !== 'metrics' || process.env.PITCH_TRACKING_SALES_READY === 'true'
  if (ready && trackingReady && destination) redirect(destination)

  return <main className="min-h-screen bg-navy-950 px-4 pb-20 pt-28">
    <section className="card mx-auto max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-electric-blue-light">Individual checkout</p>
      <h1 className="mt-4 text-3xl font-black text-white">{option.name}</h1>
      <p className="mt-3 text-slate-300">{option.billing === 'one-time' ? 'One-time assessment' : option.billing === 'annual' ? 'Annual subscription · paid upfront' : 'Monthly subscription'}</p>
      <p className="mt-6 text-4xl font-black text-white">{money(option.initialTotal)}</p>
      {option.assessment > 0 && <p className="mt-2 text-sm text-slate-400">Includes your {money(option.assessment)} initial assessment.</p>}
      {option.recurring > 0 && <p className="mt-2 text-sm text-slate-400">Then {money(option.recurring)}/{option.billing === 'annual' ? 'year' : 'month'} until canceled.</p>}
      <div className="my-6 border-t border-surface-border" />
      <h2 className="text-lg font-semibold text-white">{!trackingReady ? 'Pitch Tracking is still in testing.' : 'Online checkout is being set up.'}</h2>
      <p className="mt-3 text-slate-300">{!trackingReady ? 'Subscriptions will open when tracking is ready. You won’t be charged before then.' : 'You’ll be able to pay here without contacting us. Payments aren’t open yet, and you haven’t been charged.'}</p>
      <Link className="btn-secondary mt-6" href="/pricing">Back to plans</Link>
    </section>
  </main>
}

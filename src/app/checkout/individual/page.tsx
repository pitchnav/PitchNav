import { isStoreWrapper } from '@/lib/store-wrapper'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
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

  const inStoreApp = isStoreWrapper((await headers()).get('user-agent'))
  const trackingReady = option.plan !== 'metrics' || process.env.PITCH_TRACKING_SALES_READY === 'true'
  const checkoutUrl = !inStoreApp && process.env.INDIVIDUAL_CHECKOUT_READY === 'true' && trackingReady
    ? configuredCheckoutUrl(process.env[option.environmentKey])
    : null
  const period = option.billing === 'annual' ? 'year' : 'month'

  return <div className="min-h-screen bg-navy-950 px-4 pb-20 pt-28">
    <section className="card mx-auto max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-electric-blue-light">Individual plan details</p>
      <h1 className="mt-4 text-3xl font-black text-white">{option.name}</h1>
      <p className="mt-3 text-slate-300">{option.billing === 'one-time' ? 'One-time assessment' : option.billing === 'annual' ? 'Annual subscription · paid upfront' : 'Monthly subscription'}</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-300">First payment before tax</h2>
      <p className="price-figure text-4xl text-white">{money(option.initialTotal)}</p>
      {option.plan === 'complete' && <p className="mt-2 text-sm text-slate-300">One pitching assessment is included. Pitch Tracking is included when it launches.</p>}
      <p className="mt-2 text-sm text-slate-300">{option.recurring > 0 ? `Renews automatically at ${money(option.recurring)} per ${period} until canceled.` : 'No recurring charge.'}</p>
      <Link className="mt-3 inline-block text-sm text-electric-blue-light underline" href="/billing">Cancellation and refunds</Link>
      <div className="my-6 border-t border-surface-border" />
      {checkoutUrl ? <a className="btn-action" href={checkoutUrl}>Continue to payment</a> : <>
        <h2 className="text-lg font-semibold text-white">{inStoreApp ? 'Purchases are unavailable in this mobile app' : !trackingReady ? 'Pitch Tracking is still in testing' : 'Online checkout is unavailable for this option'}</h2>
        <p className="mt-2 text-sm text-slate-300">No payment has been taken on this page.</p>
      </>}
      <div><Link className="btn-secondary mt-5" href="/pricing">Back to plans</Link></div>
    </section>
  </div>
}

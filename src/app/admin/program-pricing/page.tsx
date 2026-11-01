import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProgramQuote } from '@/components/pricing/ProgramQuote'
import type { Billing, ProgramPlan } from '@/lib/pricing-catalog'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin Program Pricing', robots: { index: false, follow: false } }

export default async function ProgramPricingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Check here as well as in the layout: no quote data renders for non-admins.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin/program-pricing')
  const { data: profile, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (error || profile?.is_admin !== true) redirect('/dashboard')
  const params = await searchParams
  const players = typeof params.pitcherCount === 'string' ? params.pitcherCount : '20'
  const plan: ProgramPlan = params.programPlan === 'metrics' ? 'metrics' : 'complete'
  const billing: Billing = params.billing === 'annual' ? 'annual' : 'monthly'
  return <section className="max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Admin only</p>
    <h1 className="mt-3 text-3xl font-black text-white">Program Pricing</h1>
    <p className="mt-3 mb-8 text-slate-400">Calculate roster quotes, assessment fees and renewal totals. Rates and calculations stay on the server and are not included in the public pricing page.</p>
    <ProgramQuote players={players} plan={plan} billing={billing} />
  </section>
}

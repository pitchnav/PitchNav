'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Shield, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import type { Order, AthleteProfile } from '@/types/database'
import Link from 'next/link'

type MembershipTier = 'throwing' | 'performance'

const THROWING_ITEMS = [
  'Open-side video review',
  'Six-position mechanics breakdown',
  'Mechanics scorecard',
  'Three strengths & three development priorities',
  'Three personalized drills',
  'Eight-week throwing plan',
  'Voice-over video analysis',
  'Downloadable PDF report',
]

const PERFORMANCE_ITEMS = [
  ...THROWING_ITEMS,
  'Tailored eight-week strength plan',
  'Monday–Sunday mobility schedule',
  'Lifting cues, recovery guidance & progress tracking',
]

function CheckoutContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const requestedPlan = searchParams.get('plan')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [order, setOrder] = useState<Order | null>(null)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [membershipTier, setMembershipTier] = useState<MembershipTier>(requestedPlan === 'performance' ? 'performance' : 'throwing')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!orderId) { router.push('/dashboard'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, athlete_profile:athlete_profiles(*)')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()

      if (orderError || !orderData) {
        setError('Order not found or access denied.')
        setLoading(false)
        return
      }

      // Prevent re-checkout if already paid
      if (orderData.payment_confirmed_at) {
        router.push(`/success?orderId=${orderId}`)
        return
      }

      setOrder(orderData)
      setProfile(orderData.athlete_profile as AthleteProfile)
      setLoading(false)
    }
    load()
  }, [orderId])

  async function handleCheckout() {
    if (!agreed || !orderId) return
    setCheckoutLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, membershipTier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center">
        <p className="text-slate-400">Loading order...</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-navy-950 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white">Review Your Order</h1>
          <p className="mt-2 text-slate-400">Confirm the details below before proceeding to secure checkout.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Order summary */}
          <div className="lg:col-span-3 space-y-6">
            {/* Athlete */}
            {profile && (
              <div className="card">
                <h2 className="text-base font-semibold text-white mb-4">Athlete</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Name</p>
                    <p className="text-white font-medium">{profile.athlete_full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Level</p>
                    <p className="text-white font-medium">{profile.playing_level?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Throws</p>
                    <p className="text-white font-medium">{profile.throwing_hand}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Order ID</p>
                    <p className="text-white font-mono text-xs">{orderId?.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Membership choice */}
            <div className="card">
              <h2 className="text-base font-semibold text-white">Choose Your Membership</h2>
              <p className="mt-1 text-sm text-slate-400">Both options include one staff-reviewed pitching analysis every two weeks.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMembershipTier('throwing')}
                  className={`rounded-xl border p-4 text-left transition ${membershipTier === 'throwing' ? 'border-electric-blue bg-electric-blue/10 ring-2 ring-electric-blue/25' : 'border-surface-border bg-navy-950 hover:border-slate-600'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-electric-blue-light">Throwing Development</p>
                  <p className="mt-2 text-3xl font-black text-white">$25<span className="text-sm font-medium text-slate-400">/month</span></p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">Pitching mechanics, throwing drills, feedback, and an eight-week throwing plan.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMembershipTier('performance')}
                  className={`relative rounded-xl border p-4 text-left transition ${membershipTier === 'performance' ? 'border-accent-green bg-accent-green/10 ring-2 ring-accent-green/20' : 'border-surface-border bg-navy-950 hover:border-slate-600'}`}
                >
                  <span className="absolute right-3 top-3 rounded-full bg-accent-green/15 px-2 py-1 text-[10px] font-bold uppercase text-accent-green">Most complete</span>
                  <p className="pr-20 text-xs font-bold uppercase tracking-wider text-accent-green">Complete Performance</p>
                  <p className="mt-2 text-3xl font-black text-white">$40<span className="text-sm font-medium text-slate-400">/month</span></p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">Everything in Throwing Development, plus tailored strength and mobility programming.</p>
                </button>
              </div>

              <h3 className="mb-3 mt-6 text-sm font-semibold text-white">
                {membershipTier === 'performance' ? 'Complete Performance includes' : 'Throwing Development includes'}
              </h3>
              <ul className="space-y-2 mb-4">
                {(membershipTier === 'performance' ? PERFORMANCE_ITEMS : THROWING_ITEMS).map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-accent-green flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Consent */}
            <div className="card space-y-4">
              <h2 className="text-base font-semibold text-white">Before You Pay</h2>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-surface-border bg-navy-800 accent-electric-blue"
                />
                <span className="text-sm text-slate-400 leading-relaxed">
                  I have read and agree to the{' '}
                  <Link href="/terms" className="text-electric-blue-light hover:underline" target="_blank">Terms of Service</Link>
                  ,{' '}
                  <Link href="/privacy" className="text-electric-blue-light hover:underline" target="_blank">Privacy Policy</Link>
                  , and{' '}
                  <Link href="/disclaimer" className="text-electric-blue-light hover:underline" target="_blank">Training Disclaimer</Link>.
                  I understand that Pitch Nav provides educational baseball training information and does
                  not provide medical advice, diagnose injuries, or guarantee specific velocity increases.
                </span>
              </label>
            </div>

            <SafetyDisclaimer compact />
          </div>

          {/* Payment card */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Order Total</h3>
                  <p className="text-slate-500 text-sm">Monthly membership</p>
                </div>
                <p className="text-4xl font-black text-white">${membershipTier === 'performance' ? '40' : '25'}<span className="text-sm font-medium text-slate-400">/month</span></p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!agreed || checkoutLoading}
                className="btn-accent w-full justify-center py-4 text-base mb-4"
              >
                {checkoutLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-navy-950 border-t-transparent animate-spin" />
                    Redirecting to Checkout...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Subscribe for ${membershipTier === 'performance' ? '40' : '25'}/month
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                <Shield className="h-3.5 w-3.5" />
                Secured by Stripe · Pitch Nav does not store your card
              </div>

              <hr className="my-4 border-surface-border" />

              <div className="text-xs text-slate-600 space-y-1">
                <p>✓ Secure encrypted connection</p>
                <p>✓ Monthly membership · cancel according to the membership terms</p>
                <p>✓ Video stored in private, access-controlled storage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center">
          <p className="text-slate-400">Loading checkout...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}

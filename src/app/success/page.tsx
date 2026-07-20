'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const sessionId = searchParams.get('session_id')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    // Mark as shown to prevent duplicate processing on refresh
    if (typeof window !== 'undefined' && sessionId) {
      const key = `success_shown_${sessionId}`
      if (sessionStorage.getItem(key)) {
        // Already shown — that's fine, just render
      } else {
        sessionStorage.setItem(key, '1')
      }
      setConfirmed(true)
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-accent-green/10 p-6">
            <CheckCircle className="h-16 w-16 text-accent-green" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4">You&apos;re All Set!</h1>

        <p className="text-lg text-slate-400 mb-6 leading-relaxed">
          Payment confirmed. Your membership is active. Continue to upload your pitching videos; files cannot be saved before payment is verified.
        </p>

        <div className="card mb-8">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-accent-green">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Payment received and confirmed</span>
            </div>
            <div className="flex items-center gap-3 text-accent-green">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Video upload unlocked</span>
            </div>
            <div className="flex items-center gap-3 text-accent-green">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Upload your pitching video next</span>
            </div>
            <div className="flex items-center gap-3 text-electric-blue-light">
              <div className="h-4 w-4 rounded-full border-2 border-electric-blue flex-shrink-0" />
              <span>Staff review: no more than one business day after submission</span>
            </div>
          </div>
        </div>

        {orderId && (
          <div className="card mb-8 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Order ID</p>
            <p className="text-white font-mono">{orderId.slice(0, 8).toUpperCase()}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {orderId && (
            <Link href={`/start-analysis/upload?orderId=${orderId}`} className="btn-primary flex-1 justify-center py-3">Upload My Videos <ArrowRight className="h-4 w-4" /></Link>
          )}
          <Link href="/dashboard" className="btn-secondary flex-1 justify-center py-3">
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-600">
          Questions? Contact{' '}
          <a href="mailto:support@pitchnav.com" className="text-electric-blue-light hover:underline">
            support@pitchnav.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center"><p className="text-slate-400">Loading confirmation...</p></div>}>
      <SuccessContent />
    </Suspense>
  )
}

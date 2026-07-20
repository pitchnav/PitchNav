'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 pt-24 pb-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h1 className="text-3xl font-black text-white sm:text-4xl">Something Went Wrong</h1>
      <p className="mt-3 max-w-md text-slate-400">
        This page ran into a problem. Try again, or contact us if it keeps happening.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn-primary justify-center">
          <RotateCcw className="h-4 w-4" /> Try Again
        </button>
        <Link href="/contact" className="btn-secondary justify-center">
          Contact Support
        </Link>
      </div>
    </div>
  )
}

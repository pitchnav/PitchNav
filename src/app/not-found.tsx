import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 pt-24 pb-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-electric-blue/10">
        <Search className="h-7 w-7 text-electric-blue-light" />
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-electric-blue-light">404</p>
      <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Page Not Found</h1>
      <p className="mt-3 max-w-md text-slate-400">
        We couldn&apos;t find the page you&apos;re looking for. It may have moved, or the link
        might be incorrect.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary justify-center">
          Back to Home <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/dashboard" className="btn-secondary justify-center">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

export function PolicyDocument({ title, children, underReview = true }: {
  title: string
  children: ReactNode
  underReview?: boolean
}) {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:px-8">
      <header className="mb-8">
        <h1 className="page-title text-white">{title}</h1>
        {underReview && <p className="mt-4 text-sm text-brand-blue">Business and legal review in progress</p>}
      </header>
      <div className="policy-body paper-sheet">{children}</div>
    </article>
  )
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="text-xl font-bold text-brand-ink">{title}</h2>{children}</section>
}

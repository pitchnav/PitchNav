import type { ReactNode } from 'react'

export function PolicyDocument({ title, children }: { title: string; children: ReactNode }) {
  return <article className="policy-body mx-auto max-w-3xl px-5 pb-20 pt-28 text-slate-200 sm:px-8">
    <header className="mb-8 border-b border-slate-600 pb-6">
      <h1 className="text-4xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-3 text-sm text-sky-200">Business and legal review in progress</p>
    </header>
    <div className="space-y-8 text-base leading-7">{children}</div>
  </article>
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="text-xl font-bold text-white">{title}</h2>{children}</section>
}

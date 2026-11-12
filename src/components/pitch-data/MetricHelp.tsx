'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { CircleHelp, X } from 'lucide-react'
import type { ReactNode } from 'react'
import guide from '@/lib/pitch-metric-guide.json'

export type PitchMetric = keyof typeof guide

export function MetricHelp({ metric, children, className = '', icon = true, reading }: {
  metric: PitchMetric
  children?: ReactNode
  className?: string
  icon?: boolean
  reading?: string
}) {
  const info = guide[metric]
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button type="button" aria-label={reading ? `${info.label}: ${reading}. Explain metric` : `Explain ${info.label.toLowerCase()}` }
        className={`min-h-11 rounded-sm text-left underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current ${className}`}>
        {children ?? info.label}{icon && <CircleHelp size={14} aria-hidden="true" className="ml-1 inline-block align-middle" />}
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/65" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-brand-paper p-6 text-brand-ink shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <Dialog.Title className="text-2xl font-bold">{info.label}</Dialog.Title>
          <Dialog.Close aria-label="Close explanation" className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-md focus-visible:outline"><X size={22} /></Dialog.Close>
        </div>
        <Dialog.Description className="mt-2 text-base leading-6">{info.definition}</Dialog.Description>
        <p className="mt-4 border-t border-brand-paperLine pt-4 text-sm leading-6">{info.direction}</p>
        <p className="mt-3 text-sm leading-6 text-brand-paperText">{info.context}</p>
        {info.source && <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline" href={info.source} target="_blank" rel="noreferrer">Read the metric definition <span className="sr-only">(opens a new tab)</span></a>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

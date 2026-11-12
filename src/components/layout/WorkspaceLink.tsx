'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function WorkspaceLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const root = href === '/dashboard' || href === '/admin'
  const active = pathname === href || (!root && pathname.startsWith(href + '/'))

  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className="flex min-h-11 items-center gap-3 whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-raised hover:text-white aria-[current=page]:bg-brand-raised aria-[current=page]:text-brand-blue">
      {children}
    </Link>
  )
}

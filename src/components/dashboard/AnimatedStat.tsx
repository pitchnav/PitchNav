'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface AnimatedStatProps {
  label: string
  value: number
  icon: ReactNode
  delayMs: number
}

const COUNT_DURATION_MS = 700

export function AnimatedStat({ label, value, icon, delayMs }: AnimatedStatProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    if (value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      return
    }

    let frame: number
    const startTime = performance.now() + delayMs

    const tick = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < 0) {
        frame = requestAnimationFrame(tick)
        return
      }
      const progress = Math.min(elapsed / COUNT_DURATION_MS, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(eased * value))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, delayMs])

  return (
    <div
      className="card animate-slide-up text-center transition-all duration-200 [animation-fill-mode:backwards] hover:-translate-y-1 hover:border-electric-blue/40"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="mx-auto mb-2 flex h-5 w-5 items-center justify-center">{icon}</div>
      <p className="text-3xl font-black tabular-nums text-white">{displayValue}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

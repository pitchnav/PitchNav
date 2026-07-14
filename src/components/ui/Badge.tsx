import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantStyles = {
    default: 'text-slate-300 bg-slate-700/40',
    success: 'text-accent-green bg-accent-green/10',
    warning: 'text-yellow-400 bg-yellow-400/10',
    error: 'text-red-400 bg-red-400/10',
    info: 'text-electric-blue-light bg-electric-blue/10',
  }

  return (
    <span className={cn('status-badge', variantStyles[variant], className)}>
      {children}
    </span>
  )
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span className={cn('status-badge', ORDER_STATUS_COLORS[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

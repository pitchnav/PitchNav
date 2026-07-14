import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from '@/lib/utils'

interface StatusTimelineProps {
  currentStatus: OrderStatus
  statusHistory?: Array<{
    new_status: OrderStatus
    created_at: string
    note?: string | null
  }>
}

export function StatusTimeline({ currentStatus, statusHistory = [] }: StatusTimelineProps) {
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'refunded'

  const steps = ORDER_STATUS_STEPS
  const currentIdx = steps.indexOf(currentStatus as typeof steps[number])

  return (
    <div className="space-y-0">
      {isCancelled && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              Order {ORDER_STATUS_LABELS[currentStatus]}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Contact support if you have questions about this order.
            </p>
          </div>
        </div>
      )}

      <ol className="relative space-y-0" aria-label="Order progress">
        {steps.map((step, idx) => {
          const isCompleted = currentIdx > idx || currentStatus === 'complete' || currentStatus === 'follow_up_available'
          const isCurrent = step === currentStatus
          const historyEntry = statusHistory.find((h) => h.new_status === step)

          return (
            <li key={step} className="flex gap-4 pb-6 relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-4 top-8 bottom-0 w-0.5',
                    isCompleted ? 'bg-accent-green' : 'bg-surface-border'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-8 w-8 text-accent-green" />
                ) : isCurrent ? (
                  <Clock className="h-8 w-8 text-electric-blue-light animate-pulse-slow" />
                ) : (
                  <Circle className="h-8 w-8 text-slate-700" />
                )}
              </div>

              {/* Content */}
              <div className="pt-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isCompleted ? 'text-white' :
                    isCurrent ? 'text-electric-blue-light' :
                    'text-slate-600'
                  )}
                >
                  {ORDER_STATUS_LABELS[step]}
                </p>
                {historyEntry && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(historyEntry.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {historyEntry.note && ` · ${historyEntry.note}`}
                  </p>
                )}
                {isCurrent && !historyEntry && (
                  <p className="text-xs text-slate-500 mt-0.5">In progress</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

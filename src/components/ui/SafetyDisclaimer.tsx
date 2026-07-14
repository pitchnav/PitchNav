import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SafetyDisclaimerProps {
  compact?: boolean
  className?: string
}

export function SafetyDisclaimer({ compact = false, className }: SafetyDisclaimerProps) {
  if (compact) {
    return (
      <div className={cn('rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4', className)}>
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400/90 leading-relaxed">
            <strong>PitchFrame provides educational baseball training information.</strong>{' '}
            It does not provide medical care, diagnose injuries, calculate clinical injury risk,
            or guarantee increases in velocity. Athletes experiencing pain should stop throwing
            and consult a qualified medical professional.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6', className)}>
      <div className="flex gap-4">
        <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-base font-semibold text-yellow-400 mb-2">
            Training & Safety Disclaimer
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            PitchFrame provides educational baseball training information. It does not provide
            medical care, diagnose injuries, calculate clinical injury risk, or guarantee
            increases in velocity. Mechanics scores and position analysis are coaching tools
            intended to track development in the same athlete over time — not medical scores
            or laboratory biomechanics measurements.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mt-3">
            Athletes experiencing pain while throwing, or who have experienced throwing-related
            pain in the past 30 days, should stop throwing and speak with a parent, athletic
            trainer, physical therapist, or qualified medical professional before continuing.
            PitchFrame is not a medical service and cannot respond to medical emergencies.
          </p>
        </div>
      </div>
    </div>
  )
}

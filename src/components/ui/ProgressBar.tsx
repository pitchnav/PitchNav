import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number          // 0–100
  max?: number
  label?: string
  showValue?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'blue',
  size = 'md',
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  const colorStyles = {
    blue: 'bg-electric-blue',
    green: 'bg-accent-green',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
  }

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-slate-400">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold text-white">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        className={cn('w-full rounded-full bg-navy-700 overflow-hidden', sizeStyles[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colorStyles[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface StepProgressProps {
  steps: string[]
  currentStep: number   // 1-indexed
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">
          Step {currentStep} of {steps.length}
        </span>
        <span className="text-sm font-medium text-white">{steps[currentStep - 1]}</span>
      </div>
      <ProgressBar
        value={currentStep}
        max={steps.length}
        color="blue"
        size="sm"
      />
      <div className="mt-3 flex justify-between">
        {steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              'flex flex-col items-center gap-1',
              i < currentStep - 1 ? 'text-accent-green' :
              i === currentStep - 1 ? 'text-electric-blue-light' :
              'text-slate-600'
            )}
          >
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                i < currentStep - 1 ? 'bg-accent-green' :
                i === currentStep - 1 ? 'bg-electric-blue ring-2 ring-electric-blue/30' :
                'bg-slate-700'
              )}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

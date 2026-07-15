'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { stepHealthSchema, type StepHealthData } from './intakeSchema'
import type { IntakeFormData } from './intakeSchema'

interface Props {
  initialData: Partial<IntakeFormData>
  athleteProfileId: string
  onComplete: (data: Partial<IntakeFormData>) => void
  onBack: () => void
}

interface YesNoProps {
  id: string
  label: string
  registration: ReturnType<ReturnType<typeof useForm<StepHealthData>>['register']>
  error?: string
}

function YesNoField({ id, label, registration, error }: YesNoProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white">{label}</p>
      <div className="flex gap-3">
        {[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }].map(({ value, label: l }) => (
          <label key={value} className="flex-1 cursor-pointer">
            <input
              type="radio"
              value={value}
              className="sr-only peer"
              {...registration}
            />
            <div className="rounded-lg border border-surface-border bg-navy-800 p-3 text-center text-sm font-semibold text-slate-400
              transition-all peer-checked:border-electric-blue peer-checked:bg-electric-blue/10 peer-checked:text-white
              hover:border-electric-blue/50 hover:text-white cursor-pointer">
              {l}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  )
}

export function StepHealth({ initialData, athleteProfileId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<StepHealthData>({
    resolver: zodResolver(stepHealthSchema),
  })

  // Watch for pain flags
  const currentPain = watch('currentPain')
  const showPainWarning = currentPain === true

  async function onSubmit(data: StepHealthData) {
    setLoading(true)
    setServerError('')
    try {
      const healthFlagged = data.currentPain || data.recentPain30Days || data.returnedFromInjury || !data.medicallyCLeared

      const { error } = await supabase
        .from('athlete_profiles')
        .update({
          current_pain: data.currentPain,
          recent_pain_30_days: data.recentPain30Days,
          returned_from_injury: data.returnedFromInjury,
          medically_cleared: data.medicallyCLeared,
          health_notes: data.healthNotes ?? null,
          health_flagged: healthFlagged,
        })
        .eq('id', athleteProfileId)

      if (error) throw error
      onComplete(data)
    } catch {
      setServerError('Could not save your information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Step 5: Health & Safety Screening</h2>
        <p className="text-sm text-slate-400">
          This screening helps inform your reviewer. It is not a medical evaluation.
          All responses are kept confidential.
        </p>
      </div>

      {/* Pain warning */}
      {showPainWarning && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-2">
                Current Pain Reported
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                <strong>Pitch Nav cannot diagnose or treat injuries.</strong> Athletes
                experiencing pain should <strong>stop throwing</strong> and speak with a parent,
                athletic trainer, physical therapist, or qualified medical professional before
                continuing. You may save your progress, but our team will review your submission
                before proceeding with your analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <YesNoField
          id="currentPain"
          label="Are you currently experiencing pain while throwing?"
          registration={register('currentPain', { setValueAs: (v) => v === 'true' })}
          error={errors.currentPain?.message}
        />

        <YesNoField
          id="recentPain30Days"
          label="Have you experienced throwing-related pain in the last 30 days?"
          registration={register('recentPain30Days', { setValueAs: (v) => v === 'true' })}
          error={errors.recentPain30Days?.message}
        />

        <YesNoField
          id="returnedFromInjury"
          label="Have you recently returned from a throwing-related injury?"
          registration={register('returnedFromInjury', { setValueAs: (v) => v === 'true' })}
          error={errors.returnedFromInjury?.message}
        />

        <YesNoField
          id="medicallyCLeared"
          label="Are you medically cleared to throw at full intensity?"
          registration={register('medicallyCLeared', { setValueAs: (v) => v === 'true' })}
          error={errors.medicallyCLeared?.message}
        />
      </div>

      <div>
        <label htmlFor="healthNotes" className="label">
          Anything else your reviewer should know about your health history? (optional)
        </label>
        <textarea
          id="healthNotes"
          className="input resize-none"
          rows={3}
          placeholder="Any surgeries, long-term injuries, current restrictions, etc."
          {...register('healthNotes')}
        />
      </div>

      <div className="rounded-lg border border-slate-700/40 bg-navy-800 p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Pitch Nav provides educational baseball training information only. Health-screening
          responses are not a medical evaluation and do not constitute medical clearance to throw.
          Athletes in pain should consult a qualified medical professional.
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary flex-1 justify-center py-3">← Back</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
          {loading ? 'Saving...' : 'Continue to Video Upload →'}
        </button>
      </div>
    </form>
  )
}

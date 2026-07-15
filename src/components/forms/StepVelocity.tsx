'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { stepVelocitySchema, type StepVelocityData } from './intakeSchema'
import type { IntakeFormData } from './intakeSchema'
import { VELOCITY_SOURCE_LABELS } from '@/lib/utils'

interface Props {
  initialData: Partial<IntakeFormData>
  athleteProfileId: string
  onComplete: (data: Partial<IntakeFormData>) => void
  onBack: () => void
}

export function StepVelocity({ initialData, athleteProfileId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<StepVelocityData>({
    resolver: zodResolver(stepVelocitySchema),
    defaultValues: {
      currentAvgVelocity: initialData.currentAvgVelocity,
      currentMaxVelocity: initialData.currentMaxVelocity,
      goalVelocity: initialData.goalVelocity,
      velocitySource: initialData.velocitySource,
    },
  })

  async function onSubmit(data: StepVelocityData) {
    setLoading(true)
    setServerError('')
    try {
      const { error } = await supabase
        .from('athlete_profiles')
        .update({
          current_avg_velocity: data.currentAvgVelocity,
          current_max_velocity: data.currentMaxVelocity,
          goal_velocity: data.goalVelocity,
          velocity_source: data.velocitySource,
          velocity_measured_at: data.velocityMeasuredAt ?? null,
          bullpen_intensity: data.bullpenIntensity ?? null,
          pitches_per_week: data.pitchesPerWeek ?? null,
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
        <h2 className="text-xl font-bold text-white mb-1">Step 3: Velocity Profile</h2>
        <p className="text-sm text-slate-400">
          All velocity data is athlete-provided and will be clearly labeled as such in your report.
          Pitch Nav does not independently verify velocity readings.
        </p>
      </div>

      <div className="rounded-lg border border-electric-blue/20 bg-electric-blue/5 p-4">
        <p className="text-xs text-electric-blue-glow leading-relaxed">
          ℹ️ <strong>Athlete-Provided Velocity:</strong> All velocity information you enter here will
          be labeled "athlete-provided" in your report. Pitch Nav does not calculate velocity from
          phone video without additional calibration data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label htmlFor="currentAvgVelocity" className="label">Current Average Velocity (mph) *</label>
          <input
            id="currentAvgVelocity"
            type="number"
            className="input"
            placeholder="76"
            {...register('currentAvgVelocity', { valueAsNumber: true })}
          />
          {errors.currentAvgVelocity && <p className="error-message">{errors.currentAvgVelocity.message}</p>}
        </div>

        <div>
          <label htmlFor="currentMaxVelocity" className="label">Current Max Velocity (mph) *</label>
          <input
            id="currentMaxVelocity"
            type="number"
            className="input"
            placeholder="81"
            {...register('currentMaxVelocity', { valueAsNumber: true })}
          />
          {errors.currentMaxVelocity && <p className="error-message">{errors.currentMaxVelocity.message}</p>}
        </div>

        <div>
          <label htmlFor="goalVelocity" className="label">Goal Velocity (mph) *</label>
          <input
            id="goalVelocity"
            type="number"
            className="input"
            placeholder="88"
            {...register('goalVelocity', { valueAsNumber: true })}
          />
          {errors.goalVelocity && <p className="error-message">{errors.goalVelocity.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="velocitySource" className="label">How Was Velocity Measured? *</label>
          <select id="velocitySource" className="input" {...register('velocitySource')}>
            <option value="">Select source...</option>
            {Object.entries(VELOCITY_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.velocitySource && <p className="error-message">{errors.velocitySource.message}</p>}
        </div>

        <div>
          <label htmlFor="velocityMeasuredAt" className="label">When Was Velocity Last Measured?</label>
          <input
            id="velocityMeasuredAt"
            type="date"
            className="input"
            {...register('velocityMeasuredAt')}
          />
        </div>

        <div>
          <label htmlFor="bullpenIntensity" className="label">Typical Bullpen Intensity</label>
          <select id="bullpenIntensity" className="input" {...register('bullpenIntensity')}>
            <option value="">Select...</option>
            <option value="game_intensity">Game intensity</option>
            <option value="moderate">Moderate</option>
            <option value="light">Light / command focus</option>
            <option value="varies">Varies</option>
          </select>
        </div>

        <div>
          <label htmlFor="pitchesPerWeek" className="label">Pitches Per Week (approx.)</label>
          <input
            id="pitchesPerWeek"
            type="number"
            className="input"
            placeholder="100"
            {...register('pitchesPerWeek', { valueAsNumber: true })}
          />
        </div>
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary flex-1 justify-center py-3">
          ← Back
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
          {loading ? 'Saving...' : 'Continue to Pitching Profile →'}
        </button>
      </div>
    </form>
  )
}

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { stepPhysicalSchema, type StepPhysicalData } from './intakeSchema'
import type { IntakeFormData } from './intakeSchema'

interface Props {
  initialData: Partial<IntakeFormData>
  athleteProfileId: string
  onComplete: (data: Partial<IntakeFormData>) => void
  onBack: () => void
}

const POSITIONS = ['Pitcher', 'Starting Pitcher', 'Relief Pitcher', 'Two-Way Player / Utility']
const LEVELS = [
  { value: 'middle_school', label: 'Middle School' },
  { value: 'high_school', label: 'High School' },
  { value: 'travel', label: 'Travel Baseball' },
  { value: 'college', label: 'College' },
  { value: 'adult_recreational', label: 'Adult / Recreational' },
]

export function StepPhysical({ initialData, athleteProfileId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<StepPhysicalData>({
    resolver: zodResolver(stepPhysicalSchema),
    defaultValues: {
      heightFeet: initialData.heightFeet,
      heightInches: initialData.heightInches,
      weightLbs: initialData.weightLbs,
      throwingHand: initialData.throwingHand,
      primaryPosition: initialData.primaryPosition,
      playingLevel: initialData.playingLevel,
    },
  })

  async function onSubmit(data: StepPhysicalData) {
    setLoading(true)
    setServerError('')
    try {
      const { error } = await supabase
        .from('athlete_profiles')
        .update({
          height_feet: data.heightFeet,
          height_inches: data.heightInches,
          weight_lbs: data.weightLbs,
          throwing_hand: data.throwingHand,
          primary_position: data.primaryPosition,
          school_org: data.schoolOrg ?? null,
          graduation_year: data.graduationYear ?? null,
          playing_level: data.playingLevel,
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
        <h2 className="text-xl font-bold text-white mb-1">Step 2: Physical Profile</h2>
        <p className="text-sm text-slate-400">Tell us about the athlete's physical attributes and playing level.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label">Height *</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Feet"
                min={3} max={8}
                {...register('heightFeet', { valueAsNumber: true })}
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Inches"
                min={0} max={11}
                {...register('heightInches', { valueAsNumber: true })}
              />
            </div>
          </div>
          {(errors.heightFeet || errors.heightInches) && (
            <p className="error-message">Enter height in feet and inches</p>
          )}
        </div>

        <div>
          <label htmlFor="weightLbs" className="label">Weight (lbs) *</label>
          <input
            id="weightLbs"
            type="number"
            className="input"
            placeholder="175"
            {...register('weightLbs', { valueAsNumber: true })}
          />
          {errors.weightLbs && <p className="error-message">{errors.weightLbs.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label">Throwing Hand *</label>
          <div className="flex gap-3">
            {[{ value: 'right', label: 'Right-Handed' }, { value: 'left', label: 'Left-Handed' }].map(({ value, label }) => (
              <label key={value} className="flex-1 cursor-pointer">
                <input type="radio" value={value} className="sr-only" {...register('throwingHand')} />
                <div className={`rounded-lg border p-3 text-center text-sm font-semibold transition-all
                  peer-checked:border-electric-blue peer-checked:bg-electric-blue/10`}>
                  {label}
                </div>
              </label>
            ))}
          </div>
          {errors.throwingHand && <p className="error-message">{errors.throwingHand.message}</p>}
        </div>

        <div>
          <label htmlFor="primaryPosition" className="label">Primary Position *</label>
          <select id="primaryPosition" className="input" {...register('primaryPosition')}>
            <option value="">Select position...</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.primaryPosition && <p className="error-message">{errors.primaryPosition.message}</p>}
        </div>

        <div>
          <label htmlFor="playingLevel" className="label">Playing Level *</label>
          <select id="playingLevel" className="input" {...register('playingLevel')}>
            <option value="">Select level...</option>
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          {errors.playingLevel && <p className="error-message">{errors.playingLevel.message}</p>}
        </div>

        <div>
          <label htmlFor="schoolOrg" className="label">School or Organization (optional)</label>
          <input id="schoolOrg" type="text" className="input" placeholder="Westview High School" {...register('schoolOrg')} />
        </div>

        <div>
          <label htmlFor="graduationYear" className="label">Graduation Year (optional)</label>
          <input
            id="graduationYear"
            type="number"
            className="input"
            placeholder="2026"
            {...register('graduationYear', { valueAsNumber: true })}
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
          {loading ? 'Saving...' : 'Continue to Velocity Profile →'}
        </button>
      </div>
    </form>
  )
}

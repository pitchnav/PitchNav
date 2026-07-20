'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { stepPitchingSchema, type StepPitchingData } from './intakeSchema'
import type { IntakeFormData } from './intakeSchema'

interface Props {
  initialData: Partial<IntakeFormData>
  athleteProfileId: string
  onComplete: (data: Partial<IntakeFormData>) => void
  onBack: () => void
}

const PITCH_TYPES = ['Four-seam fastball', 'Two-seam fastball', 'Sinker', 'Cutter']
const SECONDARY_PITCHES = ['Curveball', 'Slider', 'Changeup', 'Splitter', 'Knuckleball', 'Screwball', 'Circle changeup']
const FASTBALL_TYPES = ['Four-seam fastball', 'Two-seam fastball / Sinker', 'Cutter', 'Other']

export function StepPitching({ initialData, athleteProfileId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, control, formState: { errors } } = useForm<StepPitchingData>({
    resolver: zodResolver(stepPitchingSchema),
    defaultValues: {
      fastballType: initialData.fastballType,
      secondaryPitches: initialData.secondaryPitches ?? [],
      yearsPitching: initialData.yearsPitching,
      currentCoach: initialData.currentCoach,
      throwingProgram: initialData.throwingProgram,
      strengthProgram: initialData.strengthProgram,
      mainGoal: initialData.mainGoal,
      mechanicalConcern: initialData.mechanicalConcern,
      previousFeedback: initialData.previousFeedback,
      upcomingDeadline: initialData.upcomingDeadline,
    },
  })

  async function onSubmit(data: StepPitchingData) {
    setLoading(true)
    setServerError('')
    try {
      const { error } = await supabase
        .from('athlete_profiles')
        .update({
          fastball_type: data.fastballType ?? null,
          secondary_pitches: data.secondaryPitches ?? [],
          years_pitching: data.yearsPitching ?? null,
          current_coach: data.currentCoach ?? null,
          throwing_program: data.throwingProgram ?? null,
          strength_program: data.strengthProgram ?? null,
          main_goal: data.mainGoal ?? null,
          mechanical_concern: data.mechanicalConcern ?? null,
          previous_feedback: data.previousFeedback ?? null,
          upcoming_deadline: data.upcomingDeadline ?? null,
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
        <h2 className="text-xl font-bold text-white mb-1">Step 4: Pitching Profile</h2>
        <p className="text-sm text-slate-400">Help your reviewer understand your pitching background and goals.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="fastballType" className="label">Primary Fastball Type</label>
          <select id="fastballType" className="input" {...register('fastballType')}>
            <option value="">Select...</option>
            {FASTBALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="yearsPitching" className="label">Years Pitching Competitively</label>
          <input
            id="yearsPitching"
            type="number"
            className="input"
            placeholder="5"
            {...register('yearsPitching', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <label className="label">Secondary Pitches (select all that apply)</label>
        <Controller
          control={control}
          name="secondaryPitches"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {SECONDARY_PITCHES.map((pitch) => {
                const checked = field.value?.includes(pitch) ?? false
                return (
                  <button
                    key={pitch}
                    type="button"
                    onClick={() => {
                      const current = field.value ?? []
                      field.onChange(
                        checked ? current.filter((p) => p !== pitch) : [...current, pitch]
                      )
                    }}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                      checked
                        ? 'border-electric-blue bg-electric-blue/10 text-electric-blue-light'
                        : 'border-surface-border text-slate-400 hover:border-electric-blue/50 hover:text-white'
                    }`}
                  >
                    {pitch}
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="currentCoach" className="label">Current Pitching Coach (optional)</label>
          <input id="currentCoach" type="text" className="input" placeholder="Coach name or 'None'" {...register('currentCoach')} />
        </div>

        <div>
          <label htmlFor="throwingProgram" className="label">Current Throwing Program</label>
          <input id="throwingProgram" type="text" className="input" placeholder="e.g., Tread Athletics, Driveline, None" {...register('throwingProgram')} />
        </div>

        <div>
          <label htmlFor="strengthProgram" className="label">Current Strength Program</label>
          <input id="strengthProgram" type="text" className="input" placeholder="e.g., 3x/week gym, none" {...register('strengthProgram')} />
        </div>
      </div>

      <div>
        <label htmlFor="mainGoal" className="label">Main Goal for This Analysis</label>
        <textarea id="mainGoal" className="input resize-none" rows={2}
          placeholder="What's the most important thing you want to get out of this analysis?"
          {...register('mainGoal')} />
      </div>

      <div>
        <label htmlFor="mechanicalConcern" className="label">Biggest Mechanical Concern</label>
        <textarea id="mechanicalConcern" className="input resize-none" rows={2}
          placeholder="What do you think is holding your mechanics back?"
          {...register('mechanicalConcern')} />
      </div>

      <div>
        <label htmlFor="previousFeedback" className="label">Previous Coaching Feedback (optional)</label>
        <textarea id="previousFeedback" className="input resize-none" rows={2}
          placeholder="What have coaches told you before?"
          {...register('previousFeedback')} />
      </div>

      <div>
        <label htmlFor="upcomingDeadline" className="label">Upcoming Tryout, Showcase, or Recruiting Deadline (optional)</label>
        <input id="upcomingDeadline" type="text" className="input"
          placeholder="e.g., Summer showcase July 15, fall college tryouts"
          {...register('upcomingDeadline')} />
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary flex-1 justify-center py-3">← Back</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
          {loading ? 'Saving...' : 'Continue to Health Screening →'}
        </button>
      </div>
    </form>
  )
}

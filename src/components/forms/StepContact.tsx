'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { stepContactSchema, type StepContactData } from './intakeSchema'
import { calculateAge } from '@/lib/utils'
import type { IntakeFormData } from './intakeSchema'
import Link from 'next/link'

interface Props {
  initialData: Partial<IntakeFormData>
  userId: string
  existingProfileId?: string | null
  onComplete: (data: Partial<IntakeFormData>, profileId?: string) => void
}

export function StepContact({ initialData, userId, existingProfileId, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<StepContactData>({
    resolver: zodResolver(stepContactSchema),
    defaultValues: {
      athleteFullName: initialData.athleteFullName ?? '',
      athleteEmail: initialData.athleteEmail ?? '',
      communicationPref: initialData.communicationPref ?? 'email',
      termsAgreed: false,
      privacyAgreed: false,
    },
  })

  const dob = watch('dateOfBirth')
  const age = dob ? calculateAge(dob) : null
  const requiresGuardian = age !== null && age < 18

  async function onSubmit(data: StepContactData) {
    setLoading(true)
    setServerError('')
    try {
      // Upsert athlete profile (step 1 fields only)
      const profileFields = {
          user_id: userId,
          athlete_full_name: data.athleteFullName,
          athlete_email: data.athleteEmail,
          phone_number: data.phoneNumber ?? null,
          date_of_birth: data.dateOfBirth,
          city: data.city ?? null,
          state: data.state ?? null,
          communication_pref: data.communicationPref,
          guardian_name: data.guardianName ?? null,
          guardian_email: data.guardianEmail ?? null,
          guardian_consented: data.guardianConsented ?? false,
          guardian_consented_at: data.guardianConsented ? new Date().toISOString() : null,
          terms_agreed: data.termsAgreed,
          terms_agreed_at: data.termsAgreed ? new Date().toISOString() : null,
          privacy_agreed: data.privacyAgreed,
          privacy_agreed_at: data.privacyAgreed ? new Date().toISOString() : null,
          consent_anonymous_clips: data.consentAnonymousClips ?? false,
          consent_athlete_name: data.consentAthleteName ?? false,
          consent_testimonial: data.consentTestimonial ?? false,
          consent_before_after: data.consentBeforeAfter ?? false,
        }
      const query = existingProfileId
        ? supabase.from('athlete_profiles').update(profileFields).eq('id', existingProfileId).eq('user_id', userId)
        : supabase.from('athlete_profiles').insert(profileFields)
      const { data: profile, error } = await query
        .select()
        .single()

      if (error) throw error
      onComplete(data, profile.id)
    } catch (err: unknown) {
      const databaseError = err as { code?: string; message?: string }
      setServerError(
        `Could not save your information. ${databaseError.code ? `Error ${databaseError.code}: ` : ''}${databaseError.message ?? 'Please try again.'}`
      )
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Step 1: Contact & Consent</h2>
        <p className="text-sm text-slate-400">Tell us about the athlete. All fields marked * are required.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor="athleteFullName" className="label">Athlete Full Name *</label>
          <input
            id="athleteFullName"
            type="text"
            className="input"
            placeholder="First Last"
            {...register('athleteFullName')}
          />
          {errors.athleteFullName && <p className="error-message">{errors.athleteFullName.message}</p>}
        </div>

        <div>
          <label htmlFor="athleteEmail" className="label">Athlete Email *</label>
          <input id="athleteEmail" type="email" className="input" placeholder="athlete@email.com" {...register('athleteEmail')} />
          {errors.athleteEmail && <p className="error-message">{errors.athleteEmail.message}</p>}
        </div>

        <div>
          <label htmlFor="phoneNumber" className="label">Phone Number</label>
          <input id="phoneNumber" type="tel" className="input" placeholder="(555) 000-0000" {...register('phoneNumber')} />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="label">Date of Birth *</label>
          <input id="dateOfBirth" type="date" className="input" {...register('dateOfBirth')} />
          {errors.dateOfBirth && <p className="error-message">{errors.dateOfBirth.message}</p>}
          {age !== null && (
            <p className="text-xs text-slate-500 mt-1">Age: {age} years old</p>
          )}
        </div>

        <div>
          <label htmlFor="communicationPref" className="label">Preferred Contact</label>
          <select id="communicationPref" className="input" {...register('communicationPref')}>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="text">Text Message</option>
          </select>
        </div>

        <div>
          <label htmlFor="city" className="label">City</label>
          <input id="city" type="text" className="input" placeholder="City" {...register('city')} />
        </div>

        <div>
          <label htmlFor="state" className="label">State</label>
          <input id="state" type="text" className="input" placeholder="State" {...register('state')} />
        </div>
      </div>

      {/* Guardian section — only shown if under 18 */}
      {requiresGuardian && (
        <div className="rounded-xl border border-electric-blue/30 bg-electric-blue/5 p-5 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Parent / Guardian Information</h3>
            <p className="text-sm text-slate-400">
              Required for athletes under 18. The parent or guardian must complete this section.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="guardianName" className="label">Guardian Full Name *</label>
              <input id="guardianName" type="text" className="input" {...register('guardianName')} />
            </div>
            <div>
              <label htmlFor="guardianEmail" className="label">Guardian Email *</label>
              <input id="guardianEmail" type="email" className="input" {...register('guardianEmail')} />
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-surface-border bg-navy-800 accent-electric-blue"
              {...register('guardianConsented')}
            />
            <span className="text-sm text-slate-300">
              I am the parent or legal guardian of this athlete. I have reviewed the{' '}
              <Link href="/terms" className="text-electric-blue-light hover:underline" target="_blank">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-electric-blue-light hover:underline" target="_blank">Privacy Policy</Link>
              {' '}and I consent to the submission of this athlete's pitching videos and personal information for analysis. I confirm that this athlete is at least 13 years old.
            </span>
          </label>
        </div>
      )}

      {/* Required consents */}
      <div className="space-y-3 pt-2 border-t border-surface-border">
        <h3 className="text-sm font-semibold text-white">Required Agreements</h3>
        {[
          { name: 'termsAgreed', label: 'I agree to the Terms of Service', href: '/terms', error: errors.termsAgreed },
          { name: 'privacyAgreed', label: 'I agree to the Privacy Policy', href: '/privacy', error: errors.privacyAgreed },
        ].map(({ name, label, href, error }) => (
          <div key={name}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-surface-border bg-navy-800 accent-electric-blue"
                {...register(name as keyof StepContactData)}
              />
              <span className="text-sm text-slate-300">
                {label} —{' '}
                <Link href={href} className="text-electric-blue-light hover:underline" target="_blank">
                  View
                </Link>
              </span>
            </label>
            {error && <p className="error-message ml-7">{error.message}</p>}
          </div>
        ))}
      </div>

      {/* Optional educational use consents */}
      <div className="space-y-3 pt-2 border-t border-surface-border">
        <div>
          <h3 className="text-sm font-semibold text-white">Optional Permissions</h3>
          <p className="text-xs text-slate-500 mt-1">These are completely optional and not required to use the service.</p>
        </div>
        {[
          { name: 'consentAnonymousClips', label: 'Pitch Nav may use anonymous clips from my analysis for educational or instructional content.' },
          { name: 'consentAthleteName', label: "Pitch Nav may use the athlete's name in connection with educational content." },
          { name: 'consentTestimonial', label: 'Pitch Nav may use a testimonial from this athlete.' },
          { name: 'consentBeforeAfter', label: 'Pitch Nav may use before-and-after comparison clips.' },
        ].map(({ name, label }) => (
          <label key={name} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-surface-border bg-navy-800 accent-electric-blue"
              {...register(name as keyof StepContactData)}
            />
            <span className="text-sm text-slate-500">{label}</span>
          </label>
        ))}
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
        {loading ? 'Saving...' : 'Continue to Physical Profile →'}
      </button>
    </form>
  )
}

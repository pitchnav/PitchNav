'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AI_DRAFT_PERMISSION_VERSION } from '@/lib/ai-draft-permission'
import { StepProgress } from '@/components/ui/ProgressBar'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { StepContact } from '@/components/forms/StepContact'
import { StepPhysical } from '@/components/forms/StepPhysical'
import { StepVelocity } from '@/components/forms/StepVelocity'
import { StepPitching } from '@/components/forms/StepPitching'
import { StepHealth } from '@/components/forms/StepHealth'
import type { IntakeFormData } from '@/components/forms/intakeSchema'

const STEPS = [
  'Contact & Consent',
  'Physical Profile',
  'Velocity Profile',
  'Pitching Profile',
  'Health Screening',
]

export default function StartAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<IntakeFormData>>({})
  const [athleteProfileId, setAthleteProfileId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [canSaveAiPermission, setCanSaveAiPermission] = useState(false)
  const [canSaveOptionalPermissions, setCanSaveOptionalPermissions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [membershipPlan, setMembershipPlan] = useState<'throwing' | 'performance'>('throwing')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const requestedPlan = new URLSearchParams(window.location.search).get('plan')
    const selectedPlan = requestedPlan === 'performance' ? 'performance' : requestedPlan === 'throwing' ? 'throwing' : null
    if (selectedPlan) setMembershipPlan(selectedPlan)
    try {
      localStorage.removeItem('pitch-nav-membership-plan') // Older versions kept this across accounts.
      if (selectedPlan) sessionStorage.setItem('pitch-nav-membership-plan', selectedPlan)
      else if (sessionStorage.getItem('pitch-nav-membership-plan') === 'performance') setMembershipPlan('performance')
    } catch { /* The intake works without browser storage. */ }

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirectTo=/start-analysis')
        return
      }
      setUserId(user.id)
      const { data: base } = await supabase.from('athlete_profiles').select('id,athlete_full_name,athlete_email,phone_number,date_of_birth,communication_pref,guardian_name,guardian_email,guardian_consented,consent_anonymous_clips,consent_athlete_name,consent_testimonial,consent_before_after,height_feet,height_inches,weight_lbs,throwing_hand,primary_position,school_org,graduation_year,playing_level,current_avg_velocity,current_max_velocity,goal_velocity,velocity_source,velocity_measured_at,bullpen_intensity,pitches_per_week,health_notes,fastball_type,secondary_pitches,years_pitching,throwing_program,strength_program,main_goal,mechanical_concern,previous_feedback,upcoming_deadline').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      let choices = supabase.from('athlete_profiles').select('public_permission_version').eq('user_id', user.id)
      choices = base ? choices.eq('id', base.id) : choices.limit(0)
      let aiChoice = supabase.from('athlete_profiles').select('consent_ai_draft,ai_draft_permission_version').eq('user_id', user.id)
      aiChoice = base ? aiChoice.eq('id', base.id) : aiChoice.limit(0)
      const [permission, ai] = await Promise.all([choices.maybeSingle(), aiChoice.maybeSingle()])
      setCanSaveAiPermission(!ai.error)
      setCanSaveOptionalPermissions(!permission.error)
      const saved = base && { ...base, consent_ai_draft: ai.data?.consent_ai_draft, public_permission_version: permission.data?.public_permission_version }
      if (saved) {
        setAthleteProfileId(saved.id)
        setFormData({
          athleteFullName: saved.athlete_full_name,
          athleteEmail: saved.athlete_email,
          phoneNumber: saved.phone_number ?? '', dateOfBirth: saved.date_of_birth,
          communicationPref: saved.communication_pref ?? 'email',
          guardianName: saved.guardian_name ?? '', guardianEmail: saved.guardian_email ?? '', guardianConsented: saved.guardian_consented,
          consentAiDraft: saved.consent_ai_draft === true && ai.data?.ai_draft_permission_version === AI_DRAFT_PERMISSION_VERSION,
          consentAnonymousClips: saved.public_permission_version === 1 && saved.consent_anonymous_clips === true, consentAthleteName: saved.public_permission_version === 1 && saved.consent_athlete_name === true, consentTestimonial: saved.public_permission_version === 1 && saved.consent_testimonial === true, consentBeforeAfter: saved.public_permission_version === 1 && saved.consent_before_after === true,
          heightFeet: saved.height_feet ?? undefined, heightInches: saved.height_inches ?? undefined, weightLbs: saved.weight_lbs ?? undefined,
          throwingHand: saved.throwing_hand ?? undefined, primaryPosition: saved.primary_position ?? undefined, schoolOrg: saved.school_org ?? '', graduationYear: saved.graduation_year ?? undefined, playingLevel: saved.playing_level ?? undefined,
          currentAvgVelocity: saved.current_avg_velocity ?? undefined, currentMaxVelocity: saved.current_max_velocity ?? undefined, goalVelocity: saved.goal_velocity ?? undefined, velocitySource: saved.velocity_source ?? undefined, velocityMeasuredAt: saved.velocity_measured_at ?? '', bullpenIntensity: saved.bullpen_intensity ?? undefined, pitchesPerWeek: saved.pitches_per_week ?? undefined,
          healthNotes: saved.health_notes ?? '',
          fastballType: saved.fastball_type ?? '', secondaryPitches: saved.secondary_pitches ?? [], yearsPitching: saved.years_pitching ?? undefined, throwingProgram: saved.throwing_program ?? '', strengthProgram: saved.strength_program ?? '', mainGoal: saved.main_goal ?? '', mechanicalConcern: saved.mechanical_concern ?? '', previousFeedback: saved.previous_feedback ?? '', upcomingDeadline: saved.upcoming_deadline ?? '',
        })
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  function handleStepComplete(stepData: Partial<IntakeFormData>, profileId?: string) {
    const merged = { ...formData, ...stepData }
    setFormData(merged)
    if (profileId) setAthleteProfileId(profileId)
    if (currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1)
    } else {
      // Navigate to video upload step with the created profile
      router.push(`/start-analysis/upload?profileId=${athleteProfileId}&plan=${membershipPlan}`)
    }
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Start Your Analysis</h1>
          <p className="mt-2 text-slate-400">
            Complete your athlete profile to begin. Your information is saved as you go.
          </p>
          <p className="mt-3 text-sm font-semibold text-electric-blue-light">
            Selected: {membershipPlan === 'performance' ? '$40/month Complete Performance' : '$25/month Throwing Development'}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <StepProgress steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Step content */}
        <div className="card">
          {currentStep === 1 && (
            <StepContact
              canSaveAiPermission={canSaveAiPermission}
              canSaveOptionalPermissions={canSaveOptionalPermissions}
              initialData={formData}
              userId={userId!}
              existingProfileId={athleteProfileId}
              onComplete={handleStepComplete}
            />
          )}
          {currentStep === 2 && (
            <StepPhysical
              initialData={formData}
              athleteProfileId={athleteProfileId!}
              onComplete={handleStepComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <StepVelocity
              initialData={formData}
              athleteProfileId={athleteProfileId!}
              onComplete={handleStepComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <StepPitching
              initialData={formData}
              athleteProfileId={athleteProfileId!}
              onComplete={handleStepComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === 5 && (
            <StepHealth
              initialData={formData}
              athleteProfileId={athleteProfileId!}
              onComplete={handleStepComplete}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Safety disclaimer on health step */}
        {currentStep === 5 && (
          <div className="mt-6">
            <SafetyDisclaimer compact />
          </div>
        )}
      </div>
    </div>
  )
}

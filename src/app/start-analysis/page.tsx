'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirectTo=/start-analysis')
        return
      }
      setUserId(user.id)
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
      router.push(`/start-analysis/upload?profileId=${athleteProfileId}`)
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
        </div>

        {/* Progress */}
        <div className="mb-8">
          <StepProgress steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Step content */}
        <div className="card">
          {currentStep === 1 && (
            <StepContact
              initialData={formData}
              userId={userId!}
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

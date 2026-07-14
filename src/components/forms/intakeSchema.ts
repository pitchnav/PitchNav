import { z } from 'zod'

// ── Step 1: Contact ──────────────────────────────────────────

export const stepContactSchema = z.object({
  athleteFullName: z.string().min(2, 'Please enter the athlete\'s full name'),
  athleteEmail: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val)
    const today = new Date()
    const age = today.getFullYear() - date.getFullYear()
    return age >= 13 && age <= 100
  }, 'Athlete must be at least 13 years old'),
  city: z.string().optional(),
  state: z.string().optional(),
  communicationPref: z.enum(['email', 'phone', 'text']).default('email'),
  // Guardian (required if under 18)
  guardianName: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal('')),
  guardianConsented: z.boolean().optional(),
  // Terms
  termsAgreed: z.boolean().refine((val) => val === true, 'You must agree to the terms'),
  privacyAgreed: z.boolean().refine((val) => val === true, 'You must agree to the privacy policy'),
  // Optional educational use consents
  consentAnonymousClips: z.boolean().optional(),
  consentAthleteName: z.boolean().optional(),
  consentTestimonial: z.boolean().optional(),
  consentBeforeAfter: z.boolean().optional(),
})

// ── Step 2: Physical Profile ─────────────────────────────────

export const stepPhysicalSchema = z.object({
  heightFeet: z.number({ invalid_type_error: 'Enter height in feet' }).int().min(3).max(8),
  heightInches: z.number({ invalid_type_error: 'Enter inches' }).int().min(0).max(11),
  weightLbs: z.number({ invalid_type_error: 'Enter weight in pounds' }).int().min(50).max(400),
  throwingHand: z.enum(['right', 'left'], { required_error: 'Select throwing hand' }),
  primaryPosition: z.string().min(1, 'Select a position'),
  schoolOrg: z.string().optional(),
  graduationYear: z.number().int().min(2020).max(2040).optional(),
  playingLevel: z.enum(['middle_school', 'high_school', 'travel', 'college', 'adult_recreational'], {
    required_error: 'Select a playing level',
  }),
})

// ── Step 3: Velocity Profile ─────────────────────────────────

export const stepVelocitySchema = z.object({
  currentAvgVelocity: z.number({ invalid_type_error: 'Enter velocity in mph' }).int().min(40).max(110),
  currentMaxVelocity: z.number({ invalid_type_error: 'Enter velocity in mph' }).int().min(40).max(110),
  goalVelocity: z.number({ invalid_type_error: 'Enter goal velocity' }).int().min(40).max(110),
  velocitySource: z.enum([
    'pocket_radar', 'stalker', 'rapsodo', 'trackman',
    'stadium_radar', 'coach_provided', 'estimated', 'other',
  ], { required_error: 'How was velocity measured?' }),
  velocityMeasuredAt: z.string().optional(),
  bullpenIntensity: z.enum(['game_intensity', 'moderate', 'light', 'varies']).optional(),
  pitchesPerWeek: z.number().int().min(0).max(1000).optional(),
})

// ── Step 4: Pitching Profile ─────────────────────────────────

export const stepPitchingSchema = z.object({
  fastballType: z.string().optional(),
  secondaryPitches: z.array(z.string()).optional(),
  yearsPitching: z.number().int().min(0).max(30).optional(),
  currentCoach: z.string().optional(),
  throwingProgram: z.string().optional(),
  strengthProgram: z.string().optional(),
  mainGoal: z.string().optional(),
  mechanicalConcern: z.string().optional(),
  previousFeedback: z.string().optional(),
  upcomingDeadline: z.string().optional(),
})

// ── Step 5: Health & Safety ───────────────────────────────────

export const stepHealthSchema = z.object({
  currentPain: z.boolean({ required_error: 'Please answer this question' }),
  recentPain30Days: z.boolean({ required_error: 'Please answer this question' }),
  returnedFromInjury: z.boolean({ required_error: 'Please answer this question' }),
  medicallyCLeared: z.boolean({ required_error: 'Please answer this question' }),
  healthNotes: z.string().optional(),
})

// Combined full intake schema
export const intakeFormSchema = stepContactSchema
  .merge(stepPhysicalSchema)
  .merge(stepVelocitySchema)
  .merge(stepPitchingSchema)
  .merge(stepHealthSchema)

export type IntakeFormData = z.infer<typeof intakeFormSchema>
export type StepContactData = z.infer<typeof stepContactSchema>
export type StepPhysicalData = z.infer<typeof stepPhysicalSchema>
export type StepVelocityData = z.infer<typeof stepVelocitySchema>
export type StepPitchingData = z.infer<typeof stepPitchingSchema>
export type StepHealthData = z.infer<typeof stepHealthSchema>

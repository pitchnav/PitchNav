// Auto-generated types based on the Supabase schema.
// Run `npx supabase gen types typescript` to regenerate after schema changes.

export type OrderStatus =
  | 'intake_started'
  | 'awaiting_videos'
  | 'awaiting_payment'
  | 'submitted'
  | 'video_quality_review'
  | 'in_analysis'
  | 'additional_video_requested'
  | 'report_being_prepared'
  | 'complete'
  | 'follow_up_available'
  | 'cancelled'
  | 'refunded'

export type PlayingLevel =
  | 'middle_school'
  | 'high_school'
  | 'travel'
  | 'college'
  | 'adult_recreational'

export type ThrowingHand = 'right' | 'left'

export type VelocitySource =
  | 'pocket_radar'
  | 'stalker'
  | 'rapsodo'
  | 'trackman'
  | 'stadium_radar'
  | 'coach_provided'
  | 'estimated'
  | 'other'

export type VideoAngle = 'open_side' | 'rear' | 'front' | 'radar'

export type DrillCategory =
  | 'direction'
  | 'rhythm'
  | 'lower_half_sequencing'
  | 'lead_leg_stability'
  | 'trunk_rotation'
  | 'arm_timing'
  | 'deceleration'
  | 'command'
  | 'mobility'
  | 'strength_power'

export type PitchPosition =
  | 'peak_leg_lift'
  | 'hand_separation'
  | 'lead_foot_contact'
  | 'max_external_rotation'
  | 'ball_release'
  | 'finish_deceleration'

export type CommunicationPreference = 'email' | 'phone' | 'text'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface AthleteProfile {
  id: string
  user_id: string
  athlete_full_name: string
  athlete_email: string
  phone_number: string | null
  date_of_birth: string
  city: string | null
  state: string | null
  communication_pref: CommunicationPreference | null
  guardian_name: string | null
  guardian_email: string | null
  guardian_consented: boolean
  guardian_consented_at: string | null
  height_feet: number | null
  height_inches: number | null
  weight_lbs: number | null
  throwing_hand: ThrowingHand | null
  primary_position: string | null
  school_org: string | null
  graduation_year: number | null
  playing_level: PlayingLevel | null
  current_avg_velocity: number | null
  current_max_velocity: number | null
  goal_velocity: number | null
  velocity_source: VelocitySource | null
  velocity_measured_at: string | null
  bullpen_intensity: string | null
  pitches_per_week: number | null
  fastball_type: string | null
  secondary_pitches: string[] | null
  years_pitching: number | null
  current_coach: string | null
  throwing_program: string | null
  strength_program: string | null
  main_goal: string | null
  mechanical_concern: string | null
  previous_feedback: string | null
  upcoming_deadline: string | null
  current_pain: boolean | null
  recent_pain_30_days: boolean | null
  returned_from_injury: boolean | null
  medically_cleared: boolean | null
  health_notes: string | null
  health_flagged: boolean
  terms_agreed: boolean
  terms_agreed_at: string | null
  privacy_agreed: boolean
  privacy_agreed_at: string | null
  consent_anonymous_clips: boolean | null
  consent_athlete_name: boolean | null
  consent_testimonial: boolean | null
  consent_before_after: boolean | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  athlete_profile_id: string
  status: OrderStatus
  analyst_id: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  amount_paid_cents: number | null
  currency: string | null
  payment_confirmed_at: string | null
  refunded_at: string | null
  refund_reason: string | null
  internal_notes: string | null
  delivery_estimate_text: string | null
  follow_up_available_at: string | null
  follow_up_completed_at: string | null
  idempotency_key: string | null
  is_demo: boolean
  submitted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  changed_by: string | null
  note: string | null
  created_at: string
}

export interface VideoSubmission {
  id: string
  order_id: string
  user_id: string
  angle: VideoAngle
  storage_path: string
  file_name: string
  file_size_bytes: number | null
  mime_type: string | null
  duration_secs: number | null
  resolution: string | null
  frame_rate: number | null
  orientation: string | null
  quality_approved: boolean | null
  quality_reviewed_by: string | null
  quality_reviewed_at: string | null
  quality_rejection_reason: string | null
  replacement_requested_at: string | null
  checklist_confirmed: boolean
  created_at: string
  updated_at: string
}

export interface AnalysisReport {
  id: string
  order_id: string
  analyst_id: string | null
  delivery_score: number | null
  three_strengths: string[] | null
  three_priorities: string[] | null
  main_focus: string | null
  secondary_focuses: string[] | null
  reviewer_velocity_notes: string | null
  four_week_plan: string | null
  follow_up_recommendation: string | null
  voiceover_storage_path: string | null
  voiceover_url: string | null
  pdf_storage_path: string | null
  pdf_url: string | null
  verified_velocity: number | null
  verified_velocity_source: string | null
  is_demo: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ScorecardCategory {
  id: string
  report_id: string
  category: string
  score: number
  notes: string | null
  created_at: string
}

export interface PositionScreenshot {
  id: string
  report_id: string
  position: PitchPosition
  storage_path: string | null
  image_url: string | null
  reviewer_notes: string | null
  strengths: string | null
  development_opportunity: string | null
  coaching_cue: string | null
  estimated_angle: string | null
  quality_note: string | null
  sort_order: number
  created_at: string
}

export interface Drill {
  id: string
  name: string
  category: DrillCategory
  description: string
  what_it_trains: string | null
  athlete_type: string | null
  sets: number | null
  reps: string | null
  coaching_cues: string[] | null
  common_mistakes: string[] | null
  demo_video_url: string | null
  contraindications: string | null
  is_active: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface AssignedDrill {
  id: string
  report_id: string
  drill_id: string
  sort_order: number
  custom_note: string | null
  created_at: string
  drill?: Drill
}

export interface Message {
  id: string
  order_id: string
  sender_id: string
  is_admin: boolean
  body: string
  read_at: string | null
  created_at: string
}

export interface DeletionRequest {
  id: string
  user_id: string
  request_type: string
  notes: string | null
  processed_at: string | null
  processed_by: string | null
  created_at: string
}

export interface AdminSetting {
  key: string
  value: string | null
  description: string | null
  updated_at: string
}

export interface VelocityHistory {
  id: string
  athlete_id: string
  order_id: string | null
  velocity_mph: number
  source: VelocitySource | null
  measured_at: string
  notes: string | null
  is_athlete_provided: boolean
  created_at: string
}

// Joined / enriched types used in the UI
export interface OrderWithDetails extends Order {
  athlete_profile?: AthleteProfile
  analysis_report?: AnalysisReport
  video_submissions?: VideoSubmission[]
}

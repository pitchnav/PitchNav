import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrderStatus, PlayingLevel, VelocitySource, DrillCategory, PitchPosition } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function formatHeight(feet: number | null, inches: number | null): string {
  if (feet === null) return '—'
  return `${feet}'${inches ?? 0}"`
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  intake_started: 'Intake Started',
  awaiting_videos: 'Awaiting Videos',
  awaiting_payment: 'Awaiting Payment',
  submitted: 'Submitted',
  video_quality_review: 'Video Quality Review',
  in_analysis: 'In Analysis',
  additional_video_requested: 'Additional Video Requested',
  report_being_prepared: 'Report Being Prepared',
  complete: 'Complete',
  follow_up_available: 'Follow-Up Available',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  intake_started: 'text-gray-400 bg-gray-400/10',
  awaiting_videos: 'text-yellow-400 bg-yellow-400/10',
  awaiting_payment: 'text-orange-400 bg-orange-400/10',
  submitted: 'text-blue-400 bg-blue-400/10',
  video_quality_review: 'text-purple-400 bg-purple-400/10',
  in_analysis: 'text-electric-blue-light bg-electric-blue/10',
  additional_video_requested: 'text-red-400 bg-red-400/10',
  report_being_prepared: 'text-indigo-400 bg-indigo-400/10',
  complete: 'text-accent-green bg-accent-green/10',
  follow_up_available: 'text-accent-green bg-accent-green/10',
  cancelled: 'text-red-400 bg-red-400/10',
  refunded: 'text-gray-400 bg-gray-400/10',
}

export const PLAYING_LEVEL_LABELS: Record<PlayingLevel, string> = {
  middle_school: 'Middle School',
  high_school: 'High School',
  travel: 'Travel Baseball',
  college: 'College',
  adult_recreational: 'Adult / Recreational',
}

export const VELOCITY_SOURCE_LABELS: Record<VelocitySource, string> = {
  pocket_radar: 'Pocket Radar',
  stalker: 'Stalker Radar',
  rapsodo: 'Rapsodo',
  trackman: 'TrackMan',
  stadium_radar: 'Stadium Radar',
  coach_provided: 'Coach-Provided Reading',
  estimated: 'Estimated',
  other: 'Other',
}

export const DRILL_CATEGORY_LABELS: Record<DrillCategory, string> = {
  direction: 'Direction',
  rhythm: 'Rhythm',
  lower_half_sequencing: 'Lower-Half Sequencing',
  lead_leg_stability: 'Lead-Leg Stability',
  trunk_rotation: 'Trunk Rotation',
  arm_timing: 'Arm Timing',
  deceleration: 'Deceleration',
  command: 'Command',
  mobility: 'Mobility',
  strength_power: 'Strength & Power',
}

export const PITCH_POSITION_LABELS: Record<PitchPosition, string> = {
  peak_leg_lift: 'Peak Leg Lift',
  hand_separation: 'Hand Separation',
  lead_foot_contact: 'Lead-Foot Contact',
  max_external_rotation: 'Maximum External Rotation',
  ball_release: 'Ball Release',
  finish_deceleration: 'Finish & Deceleration',
}

export const SCORECARD_CATEGORIES = [
  { key: 'direction', label: 'Direction' },
  { key: 'lower_half_sequencing', label: 'Lower-Half Sequencing' },
  { key: 'upper_half_timing', label: 'Upper-Half Timing' },
  { key: 'front_side_stability', label: 'Front-Side Stability' },
  { key: 'posture', label: 'Posture' },
  { key: 'release_consistency', label: 'Release Consistency' },
] as const

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'submitted',
  'video_quality_review',
  'in_analysis',
  'report_being_prepared',
  'complete',
]

export function generateOrderIdempotencyKey(userId: string, profileId: string): string {
  return `${userId}-${profileId}-${Date.now()}`
}

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/mpeg',
  'video/ogg',
  'video/3gpp',
]

export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB

export const PACKAGE_PRICE_CENTS = 4000
export const PACKAGE_NAME = 'Complete Pitching Analysis'

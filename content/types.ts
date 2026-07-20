/**
 * Pitch Nav video campaign data format.
 *
 * This file is the single source of truth for the shape of every campaign
 * JSON file in content/video-campaigns/. It is not imported by the Next.js
 * app — it documents and type-checks the content system independently.
 *
 * Non-programmers: you do not need to understand this file to use the
 * system. Copy content/video-campaigns/_TEMPLATE.campaign.json and fill in
 * the fields. This file just defines what "filled in correctly" means, and
 * lets an editor run `npm run type-check` to catch typos in a JSON file
 * before wasting a shoot day on it.
 */

export const CAMPAIGN_SCHEMA_VERSION = '1.0.0'

export type Platform =
  | 'instagram-reels'
  | 'instagram-collab-reels'
  | 'instagram-ads'
  | 'website'
  | 'tiktok'
  | 'youtube-shorts'

export type ContentType =
  | 'organic-reel'
  | 'collab-reel'
  | 'paid-ad'
  | 'website-promo'
  | 'product-explanation'
  | 'athlete-case-study'
  | 'camera-setup-tutorial'
  | 'mechanics-breakdown'
  | 'before-and-after'
  | 'founder-led'

export type ScriptFormat =
  | 'A-mechanics-breakdown'
  | 'B-before-and-after'
  | 'C-camera-mistake'
  | 'D-product-walkthrough'
  | 'E-founder-video'
  | 'F-myth-correction'
  | 'G-paid-ad'

export type Distribution = 'organic' | 'paid'

export type CampaignStatus =
  | 'idea'
  | 'scripted'
  | 'footage-needed'
  | 'shot'
  | 'editing'
  | 'ready-to-publish'
  | 'published'
  | 'archived'

export type HookCategory =
  | 'mechanics-mystery'
  | 'velocity-curiosity'
  | 'camera-and-analysis-education'
  | 'product-demonstration'
  | 'founder-and-credibility'
  | 'case-study'

/** A single reusable hook line, independent of any one campaign. */
export interface Hook {
  id: string
  category: HookCategory
  text: string
  /** True if the hook reads clearly with captions and no audio. */
  worksSilently: boolean
  /** Optional note on when/why to use this hook. */
  notes?: string
}

export type AssetKind =
  | 'real-pitching-footage'
  | 'real-founder-footage'
  | 'real-screen-recording'
  | 'real-report-graphic'
  | 'brand-asset'
  | 'ai-generated-background'
  | 'ai-generated-motion-graphic'
  | 'ai-generated-diagram'
  | 'music'
  | 'sound-effect'

export type AssetStatus = 'available' | 'needed' | 'in-progress' | 'not-applicable'

export interface AssetReference {
  kind: AssetKind
  description: string
  /** Repo/project path or shared-drive path once the asset exists. Empty until captured. */
  path?: string
  status: AssetStatus
  /** Real footage should say so explicitly; only backgrounds/motion graphics/diagrams may be AI-generated. */
  aiGenerated: boolean
  notes?: string
}

export interface Scene {
  id: string
  /** Seconds from the start of the video, e.g. "0:00-0:02". */
  timecode: string
  /** What the pattern-interrupt / visual change is in this beat. */
  visualBeat: string
  cameraDirection: string
  onScreenText: string[]
  voiceOver: string
  bRoll: string[]
  soundDesign: string
  assetReferences: AssetReference[]
}

export interface PerformanceResult {
  /** Row id in content/performance-data/performance-tracker.csv */
  trackerRowId?: string
  reach?: number
  nonFollowerReach?: number
  threeSecondViews?: number
  averageWatchTimeSeconds?: number
  completionRate?: number
  replays?: number
  saves?: number
  shares?: number
  comments?: number
  profileVisits?: number
  websiteClicks?: number
  analysisStarts?: number
  subscriptions?: number
  adSpendUsd?: number
  costPerClickUsd?: number
  costPerSubscriptionUsd?: number
  hookRetentionRate?: number
  clickThroughRate?: number
  conversionRate?: number
  costPerCustomerUsd?: number
}

export interface VideoCampaign {
  schemaVersion: typeof CAMPAIGN_SCHEMA_VERSION
  campaignId: string
  campaignName: string
  objective: string
  audience: string
  contentType: ContentType
  scriptFormat: ScriptFormat
  hook: string
  hookCategory: HookCategory
  coreInsight: string
  openLoop: string
  payoff: string
  callToAction: string
  /** Include the $25/month price only when the format calls for it (see Format G). */
  priceMention: string | null
  totalDurationSeconds: number
  scenes: Scene[]
  voiceOverScript: string
  onScreenText: string[]
  bRollInstructions: string
  editingNotes: string
  soundDesign: string
  assetReferences: AssetReference[]
  platform: Platform[]
  distribution: Distribution
  /** e.g. "hook-variant-1-mechanical-problem" — used to compare against sibling campaigns in performance-data. */
  testVariation: string
  status: CampaignStatus
  performanceResults: PerformanceResult | null
}

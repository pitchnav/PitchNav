/**
 * Inputs the video-prompt generator accepts, beyond a campaign JSON file.
 * These map to the questions in content/scripts/README.md — answer them
 * before running content/scripts/generate-video-brief.mjs so the brief
 * reflects what footage genuinely exists.
 */

export interface VideoPromptGeneratorInput {
  /** Path to the source campaign JSON, e.g. "content/video-campaigns/flagship-understand-your-delivery.campaign.json" */
  campaignPath: string

  /** Path or description of the real athlete video this campaign is built from, if any. */
  athleteVideo: string | null

  /** What the video is about, in a sentence — usually already covered by the campaign's `objective`, but useful when running the generator ad hoc without a full campaign file. */
  topic: string

  /** The specific mechanical observation the video is built around, e.g. "upper half rotates before front side is stable at foot strike." */
  mechanicalObservation: string

  targetAudience: string

  videoLengthSeconds: 10 | 15 | 20 | 30 | 45 | 60

  desiredCta: string

  isAd: boolean

  /** True only if real, consenting founder/coach footage will appear on camera. Never true for an AI-generated presenter. */
  hasHumanPresenter: boolean

  hasWebsiteScreenRecordings: boolean
  hasReportScreenshots: boolean
  hasDrillFootage: boolean
  hasBrandAssets: boolean
}

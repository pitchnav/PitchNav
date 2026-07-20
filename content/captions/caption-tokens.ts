/**
 * Reusable caption styling tokens for Pitch Nav short-form video.
 *
 * Values are pulled directly from the live brand system in
 * tailwind.config.ts and src/app/globals.css so captions match the product,
 * not a separate "marketing" palette. This file has no runtime dependency
 * on the Next.js app — it's a reference for editors/motion designers and
 * for the video-prompt generator.
 */

export const captionColors = {
  background: '#05080f', // navy-950
  backgroundAlt: '#0d1629', // navy-800
  textPrimary: '#ffffff',
  textEmphasis: '#2563eb', // electric.blue
  textEmphasisAlt: '#3b82f6', // electric.blue-light, use over busy/dark footage for more pop
  scrim: 'rgba(5, 8, 15, 0.55)', // behind captions over busy footage
} as const

export const captionTypography = {
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  weight: 900, // Inter Black — matches .section-heading font-black
  transform: 'uppercase',
  letterSpacing: '0.01em', // tight tracking; use 0.2em only for small eyebrow-style labels
  primarySizePctOfFrameHeight: 0.07, // ~130px+ cap height at 1080x1920
  disclaimerSizePctOfFrameHeight: 0.03, // ~55px minimum, legibility floor
  lineLimit: 2,
  wordsPerBeatMin: 3,
  wordsPerBeatMax: 7,
} as const

export const captionTiming = {
  minHoldSeconds: 1,
  maxHoldSeconds: 3,
  newCaptionShouldCoincideWithVisualChange: true,
} as const

export interface CaptionBeat {
  text: string
  /** Substring of `text` to render in captionColors.textEmphasis. */
  emphasize?: string
  holdSeconds: number
}

export const exampleFlagshipCaptionBeats: CaptionBeat[] = [
  { text: 'THIS LOOKS LIKE A GOOD DELIVERY…', holdSeconds: 2 },
  { text: 'UNTIL YOU STOP IT HERE.', emphasize: 'STOP IT HERE', holdSeconds: 3 },
  { text: 'SAME PATTERN. ANOTHER PITCH.', emphasize: 'SAME PATTERN', holdSeconds: 3 },
  { text: 'UNDERSTAND YOUR DELIVERY.', holdSeconds: 2 },
  { text: 'START YOUR ANALYSIS.', emphasize: 'START YOUR ANALYSIS', holdSeconds: 2 },
  { text: '$25/MONTH', holdSeconds: 2 },
]

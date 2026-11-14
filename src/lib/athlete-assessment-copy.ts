import type { FootStrikeReview } from './foot-strike-review'

// Older staff reviews can put camera notes next to usable coaching in the same field.
const reviewCommentary = [
  /\b(?:angle|rotation|velocity|force|timing|speed)(?:\s+\w+){0,4}\s+not measured\b/i,
  /\b(?:inconclusive|unresolved|unassessable|indeterminate|unverified|foreshortened|occluded|obscured|insufficient evidence|visibility limit(?:s|ations?)?|view[- ]limited)\b/i,
  /\b(?:can(?:not|[’']t)|could(?: not|n[’']t)|unable to|impossible to|difficult to|hard to) (?:reliably |accurately )?(?:see|tell|judge|establish|measure|assess|confirm|determine|distinguish|evaluate|verify|calculate|estimate)\b/i,
  /\b(?:not|never) (?:clearly |reliably )?(?:visible|shown|captured|assessable|measurable|established|confirmed|supported)\b/i,
  /\b(?:camera|view|angle|footage|clip|video|panel|frame|image|evidence|recording|landmark)s?\b[^.!?\n]{0,75}\b(?:hid(?:e|es|den)|limits?|unclear|uncertain|unreliable|unavailable|missing|does(?: not|n[’']t) (?:show|capture|give|establish|resolve|support|allow)|leaves? .{0,30} uncertain)\b/i,
  /\b(?:no (?:clear|visible) (?:fault|issue|delay|collapse|evidence)|no (?:call|correction|separate correction) (?:is|was|needed|to make)|no reliable (?:measurement|angle|estimate)|(?:not enough|insufficient) (?:information|data|detail|evidence))\b/i,
  /\b(?:angle|rotation|timing|relationship|contact|position|landmark|measurement|event|shoulder|elbow|wrist|hip|joint|foot|shoe|ball)(?:\s+\w+){0,3} (?:unclear|hidden|uncertain|unreliable)\b/i,
  /\b(?:no (?:rear|front|side|second|calibrated|suitable)[^.!?\n]{0,65}\b(?:view|frame|pitch|source|capture)|(?:did(?: not|n[’']t)|could(?: not|n[’']t)) see a (?:clear|separate)|no clear [^.!?\n]{0,65}\bin (?:this|the) (?:view|footage|clip)|velocity is not estimated from video)\b/i,
]

export function isAthleteReviewCommentary(text: string): boolean {
  return reviewCommentary.some(pattern => pattern.test(text))
}

export function athleteCoachingText(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.split(/(?<=[.!?])\s+|\s*\n+\s*/)
    .map(sentence => sentence.trim()).filter(sentence => sentence && !isAthleteReviewCommentary(sentence)).join(' ')
}

export function athleteLandingText(review: FootStrikeReview): string {
  if (review.contact_status !== 'bracketed') return ''
  const arm = review.hand_up_l !== 'unresolved' || review.arm_timing !== 'unresolved' ? review.arm_observation : ''
  const torso = review.torso_opening !== 'unresolved' ? review.torso_observation : ''
  return [arm, torso].map(athleteCoachingText).filter(Boolean).join(' ')
}

// Older reviews used one field for both practice assignments and body-position reminders.
export function athletePracticeTask(input: unknown): string {
  const text = athleteCoachingText(input)
  const reminder = /^(?:(?:during|in|for) (?:this|the|your) (?:drill|rehearsal|rep),?\s+)?(?:keep|hold|get|raise|lower|bring|lift|tuck|drive|stack|align|turn|point|lead with|stay) (?:your |the |that )?(?:ball hand|throwing hand|hand|arm|elbow|shoulder|chest|hips?|torso|knee|head|glove|back|closed|sideways)\b/i
  const setupOrDose = /\b(?:against|until|through the gate|over the mark|beside|mirror|towel|cone|tape line|split stance|staggered stance|\d+ (?:seconds?|sets?|reps?|throws?))\b/i
  const practice = text.split(/(?<=[.!?])\s+/)
    .filter(sentence => !reminder.test(sentence) || setupOrDose.test(sentence)).join(' ')
  const setup = /\b(?:drill|rehearsal|windups?|walk[- ]?through|step[- ]back|rocker|janitor throws?|figure[- ](?:eight|8)|pivot (?:throw|pickoff)|split stance|staggered stance|dry (?:reps?|delivery|deliveries|throw)|mirror|towel|cone|tape line|medicine ball|med[- ]ball|wall target)\b/i
  const assignment = /\b(?:\d+\s*(?:sets?|reps?|throws?|pitches?)|(?:rehearse|practice|perform|complete) (?:a |the |your |slow |controlled )*(?:delivery|deliveries|throws?|stride|hand break|landing|transfer|repetitions)|(?:pause|freeze) (?:at|on|after) (?:the |front )?(?:plant|foot strike|landing|contact)|throw (?:at|through|toward|to) (?:a |the |your )?(?:spot|line|target|net|wall))\b/i
  return setup.test(practice) || assignment.test(practice) || setupOrDose.test(practice) ? practice : ''
}

export function firstAthleteCoachingNote(notes: unknown): string {
  return Array.isArray(notes) ? notes.map(athleteCoachingText).find(Boolean) ?? '' : ''
}

// A known L verdict permits teaching the reference, even when the review has no measured angle.
export function athleteFootStrikeGuide(review: FootStrikeReview): string {
  if (review.contact_status !== 'bracketed' || !['visible', 'absent'].includes(review.hand_up_l)) return ''
  return 'At foot strike, the upright L means your upper arm is roughly in line with your shoulders, your elbow bends about 90°, and your ball hand is above your elbow. For velocity, the timing goal is to give the arm room to accelerate as the chest turns. For command, repeating that sequence can help you repeat the direction the ball leaves your hand.'
}

export function athleteLandingWithGuide(review: FootStrikeReview): string {
  return [athleteLandingText(review), athleteFootStrikeGuide(review)].filter(Boolean).join(' ')
}

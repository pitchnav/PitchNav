import { athleteCoachingText, athleteFootStrikeGuide, athleteLandingText, firstAthleteCoachingNote, isAthleteReviewCommentary, athletePracticeTask } from './athlete-assessment-copy'
import { emptyFootStrike } from './foot-strike-review'

test('a named throwing assignment keeps the task and its dose when a legacy cue includes an isolated position reminder', () => {
  expect(athletePracticeTask('Figure 8 Rhythm Rocker. Trace a figure eight before throwing. Get your arm up. Use 2 sets of 4 reps.'))
    .toBe('Figure 8 Rhythm Rocker. Trace a figure eight before throwing. Use 2 sets of 4 reps.')
  expect(athletePracticeTask('Keep your chest closed during the drill.')).toBe('')
  expect(athletePracticeTask('Hold your arm against the wall for 5 seconds.')).toBe('Hold your arm against the wall for 5 seconds.')
})

test.each([
  'Near 90° is a reference; exact elbow angle not measured.',
  'We cannot tell whether the chest opens from this view.',
  'This side view does not give enough information to judge glove-side lean.',
  'The camera angle hides that relationship, so no call is made on it.',
  'The assessment leaves the arm position unresolved.',
  'Glove-side lean was not shown.',
  'The ball is obscured behind the hand.',
  'No clear fault in this phase.',
  'The exact elbow angle is unreliable.',
  'No reliable measurement was available.',
  'No rear/front view or repeated pitch set is available.',
  'The staff did not see a clear collapse that needs changing on this rep.',
  'There is no clear early chest pull in this view.',
  'Velocity is not estimated from video.',
])('recognizes staff evidence language in %s', text => {
  expect(isAthleteReviewCommentary(text)).toBe(true)
})

test('retains coaching facts, precision, grounded praise and actionable cues across a mixed note', () => {
  expect(athleteCoachingText('At 1.25 seconds your wrist is below your elbow. The exact angle is inconclusive. Compare the same camera position next time.'))
    .toBe('At 1.25 seconds your wrist is below your elbow. Compare the same camera position next time.')
  expect(athleteCoachingText('Your chest stays sideways through landing. Your elbow does not straighten until release.')).toBe('Your chest stays sideways through landing. Your elbow does not straighten until release.')
  expect(athleteCoachingText('Use a mirror to see where your wrist finishes.')).toBe('Use a mirror to see where your wrist finishes.')
})

test('handles each foot-strike verdict independently even in mixed older reports', () => {
  const review = { ...emptyFootStrike, contact_status: 'bracketed' as const, arm_timing: 'issue_visible' as const, hand_up_l: 'absent' as const,
    arm_observation: 'Your hand is still below your elbow as your heel lands.', torso_observation: 'Chest rotation is hidden.' }
  expect(athleteLandingText(review)).toBe(review.arm_observation)
  expect(athleteLandingText({ ...review, arm_timing:'unresolved', hand_up_l:'unresolved', torso_opening:'no_clear_issue', torso_observation:'Your chest stays sideways through landing.' })).toBe('Your chest stays sideways through landing.')
  expect(athleteLandingText(emptyFootStrike)).toBe('')
  expect(athleteFootStrikeGuide(emptyFootStrike)).toBe('')
  expect(athleteFootStrikeGuide({...review, hand_up_l:'unresolved'})).toBe('')
  expect(athleteFootStrikeGuide(review)).toMatch(/90°.*velocity.*command/)
})

test('athlete previews use the first actionable sentence even after a staff-only note', () => {
  expect(firstAthleteCoachingNote(['Glove-side lean was not shown.', 'Your wrist rises after plant.'])).toBe('Your wrist rises after plant.')
  expect(firstAthleteCoachingNote(null)).toBe('')
})

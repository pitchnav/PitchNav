import type { MechanicsFinding } from './mechanics-findings'
import { emptyFootStrike } from './foot-strike-review'
import { figure8Drill, janitorDrill, preferredReviewedDrill } from './reviewed-drill-matches'

const row: MechanicsFinding = { topic:'Arm path', flag_id:null, answer:'', coaching_action:null, evidence:'', evidence_keys:['lead_foot_contact'], verdict:'observed' }
const landing = { ...emptyFootStrike, contact_status:'bracketed' as const, arm_timing:'issue_visible' as const, hand_up_l:'absent' as const }

test('matches the delayed rise through landing and leaves other timing problems open for a different assignment', () => {
  expect(preferredReviewedDrill({ ...row, foot_strike:landing })).toBe(figure8Drill)
  expect(preferredReviewedDrill({ ...row, answer:'The throwing hand continues low toward the back hip before it rises.' })).toBe(figure8Drill)
  expect(preferredReviewedDrill({ ...row, answer:'Your hands separate late and the arm rushes.', foot_strike:landing })).toBeNull()
  expect(preferredReviewedDrill({ ...row, foot_strike:{ ...landing, arm_timing:'no_clear_issue', torso_opening:'early_visible' } })).toBeNull()
  expect(preferredReviewedDrill({ ...row, verdict:'unable_to_assess', foot_strike:landing })).toBeNull()
})

test('reserves Janitor throws for a verified rear-side hinge issue', () => {
  expect(preferredReviewedDrill({ ...row, answer:'Your rear hip loses its hinge as you move down the mound.' })).toBe(janitorDrill)
  expect(preferredReviewedDrill({ ...row, answer:'You come out of the hinge too early on the back leg.' })).toBe(janitorDrill)
  expect(preferredReviewedDrill({ ...row, answer:'You drift forward and keep your rear hip hinge.' })).toBeNull()
  expect(preferredReviewedDrill({ ...row, answer:'No clear loss of the rear hip hinge.' })).toBeNull()
  expect(preferredReviewedDrill({ ...row, answer:"You don't lose the rear hip hinge and your back leg never straightens early." })).toBeNull()
  expect(preferredReviewedDrill({ ...row, answer:'Your back leg does not lose its hinge into landing.' })).toBeNull()
  expect(preferredReviewedDrill({ ...row, answer:'Your rear hip never hinges as the stride starts.' })).toBe(janitorDrill)
  expect(preferredReviewedDrill({ ...row, answer:'Your lead hip loses its hinge after contact.' })).toBeNull()
})

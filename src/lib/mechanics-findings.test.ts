import { missingLandingFinding } from './foot-strike-review'
import { landingSampleTimes, validateMechanicsFindings } from './mechanics-findings'
import { mechanicsFlags } from './mechanics-library'

const row = {
  flag_id: 144, topic: 'Front-knee stability', verdict: 'unsupported',
  answer: 'The knee held its bend.', evidence_keys: ['lead_foot_contact', 'ball_release'],
  evidence: 'The knee is flexed in both panels and does not buckle as the arm comes through.', coaching_action: null,
}
const keys = row.evidence_keys

test('can return any supported library question or an uncatalogued observation, without a finding quota', () => {
  expect(validateMechanicsFindings([], keys)).toEqual([])
  const outside = { ...row, flag_id: null, topic: 'Hand break rhythm', verdict: 'observed' }
  expect(validateMechanicsFindings([row, outside], keys)).toEqual([row, outside])
})

test.each([
  [{ ...row, flag_id: 154, verdict: 'observed' }, 'requires'],
  [{ ...row, flag_id: 154 }, 'requires'],
  [{ ...row, flag_id: 999 }, 'unknown library'],
  [{ ...row, evidence_keys: ['finish'] }, 'phase without'],
  [{ ...row, coaching_action: 'Change the landing.' }, 'visible finding'],
])('blocks evidence errors before persistence', (value, problem) => {
  expect(() => validateMechanicsFindings([value], keys)).toThrow(String(problem))
})

test('retains a limitation without turning it into a fault or prescribing a change', () => {
  for (const flag of mechanicsFlags.filter(flag => flag.requirement !== 'side_view')) {
    const limited = { ...row, flag_id: flag.id, verdict: 'unable_to_assess' }
    expect(validateMechanicsFindings([limited], keys)).toEqual([limited])
  }
})

test('a visible hand-up L verdict and an arm drill require different evidence', () => {
  const foot_strike = { contact_status:'bracketed',last_airborne_time:1.1,first_planted_time:1.2,hand_up_l:'absent',
    arm_timing:'unresolved',arm_observation:'Your wrist is below the elbow when your shoe first lands.',
    torso_opening:'unresolved',torso_observation:'The far hip is hidden.' }
  const check={...row,flag_id:null,foot_strike,verdict:'unable_to_assess',evidence_keys:['lead_foot_contact']}
  const verify=(input:unknown) => validateMechanicsFindings([input], ['lead_foot_contact'], [1.1,1.2])
  expect(verify(check)[0].foot_strike?.hand_up_l).toBe('absent')
  expect(()=>verify({...check, coaching_action:'Fix your arm path.'})).toThrow('arm-path')
  expect(()=>verify({...check,foot_strike:{...foot_strike,first_planted_time:1.4}})).toThrow('panels')
  expect(()=>verify({...check,foot_strike:{...foot_strike,contact_status:'unresolved',last_airborne_time:null,first_planted_time:null}})).toThrow('bracket')
  expect(()=>validateMechanicsFindings([], ['lead_foot_contact'], [1.1,1.2])).toThrow('arm and torso')
  expect(verify({...check,foot_strike:{...foot_strike,arm_timing:'issue_visible'},coaching_action:'Hand-Break Timing Dry Reps for the late break.'})[0].coaching_action).toContain('Dry Reps')
  const angleFlag = { ...row, flag_id: 226, verdict:'observed', evidence_keys:['lead_foot_contact'], coaching_action:'Change the arm path.' }
  expect(()=>validateMechanicsFindings([check, angleFlag], ['lead_foot_contact'], [1.1,1.2])).toThrow('arm-path')
})

test('missing landing evidence requires an explicit limited result, with no invented citation or drill', () => {
  const times = landingSampleTimes([{key:'ball_release'}])
  const review = missingLandingFinding()
  expect(() => validateMechanicsFindings([], ['ball_release'], times)).toThrow('arm and torso')
  expect(validateMechanicsFindings([review], ['ball_release'], times)).toEqual([review])
  expect(() => validateMechanicsFindings([{...review, coaching_action:'Raise the arm'}], [], times)).toThrow('arm-path')
  expect(() => validateMechanicsFindings([{...review, foot_strike:{...review.foot_strike,hand_up_l:'absent'}}], [], times)).toThrow('bracket')
  expect(() => validateMechanicsFindings([{...review, foot_strike:{...review.foot_strike,hand_up_l:undefined}}], [], times)).toThrow()
})

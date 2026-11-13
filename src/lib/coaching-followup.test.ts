import { readBiomechanics, reviewedSource, writeAthleteFollowup, designTrainingPlan, type CoachingDrill, type CoachingFollowupSource } from './coaching-followup'
import { footStrikeFinding } from './foot-strike-review'

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('./followup-voice-settings', () => ({ loadFollowUpVoice: async () => ({
  note: 'Name the moment the shoe lands.', examples: [{ source: 'Fictional radar example', response: 'Your fastball reached 95 mph.' }],
  specialistInstructions: 'Address the athlete directly and use short baseball cues.',
}) }))
const sourceKey = process.env.OPENAI_API_KEY
const originalFetch = global.fetch
const send = jest.fn()
beforeEach(() => { process.env.OPENAI_API_KEY = 'mock'; global.fetch = send; send.mockReset() })
afterAll(() => { global.fetch = originalFetch; if (sourceKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = sourceKey })

const plant = footStrikeFinding({
  contact_status: 'bracketed', first_planted_time: 1, last_airborne_time: 0.95, hand_up_l: 'absent',
  arm_timing: 'no_clear_issue', arm_observation: 'Your hand is below the elbow at plant and rises before the next clear frame.',
  torso_opening: 'unresolved', torso_observation: 'Chest rotation relative to the hips is unresolved.',
}, 'The throwing hand rose after the front shoe settled.', null, ['private-attachment-key'])
const drill: CoachingDrill = { name: 'Hip-Lead Separation Dry Reps', sets: 3, reps: '6 dry reps', description: 'Stride and turn without a ball.',
  coaching_cues: ['Let the front hip lead.'], common_mistakes: ['Pulling the shoulders ahead'], what_it_trains: 'Hip and shoulder sequencing' }
const source: CoachingFollowupSource = {
  summary: 'Keep the glove side organized.', strengths: ['A consistent stride.'], approvedDrills: [],
  findings: [{ topic: 'Torso rotation', flag_id: null, verdict: 'observed', answer: 'Your shoulders and hips turn together after plant.',
    evidence: 'The shoulder line follows the hips immediately after contact.', coaching_action: null, evidence_keys: ['private-attachment-key'] }, plant],
}
const mechanics = { overview: 'The hips and shoulders turn together after contact.', findings: [
  { sourceIndex: 0, disposition: 'develop', interpretation: 'Your shoulders follow the pelvis immediately after plant.' },
  { sourceIndex: 1, disposition: 'limited', interpretation: 'Published separately.' },
] }
const followup = { opening: 'Work on the turn after the shoe comes down.', points: [
  { sourceIndex: 0, explanation: 'Your shoulders follow the hips as soon as you land.', fix: 'Let the front hip turn before the shirt follows.' },
  { sourceIndex: 1, explanation: 'Published separately.', fix: null },
], recap: 'Keep the stride; separate the turn.' }
const plan = { focus: 'Begin with a dry rehearsal in your normal warm-up.', steps: [
  { sourceIndexes: [0], task: 'Start from your usual stride, lead the turn with the hip, and finish naturally.',
    drillName: drill.name, cue: 'Belt first, then shirt.', success: 'The belt starts turning before the chest on the next side clip.' },
], transfer: 'Carry the cue into the throws that are already on the schedule.', retest: 'Compare hip and shoulder timing from the same camera position.' }

function stub(body: unknown, status = 'completed') {
  send.mockResolvedValueOnce(Response.json({ status, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(body) }] }] }))
}

test('three independent specialists hand off a specific fix, drill and transfer without an outline, assignment or prewritten cue', async () => {
  stub(mechanics); stub(followup); stub(plan)
  const bio = await readBiomechanics(source)
  const coach = await writeAthleteFollowup(source, bio)
  const finished = await designTrainingPlan(source, bio, coach, [drill])
  const requests = send.mock.calls.map(call => JSON.parse(call[1].body))
  expect(requests.map(req => req.text.format.name)).toEqual(['pitchnav_biomechanics','pitchnav_athlete_followup','pitchnav_training_plan'])
  expect(requests.every(req => req.store === false && !req.input.includes('private-attachment-key'))).toBe(true)
  expect(JSON.parse(requests[1].input)).toMatchObject({ biomechanics:bio, teamVoice:{ specialistInstructions:expect.stringContaining('short baseball cues') } })
  expect(JSON.parse(requests[2].input)).toMatchObject({ followup:coach, activeCatalog:[{name:drill.name}] })
  for (const expected of [drill.name, plan.steps[0].task, plan.steps[0].cue, plan.steps[0].success, plan.transfer,
    'has not reached the hand-up L', plant.foot_strike!.torso_observation, followup.points[0].fix]) expect(finished.body).toContain(expected)
  expect(finished.body).toContain('Dry rehearsal · 3 sets × 6 dry reps within normal skill work.')
})

test('the signed-off dosage or custom note takes precedence and no unrelated library drills are added', async () => {
  for (const [assigned, present, absent] of [
    [drill, '3 sets × 6 dry reps','One walk-through'],
    [{...drill,custom_note:'One walk-through in warmup.'},'One walk-through','6 dry reps'],
  ] as const) {
    stub(plan)
    const finished = await designTrainingPlan({...source,approvedDrills:[assigned]},mechanics,followup,[])
    expect(finished.body).toContain(present); expect(finished.body).not.toContain(absent)
  }
})

test('incomplete, invented quantities and reversals of observed evidence fail at their originating stage', async () => {
  stub(mechanics, 'incomplete')
  await expect(readBiomechanics(source)).rejects.toThrow('did not finish')
  stub({...mechanics,findings:[mechanics.findings[1], mechanics.findings[1]]})
  await expect(readBiomechanics(source)).rejects.toThrow('did not cover')
  for (const invented of ['Your fastball reached 95 mph.', 'Your elbow measured 94 degrees.', 'Your torso opens early.']) {
    stub({...followup,recap:invented})
    await expect(writeAthleteFollowup(source, mechanics)).rejects.toThrow()
  }
})

test('training cannot attach a drill to a visibility limit, leave a fix unaddressed, or invent a catalog exercise', async () => {
  for (const steps of [[], [{...plan.steps[0],sourceIndexes:[1]}], [{...plan.steps[0],drillName:'Invented throw'}]]) {
    stub({...plan,steps})
    await expect(designTrainingPlan(source, mechanics, followup, [drill])).rejects.toThrow()
  }
})

test('a maintenance-only assessment produces a plan without manufacturing a corrective drill', async () => {
  const baseline = {...source,findings:[],strengths:['Your sequence holds through release.']}
  stub({focus:'Keep your normal warm-up and repeat your natural sequence.',steps:[],transfer:plan.transfer,retest:plan.retest})
  const result = await designTrainingPlan(baseline,{overview:'No change indicated.',findings:[]},{opening:'Keep the sequence.',points:[],recap:'Stay with your timing.'},[])
  expect(result.body).toContain('repeat your natural sequence')
  expect(result.body).not.toContain('Your adjustment')
})

test('indexes additional phase opportunities and textual priorities without doubling identical evidence or inferring flaws from scores', () => {
  const enriched = reviewedSource({...source, priorities:[source.findings[0].answer,'Your weight shifts back before landing.'],
    phaseNotes:[{position:'peak_leg_lift',development_opportunity:'Build forward direction.',coaching_cue:'Let your belt move toward the plate.'}],
    scorecard:[{category:'Direction',score:2}]})
  expect(enriched.findings).toHaveLength(4)
  expect(enriched.findings[2]).toMatchObject({topic:'peak leg lift',coaching_action:'Let your belt move toward the plate.'})
  expect(reviewedSource({...source,findings:[],summary:'Your knee keeps giving way after plant.'}).findings[0].answer).toContain('after plant')
})

test('automatic frame captions locate a phase but cannot become a coaching point or hide a real coach cue', () => {
  const enriched = reviewedSource({...source, phaseNotes:[
    {position:'ball_release',reviewer_notes:'Key frame from your delivery at 2.63 seconds.'},
    {position:'finish',reviewer_notes:'Key frame from your delivery.'},
    {position:'lead_foot_contact',reviewer_notes:'Key frame from your delivery at 2.04 seconds.',coaching_cue:'Keep your glove near the chest.'},
  ]})
  expect(enriched.findings.slice(source.findings.length).map(f => f.answer)).toEqual(['Keep your glove near the chest.'])
  expect(enriched.phaseNotes).toHaveLength(3)
})

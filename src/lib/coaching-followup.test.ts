import { generateCoachingFollowup, selectFollowUpDrillCandidates, type CoachingDrill, type CoachingFollowupSource } from './coaching-followup'
import { footStrikeFinding } from './foot-strike-review'
import type { MechanicsFinding } from './mechanics-findings'

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('./followup-voice-settings', () => ({ loadFollowUpVoice: async () => ({
  note: 'Name the moment the shoe lands.', examples: [{ source: 'Fictional radar example', response: 'Your fastball reached 95 mph.' }],
}) }))
const sourceKey = process.env.OPENAI_API_KEY
const originalFetch = global.fetch
const send = jest.fn()
beforeEach(() => { process.env.OPENAI_API_KEY = 'mock'; global.fetch = send; send.mockReset() })
afterAll(() => { global.fetch = originalFetch; if (sourceKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = sourceKey })

const plant = footStrikeFinding({
  contact_status: 'bracketed', first_planted_time: 1, last_airborne_time: 0.95, hand_up_l: 'absent',
  arm_timing: 'issue_visible', arm_observation: 'Your throwing hand was below your elbow at plant.',
  torso_opening: 'unresolved', torso_observation: 'We cannot resolve chest rotation from this angle.',
}, 'The throwing hand rose after the front shoe settled.', null, ['private-attachment-key'])
const knee: MechanicsFinding = { topic: 'Lead knee after plant', flag_id: 122, verdict: 'observed', answer: 'Your knee keeps bending.',
  evidence: 'Your front knee moves forward from plant through release.', evidence_keys: ['private-attachment-key'], coaching_action: 'Take your weight on the front leg and turn around it.' }
const drill: CoachingDrill = { name: 'Front-Leg Block Dry Reps', sets: 3, reps: '6 dry reps', description: 'Stride and turn without a ball.',
  coaching_cues: ['Take your weight on the front leg.'], common_mistakes: ['Forcing the knee straight'], what_it_trains: 'Front-leg stability' }
const source: CoachingFollowupSource = { summary: 'Prioritize the front leg.', strengths: ['A repeatable stride.'], findings: [knee, plant], approvedDrills: [drill] }
const output = { executive: 'Start with what happens after your front shoe lands.', mechanical: [
  { sourceIndex: 0, explanation: 'Your knee keeps bending as you turn.' },
  { sourceIndex: 1, explanation: 'Your arm was ready and your chest was open.' },
], transfer: 'Look at your knee after the shoe lands on your usual mound throws.', retest: 'Compare the knee at the same point on comparable throws.', recap: 'Keep the stride. Work on the front leg.' }
function stub(body: unknown, status = 'completed') {
  send.mockResolvedValue(Response.json({ status, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(body) }] }] }))
}

test('renders the seven sections with the approved dose, separate landing judgments and signed-off work', async () => {
  stub(output)
  const body = await generateCoachingFollowup({ ...source, session: 'Use the controlled portion of Tuesday’s planned session.' })
  expect(body.match(/^\d\. .+/gm)).toHaveLength(7)
  for (const text of [drill.name, '3 sets × 6 dry reps', 'Watch for · Forcing the knee straight', 'Tuesday',
    'has not reached the hand-up L', 'hand was below your elbow', 'cannot resolve chest rotation']) expect(body).toContain(text)
  expect(body).not.toContain('your chest was open')
  const request = JSON.parse(send.mock.calls[0][1].body)
  expect(request.store).toBe(false)
  expect(request.input).not.toContain('private-attachment-key')
  expect(JSON.parse(request.input).assessment.findings).toHaveLength(2)
  expect(JSON.parse(request.input).teamVoice.note).toContain('shoe lands')
})

test('keeps the coach’s custom dose and prevents a voice example supplying an athlete’s velocity or a made-up elbow angle', async () => {
  stub(output)
  const body = await generateCoachingFollowup({ ...source, approvedDrills: [{ ...drill, custom_note: 'One walk-through during warmup.' }] })
  expect(body).toContain('One walk-through')
  expect(body).not.toContain('6 dry reps')
  for (const claim of ['Your fastball reached 95 mph.', 'Your elbow measured 94 degrees.']) {
    stub({ ...output, executive: claim })
    await expect(generateCoachingFollowup(source)).rejects.toThrow('unverified angle or velocity')
  }
})

test('fails closed on incomplete output and missing findings', async () => {
  stub(output, 'incomplete')
  await expect(generateCoachingFollowup(source)).rejects.toThrow('did not finish')
  stub({ ...output, mechanical: [output.mechanical[0], output.mechanical[0]] })
  await expect(generateCoachingFollowup(source)).rejects.toThrow('did not cover')
})

test('catches a recap or summary that reverses a reviewed torso judgment or invents a velocity gain', async () => {
  for (const claim of ['Your torso opens early.', 'Your fastball gained velocity.']) {
    stub({ ...output, recap: claim })
    await expect(generateCoachingFollowup(source)).rejects.toThrow('beyond the reviewed evidence')
  }
  stub({ ...output, executive: 'This view cannot tell whether your chest opens early.' })
  await expect(generateCoachingFollowup(source)).resolves.toContain('Mechanical breakdown')
})

test('proposes a specific catalog exercise for an observed flag only, without assigning its default workload', async () => {
  const options = selectFollowUpDrillCandidates([knee, plant], [drill], [])
  expect(options).toEqual([{ ...drill, findingIndex: 0, sets: null, reps: null }])
  for (const findings of [[plant], [{ ...knee, verdict: 'unable_to_assess' as const }], [{ ...knee, coaching_action: 'Skip any front-leg work for now.' }]]) {
    expect(selectFollowUpDrillCandidates(findings, [drill], [])).toEqual([])
  }
  expect(selectFollowUpDrillCandidates([knee], [drill], [drill])).toEqual([])
  stub(output)
  const body = await generateCoachingFollowup({ ...source, approvedDrills: [], suggestedDrills: options })
  expect(body).toContain('Drill option for coach review · Front-Leg Block Dry Reps')
  expect(body).toContain('No separate session was assigned')
  expect(body).not.toContain('6 dry reps')
})

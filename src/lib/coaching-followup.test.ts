import { specialistFailureReason, readBiomechanics, reviewedSource, writeAthleteFollowup, designTrainingPlan, type CoachingDrill, type CoachingFollowupSource } from './coaching-followup'
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
const torsoPriority = { primarySourceIndex:0, linkedSourceIndexes:[] as number[], title:'Sequence the turn',
  observation:'Your shoulders follow the hips as soon as you land.',
  whyItMatters:'When the hips and shoulders move together, it can be harder to time the release.',
  adjustment:'Let the front hip turn before the shirt follows.' }
const followup = { athletePriorities:[torsoPriority], opening: 'Work on the turn after the shoe comes down.', points: [
  { sourceIndex: 0, explanation: 'Your shoulders follow the hips as soon as you land.', fix: 'Let the front hip turn before the shirt follows.' },
  { sourceIndex: 1, explanation: 'Published separately.', fix: null },
], recap: 'Keep the stride; separate the turn.' }
const plan = { focus: 'Begin with a dry rehearsal in your normal warm-up.', steps: [
  { primarySourceIndex: 0, linkedSourceIndexes: [] as number[], task: 'Start from your usual stride, lead the turn with the hip, and finish naturally.',
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
  for (const expected of [drill.name, plan.steps[0].task, plan.steps[0].success, plan.transfer,
    torsoPriority.whyItMatters, source.strengths[0]]) expect(finished.body).toContain(expected)
  expect(finished.body).toMatch(/^Your development plan\n1\. Hip-Lead Separation Dry Reps/)
  expect(finished.body).not.toContain(followup.points[0].fix)
  expect(finished.body).not.toContain(drill.coaching_cues[0])
  expect(finished.body).not.toContain(plan.steps[0].cue)
  expect(coach.points[1].explanation).toContain(plant.foot_strike!.torso_observation)
  expect(finished.body).not.toContain('has not reached the hand-up L')
  expect(finished.body).not.toContain(plant.foot_strike!.torso_observation)
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
  for (const steps of [[], [{...plan.steps[0],primarySourceIndex:1}], [...plan.steps,{...plan.steps[0],primarySourceIndex:null}],
    [{...plan.steps[0],linkedSourceIndexes:[1]}], [{...plan.steps[0],linkedSourceIndexes:[0]}],
    [{...plan.steps[0],primarySourceIndex:undefined}], [{...plan.steps[0],drillName:'Invented throw'}]]) {
    stub({...plan,steps})
    await expect(designTrainingPlan(source, mechanics, followup, [drill])).rejects.toThrow()
  }
})

test('the strict training request enumerates only reviewed fixes and allows one step to train linked targets', async () => {
  const additional = {...source.findings[0], topic:'Front leg', answer:'The front knee keeps bending through the turn.'}
  const expanded = {...source, findings:[...source.findings, additional]}
  const handoff = {...mechanics, findings:[...mechanics.findings,
    {sourceIndex:2,disposition:'develop',interpretation:additional.answer}]}
  const additionalPoint = {sourceIndex:2,explanation:additional.answer,fix:'Stand into the front hip as you turn.'}
  const linked = {...torsoPriority,linkedSourceIndexes:[2], title:'Receive your weight and turn',
    observation:'Your knee keeps bending as your hips and shoulders turn together.'}
  const coach = {...followup, athletePriorities:[linked], points:[additionalPoint,...followup.points]}
  stub({...plan,steps:[{...plan.steps[0],primarySourceIndex:0,linkedSourceIndexes:[2]}]})
  const result = await designTrainingPlan(expanded,handoff,coach,[drill])
  const request = JSON.parse(send.mock.calls[0][1].body)
  expect(request.text.format.strict).toBe(true)
  const stepSchema = request.text.format.schema.properties.steps.items
  expect(stepSchema.required).toEqual(expect.arrayContaining(['primarySourceIndex','linkedSourceIndexes']))
  expect(stepSchema.properties.primarySourceIndex).toEqual({type:'integer',enum:[0,2]})
  expect(stepSchema.properties.linkedSourceIndexes).toEqual({
    type:'array',items:{type:'integer',enum:[0,2]},
  })
  expect(JSON.parse(request.input).correctiveTargets).toEqual([
    {sourceIndex:0,topic:source.findings[0].topic,problem:followup.points[0].explanation,fix:followup.points[0].fix},
    {sourceIndex:2,topic:additional.topic,problem:additionalPoint.explanation,fix:additionalPoint.fix},
  ])
  expect(result.body).toContain(linked.observation)
  expect(result.body.match(/Why it matters ·/g)).toHaveLength(1)
  expect(result.body).not.toContain('Your adjustment ·')
  expect(result.artifact.steps[0].sourceIndexes).toEqual([0,2])
  expect(result.artifact.steps[0]).not.toHaveProperty('primarySourceIndex')
})

test('a resumed legacy handoff gets athlete wording in the existing training call without publishing old audit text', async () => {
  const legacy = { opening:'Visibility limits prevented comparison.', points:followup.points,
    recap:'No clear issue with this part of the delivery.' }
  stub({...plan,athletePriorities:[torsoPriority]})
  const result = await designTrainingPlan(source,mechanics,legacy,[drill])
  expect(send).toHaveBeenCalledTimes(1)
  expect(JSON.parse(send.mock.calls[0][1].body).text.format.schema.required).toContain('athletePriorities')
  expect(result.body).toContain(torsoPriority.whyItMatters)
  expect(result.body).not.toContain(legacy.opening)
  expect(result.body).not.toContain(legacy.recap)
  expect(result.body).not.toContain('Published separately.')
})

test('a linked low arm path gets one available Figure 8 in the drill-first plan without changing an on-time break',async () => {
  const figure8 = {...drill,name:'Figure 8 Rhythm Rocker',description:'Trace a relaxed figure eight before rocking into the delivery.'}
  const janitor = {...drill,name:'Janitor Throws'}
  const landing = footStrikeFinding({...plant.foot_strike!,arm_timing:'issue_visible',hand_up_l:'absent',
    arm_observation:'Your hand is still below your elbow after the front foot lands, and rises after plant.'},
    'The throwing hand rises above the elbow after the front foot is flat.',null)
  const path = {...source.findings[0],topic:'Hand path from separation to landing',evidence_keys:['hand_separation','lead_foot_contact'],
    answer:'Your hands separate during the stride on time, and the throwing hand stays low near your back hip before it rises after landing.'}
  const single = {...source,findings:[landing,path],session:'Stay within the 10 throws already planned. Foot-strike freeze at landing.',
    bullpenTransfer:'Use your existing 10 throws with the cue ball up with the stride.',retest:'Ball up with the stride.'}
  const bio = {overview:'The hand rises after landing.',findings:[landing,path].map((row,sourceIndex) =>
    ({sourceIndex,disposition:'develop',interpretation:row.answer}))}
  const linked = {...torsoPriority,title:'Arm rhythm through landing',primarySourceIndex:0,linkedSourceIndexes:[1],
    observation:'Your hand stays close to the back hip through landing.',whyItMatters:'A late rise can make the release harder to repeat.'}
  const coach = {...followup,athletePriorities:[linked],points:[landing,path].map((row,sourceIndex) =>
    ({sourceIndex,explanation:row.answer,fix:'Bring the ball hand up sooner.'}))}
  const step = {...plan.steps[0],primarySourceIndex:0,linkedSourceIndexes:[1],drillName:figure8.name,
    task:'Trace a loose figure eight, rock into the throw and play catch at your usual pace.',cue:'Send the ball through the mitt.',
    success:'On the next regular delivery, the arm comes through in time with landing without a pause.'}
  stub({...plan,steps:[step]})
  const handBreak = {...drill,name:'Hand-Break Timing Dry Reps'}
  const result = await designTrainingPlan(single,bio,coach,[figure8,janitor,handBreak])
  const req = JSON.parse(send.mock.calls[0][1].body)
  const input = JSON.parse(req.input)
  expect(input.drillMatches).toEqual([{sourceIndex:0,drillName:figure8.name},{sourceIndex:1,drillName:figure8.name}])
  expect(input.activeCatalog.map((row:{name:string}) => row.name)).toEqual([figure8.name])
  expect(req.text.format.schema.properties.steps.items.properties.drillName).toEqual({type:'string',enum:[figure8.name]})
  expect(result.body).toMatch(/^Your development plan\n1\. Figure 8 Rhythm Rocker/)
  expect(result.body.match(/\d+\. Figure 8 Rhythm Rocker/g)).toHaveLength(1)
  expect(result.body).toContain(step.success)
  expect(result.body).not.toContain(coach.points[0].fix)
  expect(result.body).not.toMatch(/ball up with the stride|foot-strike freeze|task cue/i)
  expect(result.body).toContain('10 throws')
  stub({...plan,steps:[{...step,drillName:null,task:'Rock through a smooth practice delivery toward the target.',
    cue:'Keep your throwing elbow up.'}]})
  const fallback = await designTrainingPlan({...single,session:'Skip Figure 8 Rhythm Rocker during this session.'},bio,coach,[figure8,janitor])
  const fallbackRequest = JSON.parse(send.mock.calls[1][1].body)
  expect(JSON.parse(fallbackRequest.input).drillMatches).toEqual([])
  expect(JSON.parse(fallbackRequest.input).activeCatalog).toEqual([])
  expect(fallback.body).toMatch(/^Your development plan\n1\. Movement rehearsal/)
  expect(fallback.body).not.toContain('Keep your throwing elbow up.')
  stub({...plan,steps:[{...step,drillName:null,task:'Rehearse the pattern in your dry warm-up.'}]})
  const dry = await designTrainingPlan({...single,session:'Dry reps only. No throwing.'},bio,coach,[figure8,janitor])
  expect(JSON.parse(JSON.parse(send.mock.calls[2][1].body).input).drillMatches).toEqual([])
  expect(dry.body).toContain('Dry reps only. No throwing.')
  stub({...plan,steps:[{...step,drillName:handBreak.name}]})
  await expect(designTrainingPlan(single,bio,coach,[figure8,handBreak])).rejects.toThrow()
  stub({...plan,steps:[{...step,drillName:drill.name}]})
  await expect(designTrainingPlan(single,bio,coach,[figure8,drill])).rejects.toThrow('supported correction')
  const approved = {...drill,custom_note:'Use only the throws already in your plan.'}
  stub({...plan,steps:[{...step,drillName:approved.name}]})
  const assigned = await designTrainingPlan({...single,approvedDrills:[approved]},bio,coach,[figure8,drill])
  expect(assigned.body).toContain(approved.custom_note)
})

test('Janitor can train a reviewed rear-hip hinge correction but not a drift target, even when it was assigned separately',async () => {
  const janitor = {...drill,name:'Janitor Throws',custom_note:'Use only the existing scheduled rehearsal.'}
  const hinge = {...source.findings[0],topic:'Rear-hip hinge',answer:'Your back hip loses its hinge as you move down the mound.',
    coaching_action:'Work on the rear-hip hinge during the stride.'}
  const drift = {...source.findings[0],topic:'Forward drift',answer:'Your center of mass drifts forward during leg lift.'}
  const single = {...source,findings:[hinge,drift],approvedDrills:[janitor]}
  const bio = {overview:'Lower half.', findings:[hinge,drift].map((row,sourceIndex) => ({sourceIndex,disposition:'develop',interpretation:row.answer}))}
  const coach = {...followup,athletePriorities:[torsoPriority,{...torsoPriority,primarySourceIndex:1}],
    points:[hinge,drift].map((row,sourceIndex) => ({sourceIndex,explanation:row.answer,fix:row.answer}))}
  const hingeStep = {...plan.steps[0],drillName:janitor.name}
  const driftStep = {...plan.steps[0],primarySourceIndex:1,drillName:null}
  stub({...plan,steps:[hingeStep,driftStep]})
  const result = await designTrainingPlan(single,bio,coach,[janitor])
  expect(JSON.parse(JSON.parse(send.mock.calls[0][1].body).input).drillMatches).toEqual([{sourceIndex:0,drillName:janitor.name}])
  expect(result.body).toContain(janitor.custom_note)
  stub({...plan,steps:[hingeStep,{...driftStep,drillName:janitor.name}]})
  await expect(designTrainingPlan(single,bio,coach,[janitor])).rejects.toThrow('supported correction')
})

test('athlete priorities cannot omit a fix, duplicate a fix, repeat a visibility limit, or promise a velocity gain', async () => {
  for (const bad of [[], [torsoPriority,torsoPriority], [{...torsoPriority,linkedSourceIndexes:[1]}],
    [{...torsoPriority,whyItMatters:'This is unresolved from the side view.'}],
    [{...torsoPriority,whyItMatters:'This will improve your velocity.'}]]) {
    stub({...followup,athletePriorities:bad})
    await expect(writeAthleteFollowup(source,mechanics)).rejects.toThrow()
  }
})

test('a reviewed elbow bend and a late forearm rise stay separate in a single actionable arm priority', async () => {
  const landing = footStrikeFinding({...plant.foot_strike!,arm_timing:'issue_visible',
    arm_observation:'Your elbow is bent roughly 90 degrees, but your hand is still below it when your front foot lands.'},
    'The throwing hand rises above the elbow after the front shoe settles.',null)
  const single = {...source,findings:[landing]}
  const bio = {overview:'Hand rises after plant.',findings:[{sourceIndex:0,disposition:'develop',interpretation:landing.answer}]}
  const priority = {...torsoPriority,title:'Bring the hand up with the stride',observation:landing.foot_strike!.arm_observation,
    whyItMatters:'If the forearm rises after the chest starts turning, the arm has less time to accelerate and release can be harder to repeat.',
    adjustment:'Let the hand rise as your stride foot travels forward.'}
  const answer = {opening:'Time the rise with landing.',points:[{sourceIndex:0,explanation:landing.answer,fix:priority.adjustment}],
    athletePriorities:[priority],recap:'Let the hand rise with the stride.'}
  stub(answer); stub(plan)
  const stored = await writeAthleteFollowup(single,bio)
  expect(stored.points[0].explanation).toContain('unresolved')
  const {body} = await designTrainingPlan(single,bio,stored,[drill])
  for (const part of [priority.observation,priority.whyItMatters,plan.steps[0].task]) expect(body).toContain(part)
  expect(body).not.toContain(priority.adjustment)
  expect(body).not.toContain('unresolved')
})

test('a confirmed upright landing survives an unrelated visibility limit without claiming the pitcher measured 90 degrees', async () => {
  const landing = footStrikeFinding({...plant.foot_strike!,hand_up_l:'visible',
    arm_observation:'Your hand was up as your front foot landed, but the torso is obscured.'},'The wrist is above the elbow.',null)
  const single = {...source,findings:[landing],strengths:['Your stride held its line.','Your foot stayed planted.']}
  const bio = {overview:'Landing.',findings:[{sourceIndex:0,disposition:'limited',interpretation:landing.answer}]}
  const coach = {opening:'Landing.',points:[{sourceIndex:0,explanation:landing.answer,fix:null}],recap:'Stay on time.'}
  stub({focus:'Use your usual warm-up.',transfer:plan.transfer,retest:plan.retest})
  const {body} = await designTrainingPlan(single,bio,coach,[])
  expect(body).toContain('Your throwing hand was above your elbow')
  expect(body).toContain('90°')
  expect(body).toContain('velocity')
  expect(body).toContain('command')
  expect(body).not.toMatch(/obscured|unresolved|Your foot stayed planted|Your adjustment/)
  const mixed = footStrikeFinding({...landing.foot_strike!,torso_opening:'no_clear_issue',
    torso_observation:'The chest is still turned back.'},'The throwing hand is up.',null)
  stub({focus:'Use your usual warm-up.',transfer:plan.transfer,retest:plan.retest})
  expect((await designTrainingPlan({...single,findings:[mixed]},bio,coach,[])).body).toContain('The chest is still turned back.')
  stub({...followup,athletePriorities:[{...torsoPriority,observation:'Your elbow has a 90-degree bend.'}]})
  await expect(writeAthleteFollowup(source,mechanics)).rejects.toThrow('unverified angle')
  for (const summary of ['Your front knee measured 90°.','A typical reference for elbow bend is about 90°.']) {
    stub({...followup,athletePriorities:[{...torsoPriority,observation:'Your elbow measured 90°.'}]})
    await expect(writeAthleteFollowup({...source,summary},mechanics)).rejects.toThrow('unverified angle')
  }
})

test('an all-limited handoff cannot turn invented maintenance copy into a finding', async () => {
  const limited = {...plant,foot_strike:undefined,topic:'Stride direction',verdict:'unable_to_assess' as const}
  const single = {...source,findings:[limited],strengths:[]}
  const bio = {overview:'Staff record.',findings:[{sourceIndex:0,disposition:'limited',interpretation:'Unresolved.'}]}
  const coach = {opening:'Unresolved.',points:[{sourceIndex:0,explanation:'Unresolved.',fix:null}],recap:'Unresolved.'}
  stub({focus:'Keep your stable front knee.',transfer:'Keep your stable front knee.',retest:'Keep your stable front knee.'})
  const {body} = await designTrainingPlan(single,bio,coach,[])
  expect(body).toContain('Continue your current throwing plan.')
  expect(body).not.toMatch(/90°|Unresolved|front knee|Keep doing/i)
})

test('a positively reviewed landing correction survives a model preference to maintain and accepts documented hyphenated quantities',async () => {
  const landing = footStrikeFinding({...plant.foot_strike!,arm_timing:'issue_visible',
    arm_observation:'You have a 90-degree elbow bend, and your hand rises after landing.'},'The wrist comes up after plant.',
    'Let the hand rise during the stride.')
  const single = {...source,findings:[{...landing,answer:'The hand rises after plant.'}]}
  stub({overview:'Your elbow has a 90 degrees bend.',findings:[{sourceIndex:0,disposition:'maintain',interpretation:landing.answer}]})
  expect((await readBiomechanics(single)).findings[0].disposition).toBe('develop')
  stub({...mechanics,overview:'Your elbow measured 94‑degrees.'})
  await expect(readBiomechanics(source)).rejects.toThrow('unverified angle')
})

test('staff can record the numeric L reference as education while the writer cannot quote it as an athlete measurement',async () => {
  const note = 'Near 90° is a reference; exact elbow angle not measured.'
  const landing = footStrikeFinding({...plant.foot_strike!,arm_observation:note},'The wrist stays below the elbow after plant.',null)
  const single = {...source,findings:[landing]}
  const handoff = {overview:'The hand is below the elbow at landing.',findings:[{sourceIndex:0,disposition:'limited',interpretation:'Reviewed separately.'}]}
  const coach = {opening:'Keep the stride.',points:[{sourceIndex:0,explanation:'Reviewed separately.',fix:null}],athletePriorities:[],recap:'Stay with the same rhythm.'}
  stub(handoff); stub(coach)
  const bio = await readBiomechanics(single)
  expect(bio.findings[0].interpretation).toContain(note)
  expect((await writeAthleteFollowup(single,bio)).points[0].explanation).toContain(note)
  expect(JSON.parse(send.mock.calls[1][1].body).instructions).toContain('renderer provides the generic numeric L benchmark')
  stub({...coach,recap:'Your elbow measured 90°.'})
  await expect(writeAthleteFollowup(single,bio)).rejects.toThrow('unverified angle')
})

test('a maintenance-only assessment produces a plan without manufacturing a corrective drill', async () => {
  const baseline = {...source,findings:[],strengths:['Your sequence holds through release.']}
  stub({focus:'Keep your normal warm-up and repeat your natural sequence.',transfer:plan.transfer,retest:plan.retest})
  const result = await designTrainingPlan(baseline,{overview:'No change indicated.',findings:[]},{opening:'Keep the sequence.',points:[],recap:'Stay with your timing.'},[])
  const request = JSON.parse(send.mock.calls[0][1].body)
  expect(JSON.parse(request.input).correctiveTargets).toEqual([])
  expect(request.text.format.schema.properties).not.toHaveProperty('steps')
  expect(request.text.format.schema.additionalProperties).toBe(false)
  expect(result.artifact.steps).toEqual([])
  expect(result.body).toContain('repeat your natural sequence')
  expect(result.body).not.toContain('Your adjustment')
})

test('a maintenance handoff with findings permits no corrective work and a contradictory fix is rejected before generation', async () => {
  const kept = {...mechanics, findings:[{...mechanics.findings[0],disposition:'maintain'},mechanics.findings[1]]}
  await expect(designTrainingPlan(source,kept,followup,[drill])).rejects.toThrow('specific fix')
  expect(send).not.toHaveBeenCalled()
  stub(plan)
  const maintenance = {...followup,points:followup.points.map(point => ({...point,fix:null}))}
  await expect(designTrainingPlan(source,kept,maintenance,[drill])).rejects.toThrow()
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

test('specialist diagnostics allowlist reason codes and conceal private provider text', async () => {
  const secret = 'private athlete or provider message'
  expect(specialistFailureReason(new Error(secret))).toBe('unclassified')
  expect(specialistFailureReason(new SyntaxError(secret))).toBe('invalid_json')
  expect(specialistFailureReason(new Error('Training volume must come from the saved prescription.'))).toBe('unverified_workload')
  for (const [status,code,expected] of [[400,'invalid_json_schema','provider_http_400_invalid_json_schema'],
    [499,secret,'provider_http_other_other']] as const) {
    send.mockResolvedValueOnce({ok:false,status,json:async()=>({error:{message:secret,code}})})
    const failure = await readBiomechanics(source).catch(error => error)
    expect(specialistFailureReason(failure)).toBe(expected)
  }
})

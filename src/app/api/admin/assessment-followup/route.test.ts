import { GET, PATCH, POST } from './route'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { readBiomechanics, writeAthleteFollowup, designTrainingPlan } from '@/lib/coaching-followup'

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({createAdminClient: jest.fn(),createClient: jest.fn()}))
jest.mock('@/lib/coaching-followup', () => ({...jest.requireActual('@/lib/coaching-followup'), readBiomechanics: jest.fn(),writeAthleteFollowup: jest.fn(),designTrainingPlan: jest.fn(),reviewedSource:(source: unknown) => source}))

const id = '196556b5-74d0-47d4-a859-ff9d721147dd'
const url = 'http://localhost/api/admin/assessment-followup?analysisId=' + id
const source = {summary:'Coach verified.',findings:[],strengths:['Stable landing.'],approvedDrills:[]}
const row = {analysis_id:id,source_revision:'2026-11-12T18:20:00.000000+00:00',status:'ready',body:'Coach draft',updated_at:'2026-11-12T18:24:00.200003+00:00',source}
const post = (body: object) => new Request(url, {method:'POST',body:JSON.stringify(body)})
function setup(staff: boolean | null, claimed: boolean, start = 0, loseLease = false) {
  const staffSelect = {select: () => staffSelect,eq: () => staffSelect,maybeSingle: async () => ({data:{is_admin:staff}})}
  ;(createClient as jest.Mock).mockResolvedValue({auth:{getUser: async () => ({data:{user: staff === null ? null : {id:'staff'}}})},from: () => staffSelect})
  const resultRead = {select: () => resultRead,eq: () => resultRead,order: () => resultRead,limit: () => resultRead,maybeSingle: async () => ({data:row})}
  let next = start
  const stages = ['biomechanics','followup','training']
  const handoffs: Record<string, unknown> = { biomechanics: start ? {read:'saved'} : null, followup: start === 2 ? {coach:'saved'} : null }
  const rpc = jest.fn((name: string, args: Record<string,unknown>) => {
    if (name === 'claim_assessment_followup') return {maybeSingle: async () => ({data:claimed && next < 3 ? {
      source,claim_id:'lease' + next,source_revision:row.source_revision,pipeline_stage:stages[next],...handoffs,
    } : null})}
    if (name === 'advance_assessment_followup') {
      if (loseLease) return Promise.resolve({ data:false })
      handoffs[stages[next++]] = args.stage_output
      return Promise.resolve({data:true})
    }
    if (name === 'edit_assessment_followup') return Promise.resolve({data:false})
    return Promise.resolve({data:null,error:null})
  })
  const drillSelect = {select: () => drillSelect,eq: () => drillSelect,order: async () => ({data:[]})}
  ;(createAdminClient as jest.Mock).mockReturnValue({from: (table: string) => table === 'drills' ? drillSelect : resultRead,rpc})
  return rpc
}
beforeEach(() => jest.clearAllMocks())

test.each([null,false])('no assessment source can be read or rewritten without staff access', async staff => {
  setup(staff,false)
  for (const call of [GET,POST,PATCH]) {
    expect((await call(post({analysisId:id}))).status).toBe(staff === null ? 401 : 403)
  }
  expect(createAdminClient).not.toHaveBeenCalled()
})

test('opening a verified draft reads the same saved source without generating or assigning anything', async () => {
  const rpc=setup(true,false)
  expect(await (await GET(new Request(url))).json()).toEqual({draft:row})
  expect(rpc).not.toHaveBeenCalled()
  expect(readBiomechanics).not.toHaveBeenCalled()
})

test('an ineligible or already generated draft never contacts the writer',async () => {
  const rpc=setup(true,false)
  expect((await POST(post({analysisId:id}))).status).toBe(200)
  expect(rpc).toHaveBeenCalledWith('claim_assessment_followup',{target_id:id})
  expect(readBiomechanics).not.toHaveBeenCalled()
})

test('each successor receives the saved predecessor, with a fresh claim and revision-checked save at every stage',async () => {
  const rpc=setup(true,true)
  ;(readBiomechanics as jest.Mock).mockResolvedValue({read:'first'})
  ;(writeAthleteFollowup as jest.Mock).mockResolvedValue({coach:'second'})
  ;(designTrainingPlan as jest.Mock).mockResolvedValue({artifact:{steps:['specific']},body:'A new report.'})
  expect((await POST(post({analysisId:id}))).status).toBe(200)
  expect(readBiomechanics).toHaveBeenCalledWith(source)
  expect(writeAthleteFollowup).toHaveBeenCalledWith(source,{read:'first'})
  expect(designTrainingPlan).toHaveBeenCalledWith(source,{read:'first'},{coach:'second'},[])
  expect(rpc.mock.calls.filter(([name]) => name === 'claim_assessment_followup')).toHaveLength(3)
  expect(rpc).toHaveBeenCalledWith('advance_assessment_followup',{target_id:id,source_at:row.source_revision,token:'lease2',stage:'training',stage_output:{steps:['specific']},draft_body:'A new report.'})
})

test('training can resume using saved artifacts without rerunning the other two specialists',async () => {
  setup(true,true,2)
  ;(designTrainingPlan as jest.Mock).mockResolvedValue({artifact:{steps:[]},body:'Recovered.'})
  await POST(post({analysisId:id}))
  expect(readBiomechanics).not.toHaveBeenCalled()
  expect(writeAthleteFollowup).not.toHaveBeenCalled()
  expect(designTrainingPlan).toHaveBeenCalledWith(source,{read:'saved'},{coach:'saved'},[])
})

test('provider failure releases only the current lease and prevents successor dispatch',async () => {
  const rpc=setup(true,true,1)
  ;(writeAthleteFollowup as jest.Mock).mockRejectedValue(new Error('synthetic refusal'))
  await POST(post({analysisId:id}))
  expect(rpc).toHaveBeenCalledWith('finish_assessment_followup',expect.objectContaining({draft_body:null,token:'lease1'}))
  expect(designTrainingPlan).not.toHaveBeenCalled()
})

test('an expired or superseded lease stops the chain',async () => {
  setup(true,true,0,true)
  ;(readBiomechanics as jest.Mock).mockResolvedValue({read:'first'})
  await POST(post({analysisId:id}))
  expect(writeAthleteFollowup).not.toHaveBeenCalled()
})

test('a concurrent staff edit returns conflict',async () => {
  setup(true,false)
  const response = await PATCH(post({analysisId:id,sourceRevision:row.source_revision,revision:row.updated_at,body:'Revised.'}))
  expect(response.status).toBe(409)
})

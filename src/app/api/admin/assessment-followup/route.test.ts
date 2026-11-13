import { GET, PATCH, POST } from './route'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { generateCoachingFollowup } from '@/lib/coaching-followup'

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({createAdminClient: jest.fn(),createClient: jest.fn()}))
jest.mock('@/lib/coaching-followup', () => ({generateCoachingFollowup: jest.fn(),selectFollowUpDrillCandidates: jest.fn(() => [])}))

const id = '196556b5-74d0-47d4-a859-ff9d721147dd'
const url = 'http://localhost/api/admin/assessment-followup?analysisId=' + id
const source = {summary:'Coach verified.',findings:[],strengths:['Stable landing.'],approvedDrills:[]}
const row = {analysis_id:id,source_revision:'2026-11-12T18:20:00.000000+00:00',status:'ready',body:'Coach draft',updated_at:'2026-11-12T18:24:00.200003+00:00',source}
const post = (body: object) => new Request(url, {method:'POST',body:JSON.stringify(body)})
function setup(staff: boolean | null, claimed: boolean) {
  const staffSelect = {select: () => staffSelect,eq: () => staffSelect,maybeSingle: async () => ({data:{is_admin:staff}})}
  ;(createClient as jest.Mock).mockResolvedValue({auth:{getUser: async () => ({data:{user: staff === null ? null : {id:'staff'}}})},from: () => staffSelect})
  const resultRead = {select: () => resultRead,eq: () => resultRead,order: () => resultRead,limit: () => resultRead,maybeSingle: async () => ({data:row})}
  const rpc = jest.fn((name: string) => {
    if (name === 'claim_assessment_followup') return {maybeSingle: async () => ({data:claimed ? {source,claim_id:'lease',source_revision:row.source_revision} : null})}
    if (name === 'edit_assessment_followup') return Promise.resolve({data:false})
    return Promise.resolve({data:null,error:null})
  })
  ;(createAdminClient as jest.Mock).mockReturnValue({from: () => resultRead,rpc})
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
  expect(generateCoachingFollowup).not.toHaveBeenCalled()
})

test('an ineligible or already generated draft never contacts the writer',async () => {
  const rpc=setup(true,false)
  expect((await POST(post({analysisId:id}))).status).toBe(200)
  expect(rpc).toHaveBeenCalledWith('claim_assessment_followup',{target_id:id})
  expect(generateCoachingFollowup).not.toHaveBeenCalled()
})

test('the writer receives only the verified source and persists using the worker lease',async () => {
  const rpc=setup(true,true)
  ;(generateCoachingFollowup as jest.Mock).mockResolvedValue('A new draft.')
  expect((await POST(post({analysisId:id}))).status).toBe(200)
  expect(generateCoachingFollowup).toHaveBeenCalledWith(source)
  expect(rpc).toHaveBeenCalledWith('finish_assessment_followup',{target_id:id,source_at:row.source_revision,token:'lease',draft_body:'A new draft.'})
})

test('provider failure releases the lease as failed and preserves the saved review',async () => {
  const rpc=setup(true,true)
  ;(generateCoachingFollowup as jest.Mock).mockRejectedValue(new Error('synthetic refusal'))
  await POST(post({analysisId:id}))
  expect(rpc).toHaveBeenCalledWith('finish_assessment_followup',expect.objectContaining({draft_body:null,token:'lease'}))
})

test('a concurrent staff edit returns conflict',async () => {
  setup(true,false)
  const response = await PATCH(post({analysisId:id,sourceRevision:row.source_revision,revision:row.updated_at,body:'Revised.'}))
  expect(response.status).toBe(409)
})

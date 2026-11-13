import { missingLandingFinding } from '@/lib/foot-strike-review'
import { POST } from './route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

const finding = { flag_id: 144, topic: 'Lead knee', verdict: 'unsupported', answer: 'The knee holds its bend.', evidence: 'The front knee is still flexed in the release image.', evidence_keys: ['ball_release'], coaching_action: null }
const snapshots = [{ key: 'ball_release', storage_path:'owner/motion-lab/motion/phases/ball_release.png', confidence_note:'Release candidate.' }]
const request = (edits = {}) => new Request('http://localhost/api/admin/mechanics-review', {method:'POST', body: JSON.stringify({ analysisId:'motion', orderId:'order', revision:'t1', summary:'The front leg holds through release.', findings:[finding,missingLandingFinding()], ...edits })})
function mockDb({isAdmin=true, owner='owner', saved=true, overview=''} = {}) {
  const read = (data: unknown) => {
    const query = { eq:jest.fn(), single:async()=>({data}), maybeSingle:async()=>({data}) }
    query.eq.mockReturnValue(query)
    return query
  }
  const updateQuery = { ...read(saved ? {id:'motion'} : null), is:jest.fn(), select:jest.fn() }
  for (const fn of [updateQuery.eq,updateQuery.is,updateQuery.select]) fn.mockReturnValue(updateQuery)
  const update = jest.fn().mockReturnValue(updateQuery)
  ;(createClient as jest.Mock).mockResolvedValue({
    auth: {getUser:async()=>({data:{user:{id:'staff'}}})},
    from: (table: string) => ({
      select:()=>read(table==='profiles' ? {is_admin:isAdmin} : table==='orders' ? {id:'order',user_id:owner,status:'in_analysis'} : {id:'motion',order_id:'order',status:'coach_review',user_id:'owner',phase_snapshots:snapshots,clip_summary:{delivery_overview:{storage_path:overview}}}),
      update,
    }),
  })
  return { update, updateQuery }
}
test('staff can author an assessment without an AI draft and save its cited evidence', async()=>{
  const {update,updateQuery} = mockDb()
  expect((await POST(request())).status).toBe(200)
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ biggest_opportunity:{findings:[finding,missingLandingFinding()]}, ai_model:null, ai_draft_status:'ready_for_staff_review' }))
  expect(updateQuery.eq).toHaveBeenCalledWith('updated_at','t1')
})
test('staff cannot attach a review to another athlete’s order', async()=>{
  const {update} = mockDb({owner:'other'})
  expect((await POST(request())).status).toBe(409)
  expect(update).not.toHaveBeenCalled()
})
test('rejects a finding that cites an unavailable frame', async()=>{
  const {update}=mockDb()
  expect((await POST(request({findings:[{...finding,evidence_keys:['finish']},missingLandingFinding()]}))).status).toBe(400)
  expect(update).not.toHaveBeenCalled()
})
test('requires staff access and rejects stale edits',async()=>{
  mockDb({isAdmin:false})
  expect((await POST(request())).status).toBe(403)
  mockDb({saved:false})
  expect((await POST(request())).status).toBe(409)
})

test('a staff finding may cite the same-analysis filmstrip for an event between snapshots', async()=>{
  const body = {findings:[{...finding,evidence_keys:['delivery_overview']},missingLandingFinding()]}
  mockDb({overview:'owner/motion-lab/motion/phases/delivery_overview.png'})
  expect((await POST(request(body))).status).toBe(200)
  mockDb({overview:'owner/motion-lab/other/phases/delivery_overview.png'})
  expect((await POST(request(body))).status).toBe(400)
})

import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { practicePhases } from '@/lib/practice-evidence'
import { footStrikeFinding, emptyFootStrike } from '@/lib/foot-strike-review'

jest.mock('@/lib/supabase/server', () => ({createClient:jest.fn()}))
const orderId='fbba76a5-2588-4b3e-a749-f9fe6895f3c8', analysisId='bb8de9c8-991a-4ee8-b8e5-e912357fe093'
const profile={user_id:'owner',date_of_birth:'2000-01-01',terms_agreed:true,privacy_agreed:true}
const order={athlete_profile_id:'athlete',user_id:'owner',status:'submitted',payment_confirmed_at:'2026-11-09',refunded_at:null}
const evidence={title:'Practice clip',summary:'Practice delivery with limited visibility of release.',strengths:['Repeatable tempo on this rehearsal.'],
  phases:practicePhases.map(key=>({key,time:1.23456789,sample_times:[1.23456789],columns:1,label:key})),
  findings:[footStrikeFinding({...emptyFootStrike,arm_observation:'The wrist is obscured.',torso_observation:'The chest is difficult to see.'},'The pictured hand is obscured.',null)]}
function req(mode:string, data:object=evidence) {
  return new Request('http://localhost/api/admin/practice-evidence',{method:'POST',body:JSON.stringify({mode,analysisId,orderId,extension:'mov',evidence:data})})
}
function setup({isStaff=true,pitcher=profile,existing=null,reserved=null,missing=false}:{
  isStaff?:boolean;pitcher?:typeof profile|null;existing?:object|null;reserved?:object|null;missing?:boolean
}={}) {
  const inserts=jest.fn(async()=>({error:null}))
  const info=jest.fn(async()=>missing?{error:'missing',data:null}:{error:null,data:{}})
  const from=jest.fn((table:string)=>{
    const filters:Record<string,string>={}
    const q={select:()=>q,eq:(field:string,value:string)=>{filters[field]=value;return q},
      maybeSingle:async()=>({data:table==='profiles'?{is_admin:isStaff}:table==='orders'?order:table==='athlete_profiles'?pitcher:filters.order_id?existing:reserved,error:null}),
      insert:inserts}
    return q
  })
  ;(createClient as jest.Mock).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:'staff'}}})},from,storage:{from:()=>({info})}})
  return {inserts,info,from}
}
test('staff prepare returns private upload destinations for the exact order owner',async()=>{
  const {inserts,info}=setup()
  const response=await POST(req('prepare'))
  const json=await response.json()
  expect(response.status).toBe(200);expect(json.files).toHaveLength(7)
  expect(json.files[0]).toEqual({bucket:'pitch-videos',name:'source',path:'owner/motion-lab/'+analysisId+'/source.mov'})
  expect(inserts).not.toHaveBeenCalled();expect(info).not.toHaveBeenCalled()
})
test('staff finish creates an unpublished working draft with exact timestamps and canonical findings',async()=>{
  const {inserts,info}=setup()
  expect((await POST(req('finish'))).status).toBe(200)
  expect(info).toHaveBeenCalledTimes(7)
  const saved=(inserts.mock.calls as unknown as [[Record<string,unknown>]])[0][0]
  expect(saved).toMatchObject({order_id:orderId,user_id:'owner',athlete_profile_id:'athlete',capture_fps:null,status:'coach_review',ai_draft_status:'ready_for_staff_review',biggest_opportunity:{findings:evidence.findings},phase_snapshots:evidence.phases.map(p=>expect.objectContaining({time:p.time,sample_times:p.sample_times,answer:null}))})
  for(const key of ['reviewed_at','reviewed_by','published_at','checklist_confirmed'])expect(saved).not.toHaveProperty(key)
})
test('double submit of the committed ID is safe, and other orders and IDs are rejected before upload',async()=>{
  const accepted=setup({existing:{id:analysisId,user_id:'owner',athlete_profile_id:'athlete',source_video_storage_path:'owner/motion-lab/'+analysisId+'/source.mov'}})
  expect(await (await POST(req('finish'))).json()).toEqual({saved:true,analysisId})
  expect(accepted.inserts).not.toHaveBeenCalled()
  setup({existing:{id:'other'}});expect((await POST(req('prepare'))).status).toBe(409)
  setup({reserved:{id:analysisId}});expect((await POST(req('prepare'))).status).toBe(409)
})
test('requires staff, existing eligible athlete, matching complete uploads and six distinct phase keys',async()=>{
  const denied=setup({isStaff:false});expect((await POST(req('prepare'))).status).toBe(403)
  expect(denied.from).not.toHaveBeenCalledWith('orders')
  setup({pitcher:null});expect((await POST(req('prepare'))).status).toBe(409)
  const incomplete=setup({missing:true});expect((await POST(req('finish'))).status).toBe(503);expect(incomplete.inserts).not.toHaveBeenCalled()
  setup();expect((await POST(req('prepare',{...evidence,phases:Array(6).fill(evidence.phases[0])}))).status).toBe(400)
})

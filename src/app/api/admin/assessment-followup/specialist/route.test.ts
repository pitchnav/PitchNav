import { GET, PATCH } from './route'
import { createClient, createAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({createClient:jest.fn(),createAdminClient:jest.fn()}))
const revision='2026-11-12T20:00:00.000Z'
const instructions='Explain what happened at foot strike in short sentences. '.repeat(46).trim()
function req(payload: Record<string, unknown>={instructions,revision}) {
  return new Request('http://localhost/api/admin/assessment-followup/specialist',{method:'PATCH',body:JSON.stringify(payload)})
}
function db(staff: boolean, signedIn = true) {
  const settings = {specialist_revision:revision,specialist_instructions:null}
  const query = (data: unknown) => ({select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),maybeSingle:async()=>({data})})
  jest.mocked(createClient).mockResolvedValue({ auth:{getUser:async()=>({data:{user:signedIn?{id:'staff'}:null}})},
    from:(table:string)=>query(table==='profiles' ? {is_admin:staff}:settings),
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  return settings
}
beforeEach(()=>jest.resetAllMocks())
test('requires first-party staff access and validates the exact two-field specialist payload',async()=>{
  db(false,false)
  expect((await GET()).status).toBe(401)
  db(false)
  expect((await PATCH(req())).status).toBe(403)
  db(true)
  await expect((await GET()).json()).resolves.toEqual({instructions:null,revision})
  expect((await PATCH(req({instructions,revision,body:'assessment'}))).status).toBe(400)
  expect((await PATCH(req({instructions:'a'.repeat(12001),revision}))).status).toBe(400)
  expect(createAdminClient).not.toHaveBeenCalled()
})
test('accepts long role instructions with an independent revision and never overwrites team examples or notes',async()=>{
  db(true)
  const query = {update:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),select:jest.fn().mockReturnThis(),
    maybeSingle:jest.fn().mockResolvedValueOnce({data:{specialist_instructions:instructions,specialist_revision:revision}}).mockResolvedValueOnce({data:null})}
  jest.mocked(createAdminClient).mockReturnValue({from:()=>query})
  expect((await PATCH(req())).status).toBe(200)
  expect(query.update).toHaveBeenCalledWith({specialist_instructions:instructions,specialist_revision:expect.any(String)})
  expect(query.eq).toHaveBeenCalledWith('specialist_revision',revision)
  expect((await PATCH(req())).status).toBe(409)
})

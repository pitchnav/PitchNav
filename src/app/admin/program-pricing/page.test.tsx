jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn((path: string) => { throw new Error(`redirect:${path}`) }) }))
import { createClient } from '@/lib/supabase/server'
import Page from './page'
const single = jest.fn()
const from = jest.fn(()=>({select:()=>({eq:()=>({single})})}))
const getUser = jest.fn()
beforeEach(()=>{
 jest.clearAllMocks()
 ;(createClient as jest.Mock).mockResolvedValue({auth:{getUser},from})
 getUser.mockResolvedValue({data:{user:{id:'athlete'}}})
})
test('anonymous request never loads an admin profile or quote', async()=>{
 getUser.mockResolvedValue({data:{user:null}})
 await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('redirect:/login')
 expect(from).not.toHaveBeenCalled()
})
test.each([{data:{is_admin:false}}, {data:null,error:{message:'denied'}}, {data:{is_admin:'true'}}])('non-admin and failed authorization cannot render quote',async profile=>{
 single.mockResolvedValue(profile)
 await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('redirect:/dashboard')
})
test('verified admin receives the calculator',async()=>{
 single.mockResolvedValue({data:{is_admin:true},error:null})
 const result=await Page({searchParams:Promise.resolve({pitcherCount:'25',programPlan:'metrics'})})
 expect(result.type).toBe('section')
})

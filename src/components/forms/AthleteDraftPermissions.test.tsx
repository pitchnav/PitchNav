/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AthleteDraftPermissions } from './AthleteDraftPermissions'
import { createClient } from '@/lib/supabase/client'
jest.mock('@/lib/supabase/client', () => ({createClient:jest.fn()}))

const profile = (id: string, version: number) => ({id,athlete_full_name:id,consent_ai_draft:version>0,ai_draft_permission_version:version,updated_at:'source-revision'})
test('existing family settings require an explicit v3 choice on the named athlete, and permit subsequent withdrawal', async () => {
  const records=[profile('Alex',2),profile('Sam',3)]
  let selected='',grant=false
  const applied=jest.fn()
  const write={
    eq:(key:string,value:string)=>{if(key==='id') selected=value; return write},
    select:()=>write,maybeSingle:async()=>{applied(selected,grant);return {data:profile(selected,grant?3:0)}},
  }
  const order={order:()=>Promise.resolve({data:records})}
  const read={eq:()=>read,order:()=>order}
  ;(createClient as jest.Mock).mockReturnValue({from:()=>({select:()=>read,update:(v:{consent_ai_draft:boolean})=>{grant=v.consent_ai_draft;return write}})})
  render(<AthleteDraftPermissions userId="family" />)
  const alex=await screen.findByRole('checkbox',{name:'Allow AI drafting for Alex'})
  const sam=screen.getByRole('checkbox',{name:'Allow AI drafting for Sam'})
  expect(alex).not.toBeChecked()
  expect(sam).toBeChecked()
  fireEvent.click(alex)
  fireEvent.click(screen.getByRole('button',{name:'Save choice for Alex'}))
  await waitFor(()=>expect(applied).toHaveBeenCalledWith('Alex',true))
  await screen.findByText('Saved AI permission for Alex.')
  fireEvent.click(alex)
  fireEvent.click(screen.getByRole('button',{name:'Save choice for Alex'}))
  await waitFor(()=>expect(applied).toHaveBeenCalledWith('Alex',false))
  expect(sam).toBeChecked()
  expect(applied).toHaveBeenCalledTimes(2)
})

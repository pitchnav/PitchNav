/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MechanicsReviewEditor } from './MechanicsReviewEditor'

test('staff can select any matching flag and submit a finding linked to the release frame', async () => {
  const originalFetch = global.fetch
  const save = jest.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})})
  global.fetch = save
  try {
    render(<MechanicsReviewEditor analysisId="analysis" orderId="order" revision="revision" recap="The knee holds through release."
      initialFindings={[]} frames={[{key:'ball_release',label:'Release',time:1,url:'/frame.png'}]} onSaved={async()=>{}} onDirty={()=>{}} />)
    fireEvent.change(screen.getByLabelText('Search the mechanics library'),{target:{value:'144'}})
    fireEvent.change(screen.getByLabelText('Matching flags (1)'),{target:{value:'144'}})
    fireEvent.click(screen.getByText('Add selected flag'))
    fireEvent.change(screen.getByLabelText('Verdict'),{target:{value:'unsupported'}})
    fireEvent.change(screen.getByLabelText('Answer'),{target:{value:'The knee holds.'}})
    fireEvent.change(screen.getByLabelText('Evidence from this delivery'),{target:{value:'The bend is stable across release.'}})
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText('Save review draft'))
    await waitFor(()=>expect(save).toHaveBeenCalledTimes(1))
    expect(JSON.parse(save.mock.calls[0][1].body).findings).toEqual([expect.objectContaining({flag_id:144, verdict:'unsupported',evidence_keys:['ball_release'],coaching_action:null}), expect.objectContaining({foot_strike: expect.objectContaining({hand_up_l:'unresolved'}), evidence_keys:[], coaching_action:null})])
  } finally { global.fetch = originalFetch }
})
test('can retain a visible early torso opening alongside a roughly right-angle arm without assigning an arm drill', async () => {
  const save = jest.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})})
  const old = global.fetch
  global.fetch = save
  try {
    render(<MechanicsReviewEditor analysisId="a" orderId="o" revision="r" recap="Your chest starts to turn before your front foot is down."
      initialFindings={[]} frames={[{key:'lead_foot_contact',label:'Landing',url:'/landing.png',sampleTimes:[1.1,1.2]}]} onSaved={async()=>{}} onDirty={()=>{}} />)
    fireEvent.change(screen.getByLabelText('Foot strike'),{target:{value:'bracketed'}})
    fireEvent.change(screen.getByLabelText('Last airborne foot'),{target:{value:'1.1'}})
    fireEvent.change(screen.getByLabelText('First planted foot'),{target:{value:'1.2'}})
    fireEvent.change(screen.getByLabelText('Hand-up L at landing'),{target:{value:'absent'}})
    fireEvent.change(screen.getByLabelText('Arm timing'),{target:{value:'no_clear_issue'}})
    fireEvent.change(screen.getByLabelText('Arm position and path'),{target:{value:'The inside elbow angle is about 90° and the hand rises as the shoe lands.'}})
    fireEvent.change(screen.getByLabelText('Torso opening'),{target:{value:'early_visible'}})
    fireEvent.change(screen.getByLabelText('Torso position and rotation'),{target:{value:'Your chest has started turning while your shoe is airborne.'}})
    fireEvent.change(screen.getByLabelText('Evidence across frames'),{target:{value:'The lead shoulder turns away from the plate between the last airborne and first planted panels.'}})
    expect(screen.queryByLabelText('Arm-path drill or rehearsal')).toBeNull()
    fireEvent.click(screen.getByText('Save review draft'))
    await waitFor(()=>expect(save).toHaveBeenCalledTimes(1))
    const row=JSON.parse(save.mock.calls[0][1].body).findings[0]
    expect(row).toMatchObject({verdict:'observed',evidence_keys:['lead_foot_contact'],coaching_action:null,
      foot_strike:{hand_up_l:'absent',arm_timing:'no_clear_issue',torso_opening:'early_visible',last_airborne_time:1.1,first_planted_time:1.2}})
    expect(row.answer).toMatch(/90°.*chest/)
  } finally { global.fetch = old }
})

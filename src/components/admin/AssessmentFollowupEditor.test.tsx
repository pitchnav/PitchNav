/** @jest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {AssessmentFollowupEditor} from './AssessmentFollowupEditor'
import {FollowupVoiceEditor} from './FollowupVoiceEditor'

const originalFetch = global.fetch
afterEach(()=>{global.fetch=originalFetch})
const revision = '2026-11-12T23:00:00.000Z'
const draft = {analysis_id:'analysis',source_revision:revision,updated_at:revision,status:'ready',body:'The foot is planted.'}
function result(body: unknown, status=200) { return {ok:status<400,status,json:async()=>body} }

test('loads approved assessments read-only and preserves unsaved edits on a stale revision',async()=>{
  const fetchMock = jest.fn().mockResolvedValueOnce(result({draft}))
    .mockResolvedValueOnce(result({error:'Another reviewer edited the draft.'},409))
  global.fetch=fetchMock
  render(<AssessmentFollowupEditor analysisId="analysis" hasFindings/>)
  const text = await screen.findByLabelText('Athlete-facing draft') as HTMLTextAreaElement
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(text.value).toEqual(draft.body)
  fireEvent.change(text,{target:{value:'Your foot is down.'}})
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}))
  await screen.findByText('Another reviewer edited the draft.')
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({analysisId:'analysis',sourceRevision:revision,revision,body:'Your foot is down.'})
  expect(text.value).toEqual('Your foot is down.')
  expect(screen.getByRole('button',{name:'Load latest version'})).toBeTruthy()
})

test('does not generate when an existing assessment is opened, and a permitted retry can produce a draft',async()=>{
  const fetchMock=jest.fn().mockResolvedValueOnce(result({draft:null})).mockResolvedValueOnce(result({draft}))
  global.fetch=fetchMock
  render(<AssessmentFollowupEditor analysisId="analysis" hasFindings/>)
  const generate=await screen.findByRole('button',{name:'Generate follow-up'})
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fireEvent.click(generate)
  await screen.findByLabelText('Athlete-facing draft')
  expect(fetchMock.mock.calls[1][1].method).toBe('POST')
})

test('shows only the approved snapshot and keeps missing legacy foot-strike judgments unresolved', async () => {
  const source = { summary: 'The reviewed stride stays on line.', strengths: [], approvedDrills: [], session: 'Catch is scheduled.',
    findings: [{ topic: 'Stride', verdict: 'unsupported', answer: 'On line at landing.', evidence: 'The lead shoe is on line.',
      evidence_keys: ['lead_foot_contact'], coaching_action: null }] }
  global.fetch = jest.fn().mockResolvedValue(result({ draft: { ...draft, source } }))
  render(<AssessmentFollowupEditor analysisId="analysis" hasFindings/>)
  fireEvent.click(await screen.findByText('Reviewed source for this draft'))
  for (const line of [source.summary, 'Hand-up L · Unresolved', 'Arm timing · Unresolved', 'Torso opening · Unresolved',
    'Phase evidence · lead foot contact', source.session]) expect(screen.getByText(line)).toBeTruthy()
})

test('team voice examples need explicit approval before saving',async()=>{
  const voice={ note:'',examples:[{source:'Hand below elbow.',response:'Your hand is still rising when you land.'}] }
  const fetchMock=jest.fn().mockResolvedValue(result({voice,revision}))
  global.fetch=fetchMock
  render(<FollowupVoiceEditor initial={{voice:{note:'',examples:[]},revision}}/>)
  fireEvent.click(screen.getByText('Team coaching voice'))
  fireEvent.click(screen.getByRole('button',{name:'Add writing example'}))
  fireEvent.change(screen.getByLabelText(/Reviewed finding/),{target:{value:voice.examples[0].source}})
  fireEvent.change(screen.getByLabelText(/How you would explain/),{target:{value:voice.examples[0].response}})
  const save=screen.getByRole('button',{name:'Save team voice'}) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(save)
  await waitFor(()=>expect(screen.getByText('Voice saved for future drafts.')).toBeTruthy())
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({voice,revision,approvedForReuse:true})
})

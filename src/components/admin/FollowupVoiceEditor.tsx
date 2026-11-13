'use client'

import { useState } from 'react'
import type { SavedFollowUpVoice } from '@/lib/followup-voice-settings'

export function FollowupVoiceEditor({ initial }: { initial: SavedFollowUpVoice }) {
  const [saved, setSaved] = useState(initial)
  const [note, setNote] = useState(saved.voice.note)
  const [examples, setExamples] = useState(saved.voice.examples)
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dirty = JSON.stringify({ note, examples }) !== JSON.stringify(saved.voice)
  function changeExample(i: number, key: 'source'|'response', value: string) {
    setApproved(false)
    setExamples(rows => rows.map((row,index) => index===i ? {...row,[key]:value} : row))
    setMessage('')
  }
  async function save() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/assessment-followup/voice', { method:'PATCH',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({voice:{note,examples},revision:saved.revision,approvedForReuse:approved}) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save the team voice.')
      setSaved(result); setNote(result.voice.note); setExamples(result.voice.examples); setApproved(false)
      setMessage('Voice saved for future drafts.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the team voice.') }
    finally { setBusy(false) }
  }
  return <details className="card">
    <summary className="cursor-pointer text-lg font-semibold text-white">Team coaching voice</summary>
    <p className="my-3 text-sm text-slate-400">The specialist already uses PitchNav’s coaching format. Save wording preferences and examples here to guide future drafts.</p>
    {saved.revision === null ? <p className="text-sm text-slate-300">Custom voice settings are unavailable. Drafts use the PitchNav coaching style.</p> :
      <fieldset disabled={busy} className="space-y-4">
        <label className="block"><span className="label">Voice preferences (up to 1,200 characters)</span>
          <textarea className="input" rows={3} maxLength={1200} value={note} onChange={e=>{setNote(e.target.value);setMessage('')}} /></label>
        {examples.map((example,i)=><fieldset key={i} className="space-y-2 rounded-lg border border-surface-border p-3">
          <legend className="px-1 font-semibold">Example {i+1}</legend>
          <label className="block"><span className="label">Reviewed finding (up to 1,600 characters)</span>
            <textarea className="input" rows={2} maxLength={1600} value={example.source} onChange={e=>changeExample(i,'source',e.target.value)} /></label>
          <label className="block"><span className="label">How you would explain it (up to 2,400 characters)</span>
            <textarea className="input" rows={4} maxLength={2400} value={example.response} onChange={e=>changeExample(i,'response',e.target.value)} /></label>
          <button type="button" className="text-sm text-red-300" onClick={()=>{setExamples(examples.filter((_,index)=>index!==i));setApproved(false);setMessage('')}}>Remove example</button>
        </fieldset>)}
        {examples.length<3 && <button type="button" className="btn-secondary" onClick={()=>{setExamples([...examples,{source:'',response:''}]);setApproved(false);setMessage('')}}>Add writing example</button>}
        {examples.length>0 && <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} />
          These examples are fictional or de-identified. I have permission to use them in future AI drafts.</label>}
        <div><button type="button" className="btn-primary" onClick={()=>void save()}
          disabled={!dirty || examples.some(e=>!e.source.trim()||!e.response.trim()) || Boolean(examples.length && !approved)}>
          {busy?'Saving…':'Save team voice'}</button></div>
      </fieldset>}
    {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="mt-2 text-sm text-slate-300">{message}</p>}
  </details>
}

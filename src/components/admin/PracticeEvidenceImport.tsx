'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parsePracticeEvidence, practicePhases } from '@/lib/practice-evidence'

type Upload = {bucket:string;path:string;name:string}
type Attempt = {id:string;uploaded:Set<string>;files:Upload[];finishing:boolean}

export function PracticeEvidenceImport({orderId,onSaved}:{orderId:string;onSaved:()=>Promise<void>}) {
  const [video,setVideo] = useState<File|null>(null)
  const [images,setImages] = useState<File[]>([])
  const [record,setRecord] = useState<File|null>(null)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const attempt = useRef<Attempt|null>(null)

  async function run() {
    if (busy || !video || !record) return
    setBusy(true)
    const db = createClient()
    const job = attempt.current ?? {id:crypto.randomUUID(),uploaded:new Set<string>(),files:[],finishing:false}
    attempt.current = job
    try {
      const extension = video.name.split('.').pop()?.toLowerCase()
      if (!['mov','mp4'].includes(extension||'') || !video.size || video.size > 500*1024*1024) throw Error('Choose a MOV or MP4 under 500 MB.')
      if (record.size > 1024*1024) throw Error('Choose an evidence JSON under 1 MB.')
      const evidence = parsePracticeEvidence(JSON.parse(await record.text()))
      const byName = new Map(images.map(file => [file.name.toLowerCase(),file]))
      if (images.length !== practicePhases.length || practicePhases.some(key => !byName.has(key+'.png'))) {
        throw Error('Select one PNG named for each of the six phase keys.')
      }
      for (const frame of images) {
        const signature = new Uint8Array(await frame.slice(0,8).arrayBuffer())
        if (signature.join(',') !== '137,80,78,71,13,10,26,10' || frame.size > 20*1024*1024) throw Error('Each phase must be a valid PNG under 20 MB.')
      }
      async function requestStage(mode:'prepare'|'finish') {
        const response = await fetch('/api/admin/practice-evidence',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({mode,orderId,analysisId:job.id,extension,evidence})})
        const result = await response.json()
        if (!response.ok) {
          if (response.status === 409) job.finishing = false
          throw Error(result.error || 'Could not import the review.')
        }
        return result
      }
      const prepared = await requestStage('prepare')
      if (!prepared.saved) {
        job.files = prepared.files
        for (const item of job.files) {
          if (job.uploaded.has(item.name)) continue
          const source = item.name === 'source' ? video : byName.get(item.name+'.png')!
          setMessage('Uploading '+source.name+'…')
          const {error} = await db.storage.from(item.bucket).upload(item.path,source,{
            contentType:item.name !== 'source' ? 'image/png' : extension === 'mov' ? 'video/quicktime' : 'video/mp4',upsert:false,
          })
          if (error) throw Error('Could not upload '+source.name+'. '+error.message)
          job.uploaded.add(item.name)
        }
        setMessage('Checking uploaded evidence and saving the private draft…')
        job.finishing = true
        await requestStage('finish')
      }
      setMessage('Draft saved. Open the images, then apply the reviewed findings.')
      await onSaved()
    } catch (reason) {
      // A lost save response can hide a committed row. Reconcile that ID on retry.
      if (!job.finishing) {
        const results = await Promise.allSettled(job.files.filter(file => job.uploaded.has(file.name)).map(async file => {
          const {error} = await db.storage.from(file.bucket).remove([file.path])
          if (!error) job.uploaded.delete(file.name)
        }))
        if (!job.uploaded.size && results.every(result => result.status === 'fulfilled')) attempt.current = null
      }
      setMessage(reason instanceof Error ? reason.message : 'Import failed. Retry with these files.')
    } finally {setBusy(false)}
  }
  return <details className="card space-y-3">
    <summary className="cursor-pointer font-bold text-white">Import a practice assessment</summary>
    <p className="text-sm text-slate-400">Use the original clip and its reviewed, timestamped phase images to prepare a private draft for this order.</p>
    <fieldset disabled={busy || Boolean(attempt.current)} className="grid gap-3 sm:grid-cols-3">
      <label><span className="label">Original practice video</span><input className="input" type="file" accept=".mov,.mp4" onChange={e=>setVideo(e.target.files?.[0]??null)} /></label>
      <label><span className="label">Six phase PNGs</span><input className="input" type="file" accept=".png" multiple onChange={e=>setImages(Array.from(e.target.files??[]))} /></label>
      <label><span className="label">Reviewed evidence JSON</span><input className="input" type="file" accept=".json" onChange={e=>setRecord(e.target.files?.[0]??null)} /></label>
    </fieldset>
    <button type="button" className="btn-secondary" onClick={run} disabled={busy||!video||!images.length||!record}>
      {busy?'Importing…':attempt.current?'Retry import':'Import private draft'}
    </button>
    {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
  </details>
}

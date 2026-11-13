'use client'

import { useEffect, useState } from 'react'
import type { CoachingFollowupSource } from '@/lib/coaching-followup'
import { assessmentStages, handoffStatus, workflowStatusLabel, type AssessmentStage } from '@/lib/assessment-workflow-progress'
import { FollowupReviewedSource } from './FollowupReviewedSource'

export type FollowupStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'permission_required'
type FollowupDraft = {
  analysis_id: string
  source_revision: string
  status: FollowupStatus
  body: string | null
  updated_at: string
  source: CoachingFollowupSource
  pipeline_stage?: AssessmentStage | null
}
type Result = { draft?: FollowupDraft | null; error?: string }
const endpoint = '/api/admin/assessment-followup'

export function AssessmentFollowupEditor({ analysisId, hasFindings }: { analysisId: string; hasFindings: boolean }) {
  const [draft, setDraft] = useState<FollowupDraft | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [stalled, setStalled] = useState(false)

  // Refresh only while waiting for generation. Editing a finished draft never polls.
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let polls = 0
    setLoading(true)
    setStalled(false)
    async function loadDraft() {
      try {
        const response = await fetch(endpoint + '?analysisId=' + encodeURIComponent(analysisId), {
          cache: 'no-store', signal: controller.signal,
        })
        const result: Result = await response.json()
        if (controller.signal.aborted) return
        if (!response.ok) throw new Error(result.error || 'Could not load this draft.')
        const current = result.draft ?? null
        setDraft(current)
        setBody(current?.body ?? '')
        setLoaded(true)
        setError('')
        setConflict(false)
        if (current?.status === 'pending' || current?.status === 'generating') {
          if (++polls <= 75) timer = setTimeout(loadDraft, 4000)
          else {
            setStalled(true)
            setMessage('The draft is still in progress. Check its status or retry generation.')
          }
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load this draft.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadDraft()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [analysisId, reload])

  const dirty = draft?.status === 'ready' && body !== (draft.body ?? '')
  useEffect(() => {
    if (!dirty) return
    function warnOnExit(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = '' }
    function confirmLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return
      const destination = new URL(link.href)
      if (destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return
      if (!window.confirm('Leave this assessment and discard your unsaved draft edits?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', warnOnExit)
    document.addEventListener('click', confirmLink, true)
    return () => {
      window.removeEventListener('beforeunload', warnOnExit)
      document.removeEventListener('click', confirmLink, true)
    }
  }, [dirty])

  async function write(saveChanges: boolean) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const payload = saveChanges && draft
        ? { analysisId, sourceRevision: draft.source_revision, revision: draft.updated_at, body }
        : { analysisId }
      const response = await fetch(endpoint, {
        method: saveChanges ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result: Result = await response.json()
      if (!response.ok) {
        if (saveChanges && response.status === 409) setConflict(true)
        throw new Error(result.error || 'Could not update this draft.')
      }
      const current = result.draft ?? null
      setDraft(current)
      setBody(current?.body ?? '')
      if (saveChanges) setMessage('Changes saved.')
      if (current?.status === 'pending' || current?.status === 'generating') setReload(value => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this draft.')
    } finally { setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(body); setMessage('Draft copied.') }
    catch { setMessage('Select the text in the draft and copy it.') }
  }
  function refresh() { setMessage(''); setReload(value => value + 1) }
  const waiting = draft?.status === 'pending' || draft?.status === 'generating'
  return <section className="card space-y-4">
    <div>
      <h2 className="text-xl font-bold text-white">{draft?.pipeline_stage ? 'Assessment and training plan' : 'Coaching follow-up'}</h2>
      <p className="mt-1 text-sm text-slate-400" role="status">
        {loading ? 'Loading draft…' : draft ? workflowStatusLabel(draft.status, draft.pipeline_stage) : loaded ? 'No draft yet' : ''}
      </p>
    </div>
    {draft?.pipeline_stage && <ol aria-label="Specialist handoffs" className="grid gap-2 sm:grid-cols-3">
      {assessmentStages.map(stage => <li key={stage.id}
        className="rounded-lg border border-surface-border px-3 py-2 text-sm">
        <strong className="block text-slate-100">{stage.name}</strong>
        <span className="text-slate-300">{handoffStatus(stage.id, draft.pipeline_stage!, draft.status)}</span>
      </li>)}
    </ol>}
    {draft?.source && <FollowupReviewedSource source={draft.source} revision={draft.source_revision}/>}
    {draft?.status === 'ready' && <>
      <label className="block"><span className="label">{draft.pipeline_stage ? 'Athlete follow-up and tailored training plan' : 'Athlete-facing draft'}</span>
        <textarea className="input min-h-64" rows={11} value={body} disabled={busy || loading}
          onChange={event => { setBody(event.target.value); setMessage('') }} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={!dirty || !body.trim() || busy || loading || conflict}
          onClick={() => void write(true)}>{busy ? 'Saving…' : 'Save changes'}</button>
        <button type="button" className="btn-secondary" disabled={!body.trim()} onClick={() => void copy()}>Copy draft</button>
      </div>
    </>}
    {draft?.status === 'permission_required' && <p className="text-sm text-slate-300">This athlete needs to allow AI follow-ups in their intake permissions. After the permission changes, retry generation.</p>}
    {!draft && loaded && !loading && <p className="text-sm text-slate-300">{hasFindings
      ? 'You can generate a follow-up for this previously reviewed assessment.'
      : 'This assessment has no saved coaching notes or findings to use for a follow-up.'}</p>}
    {draft?.status === 'failed' && <p className="text-sm text-slate-300">The assessment is saved. Retry to generate its follow-up.</p>}
    {loaded && !loading && ((!draft && hasFindings) || draft?.status === 'failed' || draft?.status === 'permission_required' || (waiting && stalled)) && <button type="button"
      className="btn-secondary" disabled={busy} onClick={() => void write(false)}>{busy ? 'Requesting draft…' : draft ? 'Retry generation' : 'Generate follow-up'}</button>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {conflict && <p className="text-sm text-slate-300">Your edits are still in the box. Copy them before loading the latest version.</p>}
    {!loading && !busy && (conflict || waiting || (error && !dirty)) && <button type="button" className="btn-secondary" onClick={refresh}>
      {conflict ? 'Load latest version' : 'Refresh status'}</button>}
    {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
  </section>
}

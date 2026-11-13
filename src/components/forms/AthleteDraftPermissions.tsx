'use client'

import { useEffect, useState } from 'react'
import { AI_DRAFT_PERMISSION_TEXT, AI_DRAFT_PERMISSION_VERSION } from '@/lib/ai-draft-permission'
import { createClient } from '@/lib/supabase/client'

type Choice = {
  id: string
  athlete_full_name: string
  consent_ai_draft: boolean
  ai_draft_permission_version: number
  updated_at: string
}
const columns = 'id,athlete_full_name,consent_ai_draft,ai_draft_permission_version,updated_at'
const optedIn = (row: Choice) => row.consent_ai_draft && row.ai_draft_permission_version === AI_DRAFT_PERMISSION_VERSION

export function AthleteDraftPermissions({ userId }: { userId: string }) {
  const [client] = useState(createClient)
  const [athletes, setAthletes] = useState<Choice[]>([])
  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    if (userId) {
      void (async () => {
        const { data, error } = await client.from('athlete_profiles').select(columns)
          .eq('user_id', userId).order('athlete_full_name').order('id')
        if (!active) return
        if (error) { setNotice('Could not load athlete AI permissions. Reload Profile Settings or contact support.'); return }
        setAthletes(data ?? [])
        setSelection(Object.fromEntries((data ?? []).map(row => [row.id, optedIn(row)])))
      })()
    }
    return () => { active = false }
  }, [client, userId])

  async function save(row: Choice) {
    const grant = selection[row.id] === true
    setBusy(row.id)
    setNotice('')
    try {
      const {data, error} = await client.from('athlete_profiles')
        .update({consent_ai_draft: grant, ai_draft_permission_version: grant ? AI_DRAFT_PERMISSION_VERSION : 0})
        .eq('id', row.id).eq('user_id', userId).eq('updated_at', row.updated_at).select(columns).maybeSingle()
      if (error || !data || optedIn(data) !== grant) {
        setNotice('Could not save this choice. Reload Profile Settings and check that the required athlete and guardian intake agreements are complete.')
        return
      }
      setAthletes(existing => existing.map(item => item.id === row.id ? data : item))
      setNotice('Saved AI permission for ' + row.athlete_full_name + '.')
    } catch {
      setNotice('Could not reach PitchNav. Please try saving again.')
    } finally {
      setBusy(null)
    }
  }

  if (!athletes.length && !notice) return null
  return <section className="card space-y-4" aria-label="AI drafting permissions">
    <h2 className="text-lg font-semibold text-white">AI drafting permissions</h2>
    <p className="text-sm text-slate-300">{AI_DRAFT_PERMISSION_TEXT}</p>
    <p className="text-sm text-slate-400">A guardian chooses for an athlete aged 13–17. You can withdraw permission here for future drafts. Staff review is available either way.</p>
    {athletes.map(row => {
      const earlier = row.consent_ai_draft && !optedIn(row)
      return <div key={row.id} className="space-y-2 rounded-lg border border-surface-border p-3">
        <label className="flex items-start gap-2 text-white"><input type="checkbox" className="mt-1 accent-electric-blue"
          disabled={busy !== null} checked={selection[row.id] === true}
          onChange={e => { setSelection({...selection, [row.id]:e.target.checked}); setNotice('') }} />
          Allow AI drafting for {row.athlete_full_name}
        </label>
        {earlier && <p className="text-sm text-slate-400">This athlete has an earlier permission for mechanics drafting. Select the box to include coaching follow-ups, or save it unchecked to withdraw.</p>}
        <button type="button" className="btn-secondary" disabled={busy !== null || (!earlier && selection[row.id] === optedIn(row))}
          onClick={() => void save(row)}>Save choice for {row.athlete_full_name}</button>
      </div>
    })}
    {notice && <p role="status" className="text-sm text-slate-300">{notice}</p>}
  </section>
}

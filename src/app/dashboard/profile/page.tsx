'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { missingDatabaseFunction } from '@/lib/athlete-eligibility'
import { createClient } from '@/lib/supabase/client'

type Scope = 'videos' | 'all'

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [canSaveReminder, setCanSaveReminder] = useState(false)
  const [reminders, setReminders] = useState(false)
  const [pending, setPending] = useState<Scope[]>([])
  const [confirm, setConfirm] = useState<Scope | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error()
      const [profile, requests, preference] = await Promise.all([
        supabase.from('profiles').select('full_name,email').eq('id', user.id).single(),
        supabase.from('deletion_requests').select('request_type').eq('user_id', user.id).is('processed_at', null),
        supabase.from('profiles').select('retest_email_opt_in').eq('id', user.id).single(),
      ])
      if (profile.error || requests.error) throw new Error()
      setFullName(profile.data.full_name ?? '')
      setEmail(profile.data.email)
      setCanSaveReminder(!preference.error)
      setReminders(preference.data?.retest_email_opt_in === true)
      setPending(requests.data.map(item => item.request_type))
      setUserId(user.id)
    }
    void load().catch(() => setError('Could not load profile settings. Reload the page or contact support.'))
  }, [supabase])

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error } = await supabase.from('profiles')
        .update({ full_name: fullName.trim(), ...(canSaveReminder ? { retest_email_opt_in: reminders } : {}) }).eq('id', userId).select('id').single()
      if (error) throw error
      setNotice('Changes saved.')
    } catch {
      setError('Could not save these changes. Please try again.')
    } finally { setBusy(false) }
  }

  async function requestDeletion(scope: Scope) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error } = await supabase.rpc('request_account_deletion', { requested_scope: scope })
      if (missingDatabaseFunction(error)) {
        const receipt = await supabase.from('deletion_requests')
          .insert({ user_id: userId, request_type: scope }).select('id').single()
        if (receipt.error || !receipt.data) throw new Error()
      } else if (error) throw error
      setPending(previous => [...previous, scope])
      setConfirm(null)
      setNotice('Your deletion request was recorded for staff review.')
    } catch {
      setError('Could not record the request. Try again or contact support.')
    } finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-2xl space-y-6">
    <h1 className="text-3xl font-black text-white">Profile Settings</h1>
    <form className="card space-y-4" onSubmit={saveProfile}>
      <h2 className="text-lg font-semibold text-white">Account and email preferences</h2>
      <label className="block"><span className="label">Full name</span>
        <input className="input" autoComplete="name" maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} /></label>
      <p className="text-sm text-slate-300">Account email: {email || 'Loading…'}</p>
      {canSaveReminder && <>
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" checked={reminders} onChange={e => setReminders(e.target.checked)} className="mt-1 h-4 w-4 accent-electric-blue" />
        Email me a reminder when my development plan is due for a retest (optional).
      </label>
      <p className="text-sm text-slate-400">Account, billing and report updates relate to your service. Change this checkbox and save to stop future retest reminders.</p>
      </>}
      <button className="btn-primary" disabled={busy || !userId}>Save changes</button>
      <Link href="/forgot-password" className="ml-4 text-sm text-electric-blue-light underline">Reset password</Link>
    </form>

    <section className="card space-y-3">
      <h2 className="text-lg font-semibold text-white">Your data and permissions</h2>
      <p className="text-sm text-slate-300">Request a copy or correction of your information, change a permission, or contact us on behalf of a minor. We may ask for details to verify the request.</p>
      <p><Link href="/contact?topic=privacy" className="text-electric-blue-light underline">Contact privacy support</Link></p>
      <p><Link href="/start-analysis" className="text-electric-blue-light underline">Update athlete or guardian permission for AI coaching drafts and other optional uses</Link></p>
      <p><Link href="/billing" className="text-electric-blue-light underline">Manage or cancel a subscription</Link></p>
    </section>

    <section className="card space-y-4">
      <h2 className="text-lg font-semibold text-white">Request deletion</h2>
      <p className="text-sm text-slate-300">Choose your uploaded videos or your entire account and associated athlete data. Staff reviews the request. To stop recurring charges, use the cancellation link above.</p>
      {pending.includes('all') && <p className="text-accent-green">Account deletion request pending.</p>}
      {pending.includes('videos') && <p className="text-accent-green">Video deletion request pending.</p>}
      {confirm ? <div className="space-y-3" aria-label="Confirm deletion request">
        <p>Send a request to delete {confirm === 'all' ? 'your account and associated data' : 'your uploaded videos'}?</p>
        <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="btn-secondary">Go back</button>
        <button type="button" disabled={busy} onClick={() => void requestDeletion(confirm)} className="btn-primary ml-3">Submit deletion request</button>
      </div> : <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy || !userId || pending.includes('all') || pending.includes('videos')} onClick={() => setConfirm('videos')} className="btn-secondary">Delete my videos</button>
        <button type="button" disabled={busy || !userId || pending.includes('all')} onClick={() => setConfirm('all')} className="btn-secondary">Delete my account</button>
      </div>}
    </section>
    <p role="status" className="text-accent-green">{notice}</p>
    {error && <p role="alert" className="text-red-300">{error} <Link href="/contact?topic=privacy" className="underline">Contact support</Link></p>}
  </div>
}

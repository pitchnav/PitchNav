'use client'

import { useState } from 'react'
import { Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

import { type Billing, type ProgramPlan } from '@/lib/pricing-catalog'

export function TeamPricingForm() {
  const [players, setPlayers] = useState('20')
  const [plan, setPlan] = useState<ProgramPlan>('complete')
  const [billing, setBilling] = useState<Billing>('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/team-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          organization: String(data.get('organization') ?? ''),
          role: String(data.get('role') ?? ''),
          pitcherCount: players,
          programPlan: plan,
          billing,
          email: String(data.get('email') ?? ''),
          // Honeypot: bots fill the hidden field, people leave it blank.
          website: String(data.get('website') ?? ''),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not send that request.')
      setSent(true)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that request.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-accent-green/25 bg-accent-green/5 p-6 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-accent-green" />
        <h3 className="mt-3 text-lg font-bold text-white">Request received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          We&apos;ll follow up with your selected plan, player count and pricing. No payment has been taken.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label><span className="label">Program</span><select className="input mt-1" value={plan} onChange={e=>setPlan(e.target.value as ProgramPlan)}><option value="metrics">Pitch Tracking</option><option value="complete">Complete Development</option></select></label>
      <label><span className="label">Number of players</span><input required className="input mt-1" type="number" min={1} max={500} step={1} value={players} onChange={e=>setPlayers(e.target.value)} /></label>
      <label className="sm:col-span-2"><span className="label">Preferred billing</span><select className="input mt-1" value={billing} onChange={e=>setBilling(e.target.value as Billing)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
      <label className="sm:col-span-1">
        <span className="label">Your name</span>
        <input name="name" required maxLength={120} className="input mt-1" autoComplete="name" />
      </label>

      <label className="sm:col-span-1">
        <span className="label">Organization</span>
        <input
          name="organization"
          required
          maxLength={160}
          className="input mt-1"
          placeholder="School, club, or facility"
        />
      </label>

      <label className="sm:col-span-1">
        <span className="label">Your role</span>
        <input
          name="role"
          required
          maxLength={120}
          className="input mt-1"
          placeholder="Head coach, pitching coach, director…"
        />
      </label>

      <label className="sm:col-span-2">
        <span className="label">Email</span>
        <input name="email" required type="email" maxLength={200} className="input mt-1" autoComplete="email" />
      </label>

      {/* Honeypot — visually hidden, not display:none, so bots still fill it */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-4 disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
          Request program enrollment
        </button>
      </div>
    </form>
  )
}

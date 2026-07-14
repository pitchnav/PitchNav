'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Info } from 'lucide-react'

interface Setting {
  key: string
  value: string
  description: string | null
}

const SETTING_DESCRIPTIONS: Record<string, { label: string; description: string; type?: string }> = {
  business_name:          { label: 'Business Name', description: 'Displayed in emails and the site header.' },
  contact_email:          { label: 'Support Email', description: 'Used in contact page and outbound emails.' },
  from_email_name:        { label: 'From Name (Emails)', description: 'The "from" name for Resend emails.' },
  delivery_estimate_text: { label: 'Delivery Estimate Wording', description: 'Shown on order detail pages. E.g. "Estimated delivery: 5–7 business days."' },
  max_weekly_orders:      { label: 'Max Weekly Orders', description: 'Leave blank to disable the cap.', type: 'number' },
  video_retention_days:   { label: 'Video Retention (Days)', description: 'How long uploaded videos are kept after analysis completion.', type: 'number' },
  follow_up_price_cents:  { label: 'Follow-Up Price (cents)', description: 'E.g. 2500 = $25.00.', type: 'number' },
  instagram_url:          { label: 'Instagram URL', description: 'Full URL including https://.' },
  twitter_url:            { label: 'Twitter / X URL', description: 'Full URL including https://.' },
  youtube_url:            { label: 'YouTube URL', description: 'Full URL including https://.' },
  analysis_available:     { label: 'Analysis Available', description: 'Set to "true" to accept new orders, "false" to pause.', type: 'boolean' },
}

export default function AdminSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [settings, setSettings] = useState<Setting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('admin_settings').select('*').order('key')
      const list = (data as Setting[]) ?? []
      setSettings(list)
      const vals: Record<string, string> = {}
      for (const s of list) vals[s.key] = s.value ?? ''
      setValues(vals)
    }
    load()
  }, [])

  async function saveAll() {
    setSaving(true)
    for (const [key, value] of Object.entries(values)) {
      await supabase
        .from('admin_settings')
        .upsert({ key, value }, { onConflict: 'key' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  // Group into known and unknown (custom/extra)
  const knownKeys = Object.keys(SETTING_DESCRIPTIONS)
  const knownSettings = knownKeys.filter((k) => k in values || settings.some((s) => s.key === k))
  const unknownSettings = settings.filter((s) => !knownKeys.includes(s.key))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-white">Settings</h1>
        <button onClick={saveAll} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      <div className="space-y-4">
        {knownSettings.map((key) => {
          const meta = SETTING_DESCRIPTIONS[key]
          return (
            <div key={key} className="card">
              <label className="label mb-1">{meta.label}</label>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                <Info className="h-3.5 w-3.5 flex-shrink-0" /> {meta.description}
              </p>
              {meta.type === 'boolean' ? (
                <select
                  value={values[key] ?? 'true'}
                  onChange={(e) => set(key, e.target.value)}
                  className="input"
                >
                  <option value="true">true — accepting orders</option>
                  <option value="false">false — paused</option>
                </select>
              ) : (
                <input
                  type={meta.type ?? 'text'}
                  value={values[key] ?? ''}
                  onChange={(e) => set(key, e.target.value)}
                  className="input"
                  placeholder={`${meta.label}…`}
                />
              )}
            </div>
          )
        })}

        {unknownSettings.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-6">Custom Keys</h2>
            {unknownSettings.map((s) => (
              <div key={s.key} className="card">
                <label className="label mb-1 font-mono">{s.key}</label>
                {s.description && <p className="text-xs text-slate-500 mb-3">{s.description}</p>}
                <input
                  type="text"
                  value={values[s.key] ?? ''}
                  onChange={(e) => set(s.key, e.target.value)}
                  className="input"
                />
              </div>
            ))}
          </>
        )}
      </div>

      <p className="text-xs text-slate-600 mt-8">
        Stripe product and price IDs are configured via environment variables (
        <code className="font-mono text-slate-500">STRIPE_PRODUCT_ID</code>,{' '}
        <code className="font-mono text-slate-500">STRIPE_PRICE_ID</code>). Update{' '}
        <code className="font-mono text-slate-500">.env.local</code> and redeploy to change them.
      </p>
    </div>
  )
}

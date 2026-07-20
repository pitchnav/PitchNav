'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { DRILL_CATEGORY_LABELS } from '@/lib/utils'
import type { Drill, DrillCategory } from '@/types/database'

const CATEGORIES = Object.entries(DRILL_CATEGORY_LABELS) as [DrillCategory, string][]

const EMPTY_DRILL: Partial<Drill> = {
  name: '',
  category: 'direction',
  description: '',
  what_it_trains: '',
  coaching_cues: [],
  common_mistakes: [],
  reps: '',
  sets: null,
  demo_video_url: '',
  contraindications: '',
  is_active: true,
  is_demo: false,
}

export default function AdminDrillsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [drills, setDrills] = useState<Drill[]>([])
  const [editing, setEditing] = useState<Drill | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<Partial<Drill>>(EMPTY_DRILL)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('drills').select('*').order('name')
    setDrills((data as Drill[]) ?? [])
  }

  useEffect(() => { load() }, [])

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setFormData(EMPTY_DRILL)
  }

  function startEdit(drill: Drill) {
    setEditing(drill)
    setCreating(false)
    setFormData(drill)
  }

  function cancel() {
    setCreating(false)
    setEditing(null)
    setFormData(EMPTY_DRILL)
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...formData,
      coaching_cues: typeof formData.coaching_cues === 'string'
        ? (formData.coaching_cues as string).split('\n').map((s) => s.trim()).filter(Boolean)
        : formData.coaching_cues,
      common_mistakes: typeof formData.common_mistakes === 'string'
        ? (formData.common_mistakes as string).split('\n').map((s) => s.trim()).filter(Boolean)
        : formData.common_mistakes,
    }
    if (creating) {
      await supabase.from('drills').insert(payload)
    } else if (editing) {
      await supabase.from('drills').update(payload).eq('id', editing.id)
    }
    setSaving(false)
    cancel()
    await load()
  }

  async function deleteDrill(id: string) {
    if (!confirm('Delete this drill? This will also remove it from all assigned orders.')) return
    await supabase.from('drills').delete().eq('id', id)
    await load()
  }

  async function toggleActive(drill: Drill) {
    await supabase.from('drills').update({ is_active: !drill.is_active }).eq('id', drill.id)
    await load()
  }

  const formFields: Array<{ key: keyof Drill; label: string; type?: string; rows?: number }> = [
    { key: 'name', label: 'Drill Name', type: 'text' },
    { key: 'description', label: 'Description', rows: 2 },
    { key: 'what_it_trains', label: 'What It Trains', rows: 2 },
    { key: 'coaching_cues', label: 'Coaching Cues (one per line)', rows: 3 },
    { key: 'common_mistakes', label: 'Common Mistakes (one per line)', rows: 3 },
    { key: 'contraindications', label: 'Contraindications / Cautions', rows: 2 },
    { key: 'reps', label: 'Reps', type: 'text' },
    { key: 'demo_video_url', label: 'Demo Video URL (optional)', type: 'url' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-white">Drill Library</h1>
        {!creating && !editing && (
          <button onClick={startCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> New Drill
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">
            {creating ? 'Create New Drill' : `Edit: ${editing?.name}`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formFields.map(({ key, label, type, rows }) => (
              <div key={key as string} className={rows && rows > 2 ? 'sm:col-span-2' : ''}>
                <label className="label">{label}</label>
                {rows ? (
                  <textarea
                    value={
                      Array.isArray(formData[key])
                        ? (formData[key] as string[]).join('\n')
                        : (formData[key] as string) ?? ''
                    }
                    onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))}
                    rows={rows}
                    className="input"
                  />
                ) : (
                  <input
                    type={type ?? 'text'}
                    value={(formData[key] as string) ?? ''}
                    onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))}
                    className="input"
                  />
                )}
              </div>
            ))}

            <div>
              <label className="label">Category</label>
              <select
                value={formData.category ?? 'direction'}
                onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value as DrillCategory }))}
                className="input"
              >
                {CATEGORIES.map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData((f) => ({ ...f, is_active: e.target.checked }))}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${formData.is_active ? 'bg-electric-blue' : 'bg-surface-border'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.is_active ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="btn-primary">
              <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Drill'}
            </button>
            <button onClick={cancel} className="btn-secondary">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drill list */}
      <div className="space-y-3">
        {drills.map((drill) => (
          <div
            key={drill.id}
            className={`card ${!drill.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-white truncate">{drill.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-electric-blue/10 text-electric-blue-light">
                    {DRILL_CATEGORY_LABELS[drill.category as DrillCategory]}
                  </span>
                  {drill.is_demo && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">Demo</span>
                  )}
                  {!drill.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400">Inactive</span>
                  )}
                </div>
                {drill.description && (
                  <p className="text-sm text-slate-400 line-clamp-2">{drill.description}</p>
                )}
                {drill.reps && (
                  <p className="text-xs text-slate-500 mt-1">{drill.reps}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(drill)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  title={drill.is_active ? 'Deactivate' : 'Activate'}
                >
                  {drill.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => startEdit(drill)}
                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {!drill.is_demo && (
                  <button
                    onClick={() => deleteDrill(drill.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {drills.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-slate-500">No drills in library. Add one above.</p>
          </div>
        )}
      </div>
    </div>
  )
}

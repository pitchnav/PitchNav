'use client'

import { useState, useEffect, useMemo } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ full_name: string | null; email: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deletionRequested, setDeletionRequested] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteType, setDeleteType] = useState<'videos' | 'all' | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
      }
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function requestDeletion(type: 'videos' | 'all') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('deletion_requests').insert({
      user_id: user.id,
      request_type: type,
      notes: `Requested from profile settings page`,
    })
    setDeletionRequested(true)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">Profile Settings</h1>

      {/* Account info */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="label">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={profile?.email ?? ''} disabled className="input opacity-50 cursor-not-allowed" />
            <p className="text-xs text-slate-500 mt-1">Contact support to change your email address.</p>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary"
          >
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Password</h2>
        <p className="text-sm text-slate-400 mb-4">
          To reset your password, click the button below. A reset link will be sent to your email.
        </p>
        <a href="/forgot-password" className="btn-secondary text-sm">
          Reset Password
        </a>
      </div>

      {/* Marketing preferences */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Communication Preferences</h2>
        <p className="text-sm text-slate-400">
          Pitch Nav sends transactional emails only (order confirmation, status updates, analysis complete).
          We do not send marketing emails without your explicit consent.
        </p>
      </div>

      {/* Data & deletion */}
      <div className="card border-red-500/20">
        <div className="flex items-start gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Data & Account Deletion</h2>
            <p className="text-sm text-slate-400">
              You can request deletion of your uploaded videos or your entire account.
              Deletions are processed within 30 days. Completed analysis reports may be retained
              per our data retention policy.
            </p>
          </div>
        </div>

        {deletionRequested ? (
          <div className="rounded-lg bg-accent-green/10 border border-accent-green/20 p-4">
            <p className="text-sm text-accent-green font-semibold">Deletion request received.</p>
            <p className="text-xs text-slate-400 mt-1">
              You'll receive a confirmation email. Our team will process your request within 30 days.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setDeleteType('videos'); setShowDeleteConfirm(true) }}
              className="btn-secondary text-sm border-red-500/30 text-red-400 hover:border-red-500 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" /> Delete My Videos
            </button>
            <button
              onClick={() => { setDeleteType('all'); setShowDeleteConfirm(true) }}
              className="btn-secondary text-sm border-red-500/30 text-red-400 hover:border-red-500 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" /> Delete My Account
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-3">Confirm Deletion Request</h3>
            <p className="text-sm text-slate-400 mb-6">
              {deleteType === 'all'
                ? 'This will request deletion of your account and all associated data, including videos and reports.'
                : 'This will request deletion of your uploaded pitching videos.'}
              {' '}This action cannot be undone once processed.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-500 text-white font-semibold py-2 px-4 hover:bg-red-600 transition-colors"
                onClick={() => deleteType && requestDeletion(deleteType)}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

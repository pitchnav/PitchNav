import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { formatDateShort, PLAYING_LEVEL_LABELS } from '@/lib/utils'
import type { PlayingLevel } from '@/types/database'

interface SearchParams { filter?: string; q?: string }

export default async function AdminAthletesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { filter, q } = await searchParams
  const supabase = await createClient()

  // Requests include accounts that never completed athlete intake.
  let profilesQuery = supabase
    .from('athlete_profiles')
    .select('id,user_id,athlete_full_name,playing_level,throwing_hand,current_avg_velocity,health_flagged,profiles(email,full_name)')
    .order('created_at', { ascending: false })

  if (filter === 'health_flagged') {
    profilesQuery = profilesQuery.eq('health_flagged', true)
  }

  const { data: athletes, error: athletesError } = await profilesQuery

  if (athletesError) {
    console.error('[admin/athletes] failed to load athlete profiles', athletesError)
  }

  const { data: deletionRequests, error: deletionRequestsError } = await supabase
    .from('deletion_requests')
    .select('id,user_id,request_type,created_at,profiles(email)')
    .is('processed_at', null)
    .order('created_at', { ascending: true })

  const filtered = athletes?.filter((a) => {
    if (!q) return true
    const name = a.athlete_full_name ?? ''
    const account = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
    const email = account?.email ?? ''
    return (
      name.toLowerCase().includes(q.toLowerCase()) ||
      email.toLowerCase().includes(q.toLowerCase())
    )
  }) ?? []

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">Athletes</h1>

      {athletesError && (
        <div className="card mb-6 border-red-500/30 text-red-300">
          Could not load athletes: {athletesError.message}
        </div>
      )}

      <section className="card mb-6 space-y-3">
        <h2 className="font-semibold text-white">Pending deletion requests</h2>
        <p className="text-sm text-slate-300">Verify the requester and complete the deletion across records, stored media and applicable providers before marking it processed. The button records staff completion.</p>
        {deletionRequestsError && <p role="alert">Could not load deletion requests.</p>}
        {deletionRequests?.length === 0 && <p>No requests pending.</p>}
        {deletionRequests?.map(request => {
          const account = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles
          return <div key={request.id} className="rounded-lg border border-slate-700 p-3 text-sm">
            <p className="mb-3">{account?.email || request.user_id} · {request.request_type === 'videos' ? 'Uploaded videos' : 'Account and associated data'} · {formatDateShort(request.created_at)}</p>
            <MarkProcessedButton deletionId={request.id} />
          </div>
        })}
      </section>

      {/* Filters */}
      <div className="card mb-6">
        <form className="flex flex-col sm:flex-row gap-4" method="GET">
          <input
            type="text"
            aria-label="Search athletes by name or email"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="input flex-1"
          />
          <select aria-label="Filter athletes" name="filter" defaultValue={filter ?? ''} className="input sm:w-48">
            <option value="">All Athletes</option>
            <option value="health_flagged">Health Flagged</option>
          </select>
          <button type="submit" className="btn-primary whitespace-nowrap">Filter</button>
        </form>
      </div>

      <p className="text-sm text-slate-500 mb-4">{filtered.length} athlete{filtered.length !== 1 ? 's' : ''}</p>

      <div className="space-y-4">
        {filtered.map((athlete) => {
          const profile = Array.isArray(athlete.profiles) ? athlete.profiles[0] : athlete.profiles
          return (
            <div key={athlete.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">{athlete.athlete_full_name}</h3>
                    {athlete.health_flagged && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">
                        ⚠ Health Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{profile?.email ?? '—'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    {[
                      ['Level', athlete.playing_level ? PLAYING_LEVEL_LABELS[athlete.playing_level as PlayingLevel] : '—'],
                      ['Throws', athlete.throwing_hand ?? '—'],
                      ['Velocity', athlete.current_avg_velocity ? `${athlete.current_avg_velocity} mph` : '—'],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <p className="text-slate-500">{k}</p>
                        <p className="text-white">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-500">No athletes found.</p>
        </div>
      )}
    </div>
  )
}

// Server Action inline component (works in Next.js App Router)
function MarkProcessedButton({ deletionId }: { deletionId: string }) {
  async function markProcessed() {
    'use server'
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error } = await supabase
      .from('deletion_requests')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', deletionId).is('processed_at', null).select('id').single()
    if (error) throw new Error('Could not mark this request as processed.')
    revalidatePath('/admin/athletes')
  }

  return (
    <form action={markProcessed}>
      <button type="submit" className="btn-secondary text-xs border-red-500/30 text-red-400 hover:border-red-500 w-full justify-center">
        Mark as Processed
      </button>
    </form>
  )
}

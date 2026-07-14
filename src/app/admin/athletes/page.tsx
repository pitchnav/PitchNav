import { createClient } from '@/lib/supabase/server'
import { formatDateShort, PLAYING_LEVEL_LABELS } from '@/lib/utils'

interface SearchParams { filter?: string; q?: string }

export default async function AdminAthletesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { filter, q } = await searchParams
  const supabase = await createClient()

  // Load athlete profiles + related deletion requests
  let profilesQuery = supabase
    .from('athlete_profiles')
    .select('*, profiles(email, full_name), deletion_requests(id, request_type, created_at, processed_at)')
    .order('created_at', { ascending: false })

  if (filter === 'health_flagged') {
    profilesQuery = profilesQuery.eq('health_flagged', true)
  }

  const { data: athletes } = await profilesQuery

  const filtered = athletes?.filter((a) => {
    if (!q) return true
    const name = a.athlete_full_name ?? ''
    const email = (a.profiles as { email: string })?.email ?? ''
    return (
      name.toLowerCase().includes(q.toLowerCase()) ||
      email.toLowerCase().includes(q.toLowerCase())
    )
  }) ?? []

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">Athletes</h1>

      {/* Filters */}
      <div className="card mb-6">
        <form className="flex flex-col sm:flex-row gap-4" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="input flex-1"
          />
          <select name="filter" defaultValue={filter ?? ''} className="input sm:w-48">
            <option value="">All Athletes</option>
            <option value="health_flagged">Health Flagged</option>
          </select>
          <button type="submit" className="btn-primary whitespace-nowrap">Filter</button>
        </form>
      </div>

      <p className="text-sm text-slate-500 mb-4">{filtered.length} athlete{filtered.length !== 1 ? 's' : ''}</p>

      <div className="space-y-4">
        {filtered.map((athlete) => {
          const profile = athlete.profiles as { email: string; full_name: string } | null
          const deletions = athlete.deletion_requests as Array<{
            id: string; request_type: string; created_at: string; processed_at: string | null
          }> ?? []
          const pendingDeletion = deletions.find((d) => !d.processed_at)

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
                    {pendingDeletion && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">
                        Deletion Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{profile?.email ?? '—'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    {[
                      ['Level', athlete.playing_level ? PLAYING_LEVEL_LABELS[athlete.playing_level] : '—'],
                      ['Throws', athlete.throwing_hand ?? '—'],
                      ['Velocity', athlete.current_avg_velocity ? `${athlete.current_avg_velocity} mph` : '—'],
                      ['DOB', athlete.date_of_birth ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <p className="text-slate-500">{k}</p>
                        <p className="text-white">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {pendingDeletion && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-4 sm:w-72 flex-shrink-0">
                    <p className="text-sm font-semibold text-red-400 mb-1">Deletion Request</p>
                    <p className="text-xs text-slate-400 mb-3">
                      Type: <strong className="text-slate-300">{pendingDeletion.request_type}</strong><br />
                      Received: {formatDateShort(pendingDeletion.created_at)}
                    </p>
                    <MarkProcessedButton deletionId={pendingDeletion.id} />
                  </div>
                )}
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
    await supabase
      .from('deletion_requests')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', deletionId)
  }

  return (
    <form action={markProcessed}>
      <button type="submit" className="btn-secondary text-xs border-red-500/30 text-red-400 hover:border-red-500 w-full justify-center">
        Mark as Processed
      </button>
    </form>
  )
}

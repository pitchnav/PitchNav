import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MovementScreenStudio } from '@/components/screens/MovementScreenStudio'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Movement Screens',
  description: 'Measure the range of motion behind your delivery so your plan targets a real limitation instead of an estimate.',
}

export default async function MovementScreensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/movement-screens')

  // Previous completed sessions, so the athlete can see change over time.
  // If the movement-screens migration has not been applied yet this simply
  // returns nothing rather than failing the page.
  const { data: previous } = await supabase
    .from('movement_screen_sessions')
    .select('id,completed_at,summary')
    .eq('user_id', user.id)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(5)

  const history = Array.isArray(previous) ? previous : []

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">Pitch Nav movement screens</p>
        <h1 className="mt-1 text-3xl font-black text-white">Measure what is limiting your delivery</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Your pitching video shows <span className="text-white">what</span> breaks down in your delivery. It cannot show
          <span className="text-white"> why</span>. These short screens measure how far you can actually move, so your report
          and your training plan target a limitation we have measured instead of one we guessed at from a 90&nbsp;mph blur.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Each one is a slow, held position filmed from a set angle. That is the situation where measuring from a single
          phone camera is genuinely dependable, which is exactly why the screens are shaped this way.
        </p>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your previous screens</h2>
          <ul className="mt-3 space-y-1">
            {history.map((session) => {
              const summary = session.summary as { limitation_count?: number; asymmetry_count?: number; measured_count?: number } | null
              return (
                <li key={session.id} className="text-sm text-slate-300">
                  {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'Saved'} ·{' '}
                  {summary?.measured_count ?? 0} measured ·{' '}
                  {(summary?.limitation_count ?? 0) + (summary?.asymmetry_count ?? 0)} finding
                  {((summary?.limitation_count ?? 0) + (summary?.asymmetry_count ?? 0)) === 1 ? '' : 's'}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <MovementScreenStudio />
    </div>
  )
}

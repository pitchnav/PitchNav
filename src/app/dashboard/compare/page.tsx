import { redirect } from 'next/navigation'
import { ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProgressComparison } from '@/components/reports/ProgressComparison'
import { calculateDeliveryScore } from '@/lib/utils'

export default async function ComparePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: analyses } = await supabase.from('motion_analyses').select('id,title,source_video_storage_path,delivery_score,velocity_estimate_low,velocity_estimate_high,category_scores,strengths,development_priorities,created_at').eq('user_id', user.id).eq('status', 'published').not('published_at', 'is', null).order('created_at', { ascending: true })
  if (!analyses || analyses.length < 2) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="card py-16 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-electric-blue-light" />
          <h1 className="mt-4 text-3xl font-black text-white">Two analyses are needed</h1>
          <p className="mt-2 text-slate-400">Complete a follow-up analysis to unlock side-by-side comparison.</p>
          <Link href="/start-analysis" className="btn-primary mt-6">
            Start Analysis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }
  const first = analyses[0], latest = analyses[analyses.length - 1]
  const signed = async (path: string) => (await supabase.storage.from('pitch-videos').createSignedUrl(path, 3600)).data?.signedUrl ?? ''
  const [firstUrl, latestUrl] = await Promise.all([signed(first.source_video_storage_path), signed(latest.source_video_storage_path)])
  const firstCats = (first.category_scores ?? []) as Array<{ category: string; score: number }>
  const latestCats = (latest.category_scores ?? []) as Array<{ category: string; score: number }>
  const firstScore = calculateDeliveryScore(firstCats, first.delivery_score)
  const latestScore = calculateDeliveryScore(latestCats, latest.delivery_score)

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-electric-blue-light">Progress comparison</p>
        <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">First analysis vs. latest</h1>
      </div>
      <section className="card"><ProgressComparison firstUrl={firstUrl} latestUrl={latestUrl} /></section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs text-slate-500">Delivery score change</p>
          <p className="mt-2 text-3xl font-black text-white">{firstScore ?? '—'} → {latestScore ?? '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Video velocity history</p>
          <p className="mt-2 text-2xl font-black text-white">
            {first.velocity_estimate_low ? `${Math.round(first.velocity_estimate_low)}–${Math.round(first.velocity_estimate_high)} mph` : '—'} →{' '}
            {latest.velocity_estimate_low ? `${Math.round(latest.velocity_estimate_low)}–${Math.round(latest.velocity_estimate_high)} mph` : '—'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Analyses compared</p>
          <p className="mt-2 text-3xl font-black text-white">{analyses.length}</p>
        </div>
      </section>
      <section className="card">
        <h2 className="text-2xl font-black text-white">Score changes</h2>
        <div className="mt-5 space-y-3">
          {latestCats.map((item) => {
            const before = firstCats.find((cat) => cat.category === item.category)?.score
            return (
              <div key={item.category} className="flex items-center justify-between rounded-lg bg-navy-950 p-3">
                <span className="text-sm text-slate-300">{item.category}</span>
                <span className="font-bold text-white">{before ?? '—'} → {item.score}/5</span>
              </div>
            )
          })}
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-accent-green">What improved</h2>
          <p className="mt-3 text-sm text-slate-300">{latest.strengths?.[0] ?? 'Coach summary pending.'}</p>
        </div>
        <div className="card">
          <h2 className="font-bold text-yellow-300">What still needs work</h2>
          <p className="mt-3 text-sm text-slate-300">{latest.development_priorities?.[0] ?? 'Coach summary pending.'}</p>
        </div>
      </section>
    </div>
  )
}

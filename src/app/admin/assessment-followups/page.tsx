import { scheduleAssessmentFollowupRecovery } from '@/lib/assessment-followup-jobs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssessmentFollowupEditor } from '@/components/admin/AssessmentFollowupEditor'
import { FollowupVoiceEditor } from '@/components/admin/FollowupVoiceEditor'
import { readFollowUpVoiceSettings } from '@/lib/followup-voice-settings'

const batch = 25
export const maxDuration = 120

const fields = 'id,title,order_id,reviewed_at,published_at,updated_at,ai_draft_status,status,athlete_profiles(athlete_full_name)'
const statuses = {
  pending: 'Queued', generating: 'Writing draft', ready: 'Ready for review',
  failed: 'Generation failed', permission_required: 'Permission needed',
}
type Source = {
  id: string; title: string | null; order_id: string | null; reviewed_at: string; published_at: string | null;
  athlete_profiles: { athlete_full_name?: string } | { athlete_full_name?: string }[] | null
}
function name(source: Source) {
  const athlete = Array.isArray(source.athlete_profiles) ? source.athlete_profiles[0] : source.athlete_profiles
  return athlete?.athlete_full_name || source.title || 'Pitching assessment'
}

export default async function FollowupsPage({ searchParams }: { searchParams: Promise<{ analysisId?: string; page?: string }> }) {
  const { analysisId, page } = await searchParams
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin/assessment-followups')
  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) redirect('/dashboard')

  const requestedPage = Number(page ?? 1)
  const index = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage < 100000 ? requestedPage : 1
  // All selected rows have a human approval. The same filters apply to deep links.
  function approved(columns: string) {
    return db.from('motion_analyses').select(columns).not('reviewed_at','is',null)
      .not('reviewed_by','is',null).or('ai_draft_status.eq.staff_verified,and(status.eq.published,published_at.not.is.null)')
  }
  scheduleAssessmentFollowupRecovery()
  const [reviews, selected, style] = await Promise.all([
    approved(fields).order('reviewed_at',{ascending:false}).order('id')
      .range((index-1)*batch, index*batch),
    analysisId ? approved(fields+',biggest_opportunity,coach_feedback,strengths,development_priorities').eq('id',analysisId).maybeSingle() : null,
    readFollowUpVoiceSettings(db),
  ])
  const rows = (reviews.data ?? []) as unknown as Source[]
  const hasNext = rows.length > batch
  const shown = rows.slice(0,batch)
  const report = selected?.data as unknown as (Source & {
    biggest_opportunity?: { findings?: unknown[]; standalone_foot_strike?: unknown }
    coach_feedback?: string; strengths?: string[]; development_priorities?: string[]
  }) | null
  const statusesById = new Map<string, string>()
  let queueError = false
  if (shown.length) {
    const childTable = 'assessment_followup_drafts'
    const { data, error } = await db.from('motion_analyses')
      .select('id,assessment_followup_drafts(status,source_revision)').in('id',shown.map(source => source.id))
      .order('source_revision',{referencedTable:childTable,ascending:false}).limit(1,{referencedTable:childTable})
    queueError = Boolean(error)
    for (const row of data ?? []) {
      const latest = row.assessment_followup_drafts[0]
      if (latest) statusesById.set(row.id, statuses[latest.status as keyof typeof statuses] ?? 'Check status')
    }
  }
  const findings = Array.isArray(report?.biggest_opportunity?.findings) ? report.biggest_opportunity.findings :
    report?.biggest_opportunity?.standalone_foot_strike ? [report.biggest_opportunity.standalone_foot_strike] : []
  const hasReviewedMaterial = Boolean(report?.order_id || findings.length || report?.coach_feedback?.trim() ||
    report?.strengths?.some(note => note.trim()) || report?.development_priorities?.some(note => note.trim()))
  const queueLink = '/admin/assessment-followups?page='+index
  return <div className="mx-auto max-w-5xl space-y-6">
    <div>
      <h1 className="text-3xl font-black text-white">Assessment follow-ups</h1>
      <p className="mt-2 text-slate-400">Review the coaching draft for a staff-approved assessment. Saving a follow-up keeps it in the staff workspace.</p>
    </div>
    {analysisId && (report ? <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{name(report)}</h2>
        <Link href={report.order_id ? '/admin/orders/'+report.order_id+'?tab=report' : '/admin/motion-lab#'+report.id}
          className="text-sm text-electric-blue-light underline">Open assessment</Link>
      </div>
      <AssessmentFollowupEditor key={report.id} analysisId={report.id} hasFindings={hasReviewedMaterial}/>
    </> : <p role="alert" className="card text-slate-300">{selected?.error ? 'Could not load the selected assessment.' : 'This assessment is unavailable or is awaiting staff approval.'}</p>)}
    <section className="card space-y-3" aria-label="Reviewed assessments">
      <h2 className="text-xl font-bold text-white">Reviewed assessments</h2>
      {reviews.error ? <p role="alert">Could not load the reviewed assessments.</p> : !shown.length ? <p className="text-slate-300">
        {index === 1 ? 'After staff apply a reviewed assessment, its follow-up appears here.' : 'There are no assessments on this page.'}</p> : <>
        {queueError && <p role="alert" className="text-sm text-yellow-300">Could not load draft statuses. Open an assessment to check its draft.</p>}
        <ul className="divide-y divide-surface-border">
          {shown.map(source => <li key={source.id}><Link href={queueLink+'&analysisId='+source.id} aria-current={source.id === analysisId ? 'page' : undefined}
            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-electric-blue-light">
            <span className="font-semibold">{name(source)} <span className="font-normal text-slate-400">· {new Date(source.reviewed_at).toLocaleDateString('en-US',{timeZone:'UTC'})}</span></span>
            <span className="text-slate-400">{statusesById.get(source.id) ?? (queueError ? 'Status unavailable' : 'No draft yet')}</span>
          </Link></li>)}
        </ul>
      </>}
      {(index > 1 || hasNext) && <div className="flex gap-4 text-sm text-electric-blue-light">
        {index > 1 && <Link href={'?page='+(index-1)}>Previous assessments</Link>}
        {hasNext && <Link href={'?page='+(index+1)}>More assessments</Link>}
      </div>}
    </section>
    <FollowupVoiceEditor initial={style}/>
  </div>
}

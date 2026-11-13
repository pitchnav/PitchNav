import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hasIntakePermission } from '@/lib/athlete-eligibility'
import { evidenceFiles, parsePracticeEvidence } from '@/lib/practice-evidence'

const requestSchema = z.object({
  orderId:z.string().uuid(), analysisId:z.string().uuid(), extension:z.enum(['mov','mp4']),
  mode:z.enum(['prepare','finish']), evidence:z.unknown(),
}).strict()
const error = (message:string, status:number) => NextResponse.json({error:message}, {status})
export async function POST(request: Request) {
  const db = await createClient()
  const { data:{user} } = await db.auth.getUser()
  if (!user) return error('Sign in to the staff workspace.',401)
  const {data:staff} = await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
  if (!staff?.is_admin) return error('Staff access required.',403)
  const body = requestSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return error('Select a valid order, video, and evidence file.',400)
  const {orderId, analysisId, extension, mode} = body.data
  let evidence
  try { evidence = parsePracticeEvidence(body.data.evidence) }
  catch (reason) { return error(reason instanceof Error ? reason.message : 'Check the evidence file.',400) }
  const {data:order,error:orderError} = await db.from('orders')
    .select('user_id,athlete_profile_id,payment_confirmed_at,refunded_at,status').eq('id',orderId).maybeSingle()
  if (orderError) return error('Could not load the order.',503)
  if (!order || !order.athlete_profile_id || !order.payment_confirmed_at || order.refunded_at || ['complete','refunded','cancelled'].includes(order.status)) {
    return error('Select an open paid order with an athlete profile.',409)
  }
  const {data:athlete,error:athleteError} = await db.from('athlete_profiles')
    .select('user_id,date_of_birth,terms_agreed,privacy_agreed,guardian_consented,guardian_consented_at,guardian_name,guardian_email')
    .eq('id',order.athlete_profile_id).eq('user_id',order.user_id).maybeSingle()
  if (athleteError) return error('Could not check the athlete profile.',503)
  if (!athlete || !hasIntakePermission(athlete)) return error('This order needs the athlete’s completed intake.',409)
  const entries = evidenceFiles(order.user_id,analysisId,extension)
  const lookup = () => db.from('motion_analyses').select('id,user_id,athlete_profile_id,source_video_storage_path').eq('order_id',orderId).maybeSingle()
  const alreadySaved = (row: {id:string;user_id:string;athlete_profile_id:string|null;source_video_storage_path:string|null}) =>
    row.id === analysisId && row.user_id === order.user_id && row.athlete_profile_id === order.athlete_profile_id && row.source_video_storage_path === entries[0].path
  const {data:existing,error:lookupError} = await lookup()
  if (lookupError) return error('Could not check prior assessments.',503)
  if (existing) return alreadySaved(existing) ? NextResponse.json({saved:true,analysisId}) : error('This order already has a different assessment.',409)
  // An ID chosen for a different order must never be used as a staging prefix.
  const {data:reserved,error:idError} = await db.from('motion_analyses').select('id').eq('id',analysisId).maybeSingle()
  if (idError) return error('Could not check the private asset destination.',503)
  if (reserved) return error('This import ID is already in use. Start a new import.',409)
  if (mode === 'prepare') return NextResponse.json({files:entries})
  const verified = await Promise.all(entries.map(file => db.storage.from(file.bucket).info(file.path)))
  if (verified.some(result => result.error || !result.data)) return error('One or more evidence uploads could not be verified. Retry the import.',503)
  const snapshots = evidence.phases.map(row => ({key:row.key,label:row.label,time:row.time,sample_times:row.sample_times,
    columns:row.columns,confidence_note:row.quality_note ?? '',storage_path:entries.find(item => item.name === row.key)!.path,answer:null}))
  const {error:saveError} = await db.from('motion_analyses').insert({
    id:analysisId,order_id:orderId,user_id:order.user_id,athlete_profile_id:order.athlete_profile_id,
    title:evidence.title,source_video_storage_path:entries[0].path,capture_fps:null,phase_snapshots:snapshots,
    status:'coach_review',ai_draft_status:'ready_for_staff_review',clip_summary:{source:'staff_practice_import'},
    coach_feedback:evidence.summary,strengths:evidence.strengths,biggest_opportunity:{findings:evidence.findings},
    development_priorities:evidence.findings.flatMap(row=>row.coaching_action ? [row.coaching_action] : []),
  })
  if (saveError?.code === '23505') {
    const {data:committed,error:readError} = await lookup()
    if (readError) return error('Could not confirm the saved draft. Retry to reload.',503)
    if (!committed || !alreadySaved(committed)) return error('Another assessment was saved first. Reload the order.',409)
  } else if (saveError) return error('Could not save this working draft. Retry the import.',503)
  return NextResponse.json({saved:true,analysisId})
}

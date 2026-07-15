import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MotionAnalysisStudio } from '@/components/analysis/MotionAnalysisStudio'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Staff Motion Lab Processing',
  description: 'Process a submitted side-view pitch and prepare a staff-verifiable report draft.',
}

export default async function AdminOrderMotionLabPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ videoId?: string }>
}) {
  const [{ id: orderId }, { videoId }] = await Promise.all([params, searchParams])
  if (!videoId) notFound()
  const supabase = await createClient()
  const { data: submission } = await supabase
    .from('video_submissions')
    .select('id,order_id,user_id,storage_path,file_name,mime_type,angle,trim_start_secs,trim_end_secs,orders!inner(id,user_id,athlete_profile_id,athlete_profiles(throwing_hand))')
    .eq('id', videoId)
    .eq('order_id', orderId)
    .single()
  if (!submission || submission.angle !== 'open_side') notFound()

  const order = Array.isArray(submission.orders) ? submission.orders[0] : submission.orders
  const athlete = Array.isArray(order?.athlete_profiles) ? order.athlete_profiles[0] : order?.athlete_profiles
  const { data: signed } = await supabase.storage.from('pitch-videos').createSignedUrl(submission.storage_path, 3600)
  if (!signed?.signedUrl) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/orders/${orderId}`} className="text-sm text-slate-400 hover:text-white">← Return to order</Link>
        <h1 className="mt-2 text-3xl font-black text-white">Staff Motion Lab Processing</h1>
        <p className="mt-2 text-slate-400">Analyze the full clip, verify the detected motion, then save it. The score candidates and six phase frames will connect to this order automatically.</p>
      </div>
      <MotionAnalysisStudio initialVideo={{
        signedUrl: signed.signedUrl,
        fileName: submission.file_name,
        mimeType: submission.mime_type || 'video/mp4',
        storagePath: submission.storage_path,
        orderId,
        ownerUserId: order.user_id,
        staffProcessing: true,
        athleteProfileId: order.athlete_profile_id,
        handedness: athlete?.throwing_hand === 'left' ? 'left' : 'right',
        trimStartSecs: submission.trim_start_secs ?? null,
        trimEndSecs: submission.trim_end_secs ?? null,
      }} />
    </div>
  )
}

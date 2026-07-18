import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MotionAnalysisStudio } from '@/components/analysis/MotionAnalysisStudio'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Motion Lab',
  description: 'Create an estimated skeleton overlay and coaching-oriented joint-angle visualization from pitching video.',
}

export default async function MotionLabPage({ searchParams }: { searchParams: Promise<{ videoId?: string; auto?: string }> }) {
  const { videoId, auto } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/motion-lab')

  let initialVideo: {
    signedUrl: string
    fileName: string
    mimeType: string
    storagePath: string
    orderId: string
    athleteProfileId: string | null
    handedness: 'right' | 'left'
    trimStartSecs: number | null
    trimEndSecs: number | null
    captureFps: number | null
    amountPaidCents: number | null
  } | null = null

  if (videoId) {
    const { data: submission } = await supabase
      .from('video_submissions')
      .select('id,order_id,storage_path,file_name,mime_type,frame_rate,trim_start_secs,trim_end_secs,orders!inner(user_id,athlete_profile_id,amount_paid_cents,athlete_profiles(throwing_hand))')
      .eq('id', videoId)
      .eq('orders.user_id', user.id)
      .single()

    if (submission) {
      const { data: signed } = await supabase.storage.from('pitch-videos').createSignedUrl(submission.storage_path, 3600)
      const order = Array.isArray(submission.orders) ? submission.orders[0] : submission.orders
      const athlete = Array.isArray(order?.athlete_profiles) ? order.athlete_profiles[0] : order?.athlete_profiles
      if (signed?.signedUrl) {
        initialVideo = {
          signedUrl: signed.signedUrl,
          fileName: submission.file_name,
          mimeType: submission.mime_type || 'video/mp4',
          storagePath: submission.storage_path,
          orderId: submission.order_id,
          athleteProfileId: order?.athlete_profile_id ?? null,
          handedness: athlete?.throwing_hand === 'left' ? 'left' : 'right',
          trimStartSecs: submission.trim_start_secs ?? null,
          trimEndSecs: submission.trim_end_secs ?? null,
          captureFps: [60, 120, 240].includes(Number(submission.frame_rate)) ? Number(submission.frame_rate) : null,
          amountPaidCents: order?.amount_paid_cents ?? null,
        }
      }
    }
  }

  return <MotionAnalysisStudio initialVideo={initialVideo} autoProcess={auto === '1' && Boolean(initialVideo)} />
}

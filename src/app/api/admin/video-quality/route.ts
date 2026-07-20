import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const reviewSchema = z.object({
  videoId: z.string().uuid(),
  approved: z.boolean(),
  reason: z.string().trim().max(1000).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

    const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid video-review request.' }, { status: 400 })

    const admin = createAdminClient()
    const { videoId, approved, reason } = parsed.data
    const { data: video, error: videoLoadError } = await admin.from('video_submissions')
      .select('id,order_id')
      .eq('id', videoId)
      .single()
    if (videoLoadError || !video) return NextResponse.json({ error: 'Video submission not found.' }, { status: 404 })

    const { data: order, error: orderLoadError } = await admin.from('orders')
      .select('id,user_id,athlete_profile_id,status')
      .eq('id', video.order_id)
      .single()
    if (orderLoadError || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const now = new Date().toISOString()
    const { error: videoError } = await admin.from('video_submissions').update({
      quality_approved: approved,
      quality_rejection_reason: approved ? null : reason || 'A replacement side-view video is required.',
      replacement_requested_at: approved ? null : now,
    }).eq('id', videoId)
    if (videoError) return NextResponse.json({ error: `Could not update the video: ${videoError.message}` }, { status: 500 })

    if (!approved) {
      // Rejected footage never consumes the member's 14-day analysis slot.
      // Keeping the original record preserves an audit trail while the same
      // paid order can accept a replacement immediately.
      const { error: exemptionError } = await admin.from('motion_analyses')
        .update({ cooldown_exempt: true })
        .eq('user_id', order.user_id)
        .eq('athlete_profile_id', order.athlete_profile_id)
        .neq('status', 'published')
      if (exemptionError) return NextResponse.json({ error: `Video was rejected, but the cooldown could not be waived: ${exemptionError.message}` }, { status: 500 })

      const { error: orderError } = await admin.from('orders').update({
        status: 'additional_video_requested',
        delivery_estimate_text: 'Replacement upload available now—no cooldown and no additional charge.',
      }).eq('id', order.id)
      if (orderError) return NextResponse.json({ error: `Video was rejected, but the replacement upload could not be opened: ${orderError.message}` }, { status: 500 })

      await admin.from('order_status_history').insert({
        order_id: order.id,
        old_status: order.status,
        new_status: 'additional_video_requested',
        note: reason || 'Replacement side-view video requested. Two-week cooldown waived.',
        changed_by: user.id,
      })
    } else if (order.status === 'additional_video_requested') {
      await admin.from('orders').update({
        status: 'video_quality_review',
        delivery_estimate_text: 'Replacement received. Staff review will be completed within one business day.',
      }).eq('id', order.id)
      await admin.from('order_status_history').insert({
        order_id: order.id,
        old_status: order.status,
        new_status: 'video_quality_review',
        note: 'Replacement side-view video received for quality review.',
        changed_by: user.id,
      })
    }

    return NextResponse.json({
      ok: true,
      replacementAllowedNow: !approved,
      message: approved
        ? 'Video approved.'
        : 'Video rejected. The athlete can upload a replacement immediately without using another analysis slot.',
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not review this video.' }, { status: 500 })
  }
}

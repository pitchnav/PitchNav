import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const schema = z.object({ orderId: z.string().uuid() })

// Lets staff replay an order's whole video → analysis → report cycle
// without repeating a fake payment or creating a new account. Wipes the
// videos, motion analysis, and report tied to this order and puts it back
// to "awaiting videos", while deliberately KEEPING payment_confirmed_at
// and amount_paid_cents so the order stays usable without a new checkout.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Missing order ID.' }, { status: 400 })
    const { orderId } = parsed.data

    const admin = createAdminClient()
    const { data: order, error: orderError } = await admin.from('orders')
      .select('id,payment_confirmed_at')
      .eq('id', orderId)
      .single()
    if (orderError || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const { data: reports, error: reportsLoadError } = await admin.from('analysis_reports').select('id').eq('order_id', orderId)
    if (reportsLoadError) return NextResponse.json({ error: `Could not load the report to clear: ${reportsLoadError.message}` }, { status: 500 })
    const reportIds = (reports ?? []).map((r: { id: string }) => r.id)
    if (reportIds.length) {
      // scorecard_categories, position_screenshots, assigned_drills all
      // cascade from analysis_reports (see 001_initial_schema.sql).
      const { error } = await admin.from('analysis_reports').delete().in('id', reportIds)
      if (error) return NextResponse.json({ error: `Could not clear the report: ${error.message}` }, { status: 500 })
    }

    const { data: analyses, error: analysesLoadError } = await admin.from('motion_analyses').select('id,phase_snapshots').eq('order_id', orderId)
    if (analysesLoadError) return NextResponse.json({ error: `Could not load the analysis to clear: ${analysesLoadError.message}` }, { status: 500 })
    for (const analysis of analyses ?? []) {
      const snapshots = Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots as Array<{ storage_path?: string }> : []
      const storagePaths = snapshots.map((s) => s.storage_path).filter((p): p is string => Boolean(p))
      if (storagePaths.length) {
        const { error: storageError } = await admin.storage.from('analysis-assets').remove(storagePaths)
        if (storageError) console.error('[reset-test-order] Could not remove phase images', storageError)
      }
    }
    if (analyses?.length) {
      // training_plans cascades from motion_analyses (see 005_motion_lab.sql).
      const { error } = await admin.from('motion_analyses').delete().eq('order_id', orderId)
      if (error) return NextResponse.json({ error: `Could not clear the analysis: ${error.message}` }, { status: 500 })
    }

    const { data: videos, error: videosLoadError } = await admin.from('video_submissions').select('id,storage_path').eq('order_id', orderId)
    if (videosLoadError) return NextResponse.json({ error: `Could not load the videos to clear: ${videosLoadError.message}` }, { status: 500 })
    const videoStoragePaths = (videos ?? []).map((v: { storage_path: string | null }) => v.storage_path).filter((p: string | null): p is string => Boolean(p))
    if (videoStoragePaths.length) {
      const { error: storageError } = await admin.storage.from('pitch-videos').remove(videoStoragePaths)
      if (storageError) console.error('[reset-test-order] Could not remove video files', storageError)
    }
    if (videos?.length) {
      const { error } = await admin.from('video_submissions').delete().eq('order_id', orderId)
      if (error) return NextResponse.json({ error: `Could not clear the videos: ${error.message}` }, { status: 500 })
    }

    await admin.from('automatic_velocity_jobs').delete().eq('order_id', orderId)

    const { error: orderUpdateError } = await admin.from('orders').update({
      status: 'awaiting_videos',
      submitted_at: null,
      completed_at: null,
      delivery_estimate_text: null,
    }).eq('id', orderId)
    if (orderUpdateError) return NextResponse.json({ error: `Order data was cleared, but resetting status failed: ${orderUpdateError.message}` }, { status: 500 })

    await admin.from('order_status_history').insert({
      order_id: orderId,
      new_status: 'awaiting_videos',
      changed_by: user.id,
      note: 'Reset for testing: videos, analysis, and report cleared. Payment status was left untouched.',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not reset the order.' }, { status: 500 })
  }
}

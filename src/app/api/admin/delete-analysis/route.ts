import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const schema = z.object({ analysisId: z.string().uuid() })

// Deletes a saved (not yet published) automatic Motion Lab analysis so staff
// can discard a faulty run and let the athlete or admin retry cleanly.
// Deleting the row — rather than flagging it — is what keeps this from
// counting against the athlete's 14-day cooldown: enforce_motion_analysis_interval()
// only blocks a new insert if a prior non-exempt row still exists for that
// athlete within the window (see 012_membership_review_limits.sql /
// 024_automatic_processing_save_repair.sql).
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Missing analysis ID.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: analysis, error: loadError } = await admin.from('motion_analyses')
      .select('id,order_id,status,phase_snapshots')
      .eq('id', parsed.data.analysisId)
      .single()
    if (loadError || !analysis) return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 })
    if (analysis.status === 'published') {
      return NextResponse.json({ error: 'This analysis has already been published to the athlete and cannot be deleted from here.' }, { status: 409 })
    }

    const snapshots = Array.isArray(analysis.phase_snapshots) ? analysis.phase_snapshots as Array<{ storage_path?: string }> : []
    const storagePaths = snapshots.map((shot) => shot.storage_path).filter((path): path is string => Boolean(path))
    if (storagePaths.length) {
      const { error: storageError } = await admin.storage.from('analysis-assets').remove(storagePaths)
      // Best-effort: an orphaned file is a minor cleanup issue, not a reason
      // to block staff from discarding a faulty analysis.
      if (storageError) console.error('[delete-analysis] Could not remove phase images', storageError)
    }

    const { error: deleteError } = await admin.from('motion_analyses').delete().eq('id', analysis.id)
    if (deleteError) return NextResponse.json({ error: `Could not delete the analysis: ${deleteError.message}` }, { status: 500 })

    if (analysis.order_id) {
      await admin.from('order_status_history').insert({
        order_id: analysis.order_id,
        new_status: 'submitted',
        changed_by: user.id,
        note: 'Staff deleted a faulty automatic analysis. Retry automatic processing from the Videos tab.',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete the analysis.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const schema = z.object({ userId: z.string().uuid() })

// Non-destructively unblocks an athlete's 14-day analysis cooldown for
// testing: marks their existing motion_analyses rows cooldown_exempt
// instead of deleting them, since enforce_motion_analysis_interval() only
// blocks a new insert when a non-exempt row still exists in the window
// (012_membership_review_limits.sql). Reset for Testing only clears the one
// order it's run on; an athlete with several old test orders can still hit
// this cooldown from a sibling order's leftover (or order-less legacy)
// analysis, which this route is for.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Missing user ID.' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.from('motion_analyses')
      .update({ cooldown_exempt: true })
      .eq('user_id', parsed.data.userId)
      .eq('cooldown_exempt', false)
      .select('id')
    if (error) return NextResponse.json({ error: `Could not clear cooldown: ${error.message}` }, { status: 500 })

    return NextResponse.json({ ok: true, clearedCount: data?.length ?? 0 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not clear cooldown.' }, { status: 500 })
  }
}

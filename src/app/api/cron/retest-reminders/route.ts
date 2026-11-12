import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { retestEmailReady, retestMailingAddress, retestUnsubscribeToken } from '@/lib/retest-email-preferences'
import { sendFollowupReminderEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!retestEmailReady()) return NextResponse.json({ sent: 0, paused: true })
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data: plans, error } = await supabase.from('training_plans').select('id,user_id,profiles!inner(email,retest_email_opt_in)').eq('profiles.retest_email_opt_in', true).lte('follow_up_date', today).is('reminder_sent_at', null).limit(100)
  if (error) return NextResponse.json({ error: 'Could not load reminders' }, { status: 500 })
  let sent = 0
  for (const plan of plans ?? []) {
    const profile = Array.isArray(plan.profiles) ? plan.profiles[0] : plan.profiles
    if (!profile?.email || profile.retest_email_opt_in !== true) continue
    const token = retestUnsubscribeToken(plan.user_id)
    if (!token) continue
    const delivery = await sendFollowupReminderEmail(profile.email, token, retestMailingAddress()!)
    if (!delivery.success) continue
    const { error: updateError } = await supabase.from('training_plans').update({ reminder_sent_at: new Date().toISOString() }).eq('id', plan.id)
    if (!updateError) sent++
  }
  return NextResponse.json({ sent })
}

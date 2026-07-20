import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendFollowupReminderEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data: plans, error } = await supabase.from('training_plans').select('id,user_id,profiles(email,full_name)').lte('follow_up_date', today).is('reminder_sent_at', null).limit(100)
  if (error) return NextResponse.json({ error: 'Could not load reminders' }, { status: 500 })
  let sent = 0
  for (const plan of plans ?? []) {
    const profile = Array.isArray(plan.profiles) ? plan.profiles[0] : plan.profiles
    if (!profile?.email) continue
    await sendFollowupReminderEmail(profile.email, profile.full_name?.split(' ')[0] || 'Athlete')
    await supabase.from('training_plans').update({ reminder_sent_at: new Date().toISOString() }).eq('id', plan.id)
    sent++
  }
  return NextResponse.json({ sent })
}

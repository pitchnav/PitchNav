import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isResendConfigured, resend, resendFrom } from '@/lib/resend'

export async function POST(req: NextRequest) {
  if (!isResendConfigured) {
    return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 })
  }

  // Verify caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orderId, subject, body } = await req.json().catch(() => ({})) ?? {}

  if (typeof orderId !== 'string' || typeof subject !== 'string' || !subject.trim() || subject.length > 150 || typeof body !== 'string' || !body.trim() || body.length > 5000) {
    return NextResponse.json({ error: 'Missing orderId, subject, or body.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch order and athlete email
  const { data: order } = await admin
    .from('orders')
    .select('user_id,profiles(email,full_name)')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  const recipientEmail = (order.profiles as { email: string })?.email
  const recipientName = (order.profiles as { full_name: string })?.full_name ?? 'Athlete'

  if (!recipientEmail) {
    return NextResponse.json({ error: 'No email on file for this athlete.' }, { status: 422 })
  }

  try {
    const delivery = await resend.emails.send({
      from: resendFrom,
      to: recipientEmail,
      subject,
      text: `Hi ${recipientName},\n\n${body}\n\nPitch Nav analyst · pitchnav.com`,
    })
    if (delivery.error) return NextResponse.json({ error: 'Email delivery failed.' }, { status: 502 })

    // Log email in DB
    await admin.from('email_log').insert({
      user_id: order.user_id,
      order_id: orderId,
      template: 'admin_message',
      to_email: recipientEmail,
      subject,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin email error:', err)
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
  }
}

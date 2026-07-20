import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'

export async function POST(req: NextRequest) {
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

  const { orderId, subject, body } = await req.json()

  if (!orderId || !subject || !body) {
    return NextResponse.json({ error: 'Missing orderId, subject, or body.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch order and athlete email
  const { data: order } = await admin
    .from('orders')
    .select('*, profiles(email, full_name)')
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
    await resend.emails.send({
      from: `Pitch Nav <${process.env.RESEND_FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#0f172a;border-radius:12px;padding:24px;margin-bottom:24px;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;">Pitch Nav</h1>
          </div>
          <p style="color:#334155;font-size:16px;">Hi ${recipientName},</p>
          <div style="color:#334155;font-size:15px;line-height:1.7;white-space:pre-wrap;margin-bottom:24px;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">
            This message is from your Pitch Nav analyst. Reply to this email to respond.<br /><br />
            Pitch Nav · pitchnav.com
          </p>
        </div>
      `,
    })

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

import { NextRequest, NextResponse } from 'next/server'
import { isResendConfigured, resend } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { name, email, subject, message, website } = body

  // Honeypot: bots fill the hidden "website" field, humans leave it blank
  if (website) {
    return NextResponse.json({ ok: true }) // Silently discard
  }

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message too long.' }, { status: 400 })
  }

  if (!isResendConfigured) {
    return NextResponse.json({ error: 'Email service is temporarily unavailable.' }, { status: 503 })
  }

  try {
    await resend.emails.send({
      from: `Pitch Nav <${process.env.RESEND_FROM_EMAIL}>`,
      to: process.env.CONTACT_DESTINATION_EMAIL ?? process.env.RESEND_FROM_EMAIL!,
      replyTo: email,
      subject: `[Pitch Nav Contact] ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;margin-bottom:4px;">New Contact Form Submission</h2>
          <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Received from pitchnav.com/contact</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:120px;font-size:14px;">Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Email</td>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">${email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Subject</td>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">${subject}</td>
            </tr>
          </table>

          <h3 style="color:#0f172a;margin-bottom:8px;">Message</h3>
          <div style="background:#f8fafc;border-radius:8px;padding:16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">This message was sent via the Pitch Nav contact form. Reply directly to respond to ${name}.</p>
        </div>
      `,
    })

    // Auto-reply to sender
    await resend.emails.send({
      from: `Pitch Nav <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: 'We received your message — Pitch Nav',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;">Thanks for reaching out, ${name}!</h2>
          <p style="color:#334155;line-height:1.6;">
            We've received your message and will get back to you within 1–2 business days.
          </p>
          <p style="color:#334155;line-height:1.6;">
            <strong>Your message:</strong><br />
            <em>${message.slice(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${message.length > 300 ? '…' : ''}</em>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">
            Pitch Nav is not a medical or emergency service. If you or an athlete are experiencing a medical emergency, call 911.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form email error:', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }
}

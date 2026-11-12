import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isResendConfigured, resend, resendFrom } from '@/lib/resend'

const contact = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254),
  subject: z.enum(['order_status', 'video_upload', 'billing', 'report_question', 'account', 'general', 'other', 'privacy', 'cancellation']),
  message: z.string().trim().min(1).max(5000),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (body?.website) return NextResponse.json({ ok: true })

  const parsed = contact.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Check the email address, topic and message.' }, { status: 400 })
  if (!isResendConfigured) return NextResponse.json({ error: 'Email service is temporarily unavailable.' }, { status: 503 })

  const { name, email, subject, message } = parsed.data
  try {
    const receipt = await resend.emails.send({
      from: resendFrom,
      to: process.env.CONTACT_DESTINATION_EMAIL || 'support@pitchnav.com',
      replyTo: email,
      subject: `[Pitch Nav Contact] ${subject}`,
      text: [name, email, '', message].filter(line => line !== undefined).join('\n'),
    })
    if (receipt.error) throw new Error('Delivery failed')
  } catch {
    return NextResponse.json({ error: 'Could not deliver the message. You can email support@pitchnav.com directly.' }, { status: 502 })
  }
  // Keep sensitive request details in the support inbox. The on-screen receipt
  // confirms the provider accepted the request without echoing it to an unverified address.
  return NextResponse.json({ ok: true })
}

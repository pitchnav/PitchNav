import { NextRequest, NextResponse } from 'next/server'
import { isResendConfigured, resend, resendFrom } from '@/lib/resend'

import { quoteProgram, money, type ProgramPlan, type Billing } from '@/lib/program-pricing'

// Recompute quotes on the server; never trust amounts supplied by the browser.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Could not read the request.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Could not read the request.' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const organization = String(body.organization ?? '').trim()
  const role = String(body.role ?? '').trim()
  const pitcherCount = String(body.pitcherCount ?? '').trim()
  const email = String(body.email ?? '').trim()
  const website = String(body.website ?? '').trim()

  // Honeypot: silently accept so the bot does not learn it was caught.
  if (website) return NextResponse.json({ ok: true })

  if (!name || !organization || !role || !pitcherCount || !email) {
    return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 })
  }

  const count = Number(pitcherCount)
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    return NextResponse.json({ error: 'Enter the number of pitchers as a whole number.' }, { status: 400 })
  }

  if (name.length > 120 || organization.length > 160 || role.length > 120 || email.length > 200) {
    return NextResponse.json({ error: 'One of those fields is too long.' }, { status: 400 })
  }

  let quote: ReturnType<typeof quoteProgram>
  try {
    quote = quoteProgram(count, body.programPlan as ProgramPlan, body.billing as Billing)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid pricing selection.' }, { status: 400 })
  }

  if (!isResendConfigured) {
    return NextResponse.json(
      { error: 'Our email service is temporarily unavailable. Please email support@pitchnav.com directly.' },
      { status: 503 },
    )
  }

  const rows: [string, string][] = [
    ['Name', name],
    ['Organization', organization],
    ['Role', role],
    ['Pitchers', String(count)],
    ['Email', email],
    ['Plan', quote.plan === 'complete' ? 'Complete Development' : 'Pitch Tracking'],
    ['Billing', quote.billing],
    ['Signup estimate (before tax)', money(quote.dueNow)],
    ['One-time assessments', money(quote.assessment)],
    ['Renewal', money(quote.recurring) + (quote.billing === 'annual' ? '/year' : '/month from month 2')],
    ['First-year total', money(quote.firstYear)],
    ['Pricing version', '2026-10-31 graduated launch rates; all athletes assumed new'],
  ]

  try {
    const result = await resend.emails.send({
      from: resendFrom,
      to: process.env.CONTACT_DESTINATION_EMAIL || 'support@pitchnav.com',
      replyTo: email,
      subject: `[Pitch Nav Teams] ${organization} — ${count} pitchers`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;margin-bottom:4px;">Team pricing request</h2>
          <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Received from pitchnav.com/pricing</p>
          <table style="width:100%;border-collapse:collapse;">
            ${rows
              .map(
                ([label, value]) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:140px;font-size:14px;">${label}</td>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">${escapeHtml(value)}</td>
            </tr>`,
              )
              .join('')}
          </table>
        </div>
      `,
    })
    if (result.error) throw new Error('Email provider rejected the request')
  } catch {
    return NextResponse.json(
      { error: 'Could not send that request. Please email support@pitchnav.com directly.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}

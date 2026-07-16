import { Resend } from 'resend'

// Server-side only — never import on the client
export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Pitch Nav <noreply@pitchnav.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pitchnav.com'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  orderId?: string
  userId?: string
}

async function sendEmail({ to, subject, html, orderId, userId }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[Resend] Error sending email:', error)
      return { success: false, error: error.message, resendId: null }
    }
    return { success: true, error: null, resendId: data?.id ?? null }
  } catch (err) {
    console.error('[Resend] Unexpected error:', err)
    return { success: false, error: String(err), resendId: null }
  }
}

// ── Email Templates ─────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #05080f;
  color: #f1f5f9;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  border-radius: 12px;
`

const brandHeader = `
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#2563eb;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0;">
      Pitch<span style="color:#00e5a0;">Nav</span>
    </h1>
    <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Baseball Pitching Analysis</p>
  </div>
`

const footer = `
  <hr style="border:none;border-top:1px solid #1e2d45;margin:32px 0;" />
  <p style="color:#64748b;font-size:12px;text-align:center;">
    Pitch Nav · <a href="${APP_URL}/privacy" style="color:#2563eb;text-decoration:none;">Privacy Policy</a> ·
    <a href="${APP_URL}/terms" style="color:#2563eb;text-decoration:none;">Terms of Service</a><br />
    This is an automated message — please do not reply directly to this email.<br />
    For support, contact <a href="mailto:support@pitchnav.com" style="color:#2563eb;text-decoration:none;">support@pitchnav.com</a>
  </p>
`

export async function sendVerificationEmail(to: string, verificationUrl: string) {
  return sendEmail({
    to,
    subject: 'Verify your Pitch Nav account',
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;margin-bottom:8px;">Confirm your email address</h2>
      <p style="color:#94a3b8;line-height:1.6;">Thanks for signing up for Pitch Nav! Click the button below to verify your email address and activate your account.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verificationUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">Verify Email Address</a>
      </div>
      <p style="color:#64748b;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
      ${footer}</div>`,
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to Pitch Nav',
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;margin-bottom:8px;">Welcome, ${name}!</h2>
      <p style="color:#94a3b8;line-height:1.6;">Your Pitch Nav account is active. You're one step closer to understanding your delivery and developing your velocity.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/start-analysis" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">Start My Analysis</a>
      </div>
      <p style="color:#64748b;font-size:13px;">If you have questions, reach out to <a href="mailto:support@pitchnav.com" style="color:#2563eb;">support@pitchnav.com</a>.</p>
      ${footer}</div>`,
  })
}

export async function sendPaymentConfirmationEmail(
  to: string,
  name: string,
  orderId: string,
  amountCents: number
) {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100)
  return sendEmail({
    to,
    subject: `Payment confirmed — Pitch Nav Order #${orderId.slice(0, 8).toUpperCase()}`,
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;margin-bottom:8px;">Payment Confirmed ✓</h2>
      <p style="color:#94a3b8;line-height:1.6;">Thank you, ${name}. Your payment of <strong style="color:#f1f5f9;">${amount}</strong> has been received.</p>
      <div style="background:#1a2235;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="color:#64748b;margin:0 0 8px;font-size:13px;">ORDER ID</p>
        <p style="color:#f1f5f9;margin:0;font-family:monospace;font-size:14px;">${orderId.slice(0, 8).toUpperCase()}</p>
      </div>
      <p style="color:#94a3b8;line-height:1.6;">Your analysis is now in the queue. We'll send you an update when your reviewer begins work.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/dashboard/orders/${orderId}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">View Order Status</a>
      </div>
      ${footer}</div>`,
    orderId,
  })
}

export async function sendSubmissionConfirmationEmail(to: string, name: string, orderId: string) {
  return sendEmail({
    to,
    subject: 'Videos received — your Pitch Nav analysis is underway',
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;margin-bottom:8px;">Videos Received</h2>
      <p style="color:#94a3b8;line-height:1.6;">We have everything we need, ${name}. Your pitching videos have been securely uploaded and your analysis is in the queue.</p>
      <p style="color:#94a3b8;line-height:1.6;">You'll receive an email as soon as your reviewer starts work, and another when your report is ready.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/dashboard/orders/${orderId}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">Track Your Analysis</a>
      </div>
      ${footer}</div>`,
    orderId,
  })
}

export async function sendStatusUpdateEmail(
  to: string,
  name: string,
  orderId: string,
  statusLabel: string,
  customNote?: string
) {
  return sendEmail({
    to,
    subject: `Pitch Nav status update: ${statusLabel}`,
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;margin-bottom:8px;">Status Update</h2>
      <p style="color:#94a3b8;line-height:1.6;">Hi ${name}, here's the latest on your analysis:</p>
      <div style="background:#1a2235;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="color:#64748b;margin:0 0 4px;font-size:13px;">CURRENT STATUS</p>
        <p style="color:#00e5a0;margin:0;font-weight:700;font-size:16px;">${statusLabel}</p>
        ${customNote ? `<p style="color:#94a3b8;margin:12px 0 0;font-size:14px;">${customNote}</p>` : ''}
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/dashboard/orders/${orderId}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">View Your Order</a>
      </div>
      ${footer}</div>`,
    orderId,
  })
}

export async function sendAnalysisCompleteEmail(to: string, name: string, orderId: string) {
  return sendEmail({
    to,
    subject: '🎯 Your Pitch Nav analysis is ready!',
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#00e5a0;font-size:24px;margin-bottom:8px;">Your Analysis is Ready!</h2>
      <p style="color:#94a3b8;line-height:1.6;">Great news, ${name}. Your complete pitching mechanics report is now available in your dashboard.</p>
      <p style="color:#94a3b8;line-height:1.6;">Log in to view your Delivery Score, position-by-position breakdown, personalized drills, and eight-week focus plan.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/dashboard/reports/${orderId}" style="background:#00e5a0;color:#05080f;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">View My Report</a>
      </div>
      <p style="color:#64748b;font-size:13px;text-align:center;">Your PDF report is also available for download inside the dashboard.</p>
      ${footer}</div>`,
    orderId,
  })
}

export async function sendReplacementVideoRequestEmail(
  to: string,
  name: string,
  orderId: string,
  reason: string
) {
  return sendEmail({
    to,
    subject: 'Action needed: replacement video requested',
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f59e0b;font-size:22px;margin-bottom:8px;">Replacement Video Needed</h2>
      <p style="color:#94a3b8;line-height:1.6;">Hi ${name}, our reviewer needs a replacement video before your analysis can continue.</p>
      <div style="background:#1a2235;border:1px solid #78350f;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="color:#64748b;margin:0 0 4px;font-size:13px;">REASON</p>
        <p style="color:#f1f5f9;margin:0;font-size:14px;">${reason}</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/dashboard/orders/${orderId}" style="background:#f59e0b;color:#05080f;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">Upload Replacement Video</a>
      </div>
      ${footer}</div>`,
    orderId,
  })
}

export async function sendDeletionConfirmationEmail(to: string, name: string, requestType: string) {
  return sendEmail({
    to,
    subject: 'Pitch Nav data deletion request received',
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;margin-bottom:8px;">Deletion Request Received</h2>
      <p style="color:#94a3b8;line-height:1.6;">Hi ${name}, we've received your request to delete your ${requestType === 'all' ? 'account and all associated data' : requestType === 'videos' ? 'uploaded videos' : 'account'}.</p>
      <p style="color:#94a3b8;line-height:1.6;">Our team will process your request within 30 days and send a confirmation when complete. If you have questions, contact <a href="mailto:support@pitchnav.com" style="color:#2563eb;">support@pitchnav.com</a>.</p>
      ${footer}</div>`,
  })
}

export async function sendFollowupReminderEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'It’s time to retest your Pitch Nav delivery',
    html: `<div style="${baseStyle}">${brandHeader}
      <h1 style="color:#fff;margin:0 0 16px">Ready to see what changed?</h1>
      <p>Hi ${name}, your development-plan follow-up date has arrived.</p>
      <p>Record your next delivery using the same camera angle and frame-rate settings so you can compare your first and latest analyses.</p>
      <p><a href="${APP_URL}/start-analysis" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Start follow-up analysis</a></p>
      <p style="font-size:12px;color:#64748b">Pitch Nav provides educational baseball-training information and does not guarantee performance results.</p>
      ${footer}</div>`,
  })
}

export async function sendOwnerReviewRequestEmail(to: string, athleteName: string, title: string, analysisId: string) {
  return sendEmail({
    to,
    subject: `Approval requested: ${athleteName} — ${title}`,
    html: `<div style="${baseStyle}">${brandHeader}
      <h2 style="color:#f1f5f9;font-size:22px;">A Motion Lab report needs your approval</h2>
      <p style="color:#94a3b8;line-height:1.6;"><strong style="color:#fff;">${athleteName}</strong> submitted ${title}. Review the source video, phase frames, mechanics scores, velocity assumptions, and plan before releasing it.</p>
      <div style="text-align:center;margin:32px 0;"><a href="${APP_URL}/admin/motion-lab#${analysisId}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;display:inline-block;">Review and approve</a></div>
      ${footer}</div>`,
  })
}

export async function sendMotionAnalysisReadyEmail(to: string, name: string, analysisId: string) {
  return sendEmail({
    to,
    subject: 'Your Pitch Nav feedback has been approved',
    html: `<div style="${baseStyle}">${brandHeader}<h2 style="color:#00e5a0;font-size:24px;">Your verified feedback is ready</h2><p style="color:#94a3b8;line-height:1.6;">Hi ${name}, the Pitch Nav staff has reviewed and approved your mechanics feedback and development plan.</p><div style="text-align:center;margin:32px 0;"><a href="${APP_URL}/dashboard/feedback/${analysisId}" style="background:#00e5a0;color:#05080f;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;display:inline-block;">View approved report</a></div>${footer}</div>`,
  })
}

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { unsubscribeAccount } from '@/lib/retest-email-preferences'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function notice(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} | Pitch Nav</title><style>body{font:1.1rem/1.6 system-ui;background:#0b1220;color:#eee;margin:0}main{max-width:38rem;margin:12vh auto;padding:1.5rem}button,a{font:inherit}button{padding:.6rem 1.2rem}a{color:#99ceff}</style></head><body><main><h1>${title}</h1>${body}<p><a href="/contact?topic=privacy">Contact Pitch Nav support</a></p></main></body></html>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}

function invalidLink() {
  return notice('This reminder link is unavailable', '<p>Ask support to stop retest emails or change your email preference in Profile Settings.</p>', 400)
}

// Link previews may visit GET. Only the person's confirmation changes a preference.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!unsubscribeAccount(token)) return invalidLink()
  return notice('Stop retest reminders', `<p>Turn off future Pitch Nav development-plan retest emails for this account. Account and billing notices continue.</p><form action="/unsubscribe" method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Stop retest reminders</button></form>`)
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null)
  const userId = unsubscribeAccount(form?.get('token'))
  if (!userId) return invalidLink()
  try {
    const { error } = await createAdminClient().from('profiles').update({ retest_email_opt_in: false }).eq('id', userId)
    if (error) throw error
    return notice('Retest reminders turned off', '<p>You have unsubscribed from future retest reminders for this account.</p>')
  } catch {
    return notice('Could not save your preference', '<p>Please open the link again or contact support.</p>', 503)
  }
}

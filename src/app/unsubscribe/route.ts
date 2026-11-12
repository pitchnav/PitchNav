import { siteTheme } from '@/lib/site-theme'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { unsubscribeAccount } from '@/lib/retest-email-preferences'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function notice(title: string, body: string, status = 200) {
  const { ink, blue, paper, paperText, action, actionText } = siteTheme
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Pitch Nav</title><style>
  * { box-sizing: border-box }
  body { margin: 0; background: ${ink}; color: ${ink}; font: 1rem/1.6 "Avenir Next", system-ui, sans-serif }
  main { max-width: 40rem; margin: 12vh auto; padding: 0 1.25rem }
  header { margin-bottom: 1.5rem; color: ${blue}; font-weight: 700 }
  article { background: ${paper}; border-top: .3rem solid ${blue}; padding: clamp(1.25rem, 5vw, 2.5rem) }
  h1 { line-height: 1.08; letter-spacing: -.05em; margin-top: 0 }
  p { color: ${paperText} }
  a { color: ${ink}; font-weight: 600; text-underline-offset: .2em }
  button { min-height: 44px; border: 0; border-radius: 5px; padding: .75rem 1.1rem; font: inherit; font-weight: 650; color: ${actionText}; background: ${action}; cursor: pointer }
  :focus-visible { outline: 3px solid ${ink}; outline-offset: 3px }
</style></head><body><main><header>Pitch Nav</header><article><h1>${title}</h1>${body}
<p><a href="/contact?topic=privacy">Contact Pitch Nav support</a></p></article></main></body></html>`, {
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

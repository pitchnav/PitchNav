import { isStripeConfigured, stripe } from './stripe'

// Only the reusable login page belongs in the site. A /p/session URL grants
// access to one customer and must never be put in configuration or HTML.
function loginUrl(value: string | null | undefined, sandbox: boolean) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.origin !== 'https://billing.stripe.com' || url.username || url.password ||
        url.search || url.hash || !/^\/p\/login\/(?:test_)?[a-zA-Z0-9]+$/.test(url.pathname)) return null
    return url.pathname.startsWith('/p/login/test_') === sandbox ? url.href : null
  } catch { return null }
}

export async function billingPortalLogin(): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  const deployment = process.env.VERCEL_ENV
  const sandbox = deployment ? deployment !== 'production' : process.env.NODE_ENV !== 'production'
  if (key && !(sandbox ? /^(sk|rk)_test_/ : /^(sk|rk)_live_/).test(key)) return null
  const configured = process.env.STRIPE_CUSTOMER_PORTAL_URL?.trim()
  if (configured && !loginUrl(configured, sandbox)) return null
  if (!isStripeConfigured) return null
  try {
    // This optional link must never delay access to first-party cancellation.
    const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 }, { timeout: 1800, maxNetworkRetries: 0 })
    for (const config of configs.data) {
      if (config.livemode === sandbox || !config.features.subscription_cancel.enabled ||
          config.features.subscription_cancel.mode !== 'at_period_end' || !config.login_page.enabled) continue
      const url = loginUrl(config.login_page.url, sandbox)
      if (url && (!configured || url === configured)) return url
    }
  } catch { /* Keep the established support path available during a Stripe outage. */ }
  return null
}

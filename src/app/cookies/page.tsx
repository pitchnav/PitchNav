import type { Metadata } from 'next'
import Link from 'next/link'
import { PolicyDocument, PolicySection } from '@/components/layout/PolicyDocument'

export const metadata: Metadata = { title: 'Cookies and device storage' }
export default function CookiesPage() {
  return <PolicyDocument title="Cookies and device storage">
    <PolicySection title="Sign-in and choices"><p>Pitch Nav uses Supabase session cookies to keep you signed in and check access to your dashboard. The intake flow uses session storage to remember your selected membership plan for this tab. Signing out ends the session; clearing site data in your browser removes locally remembered choices and can require signing in again.</p></PolicySection>
    <PolicySection title="Other services"><p>Leaving Pitch Nav for Stripe checkout involves a separate service with its own device storage. See <a href="https://stripe.com/legal/cookies-policy">Stripe’s cookie policy</a>. Downloading a movement-analysis model connects your browser to its asset hosts. A connection to an asset host is not by itself evidence of an advertising cookie.</p><p>No advertising pixel or optional sitewide analytics tag was identified in the website source reviewed.</p></PolicySection>
    <PolicySection title="Questions"><p><Link href="/privacy">Read the privacy policy</Link> or <Link href="/contact?topic=privacy">contact us about your data</Link>.</p></PolicySection>
  </PolicyDocument>
}

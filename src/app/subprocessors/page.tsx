import type { Metadata } from 'next'
import Link from 'next/link'
import { PolicyDocument, PolicySection } from '@/components/layout/PolicyDocument'

export const metadata: Metadata = { title: 'Service providers and subprocessors' }
export default function SubprocessorsPage() {
  return <PolicyDocument title="Service providers and subprocessors">
    <PolicySection title="Services that handle customer data">
      <p>These are the services configured for the Pitch Nav coaching website. Which providers receive data depends on the features you use. Business customers can request processing terms and details of the providers covered by their agreement.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Vercel</strong> hosts the website and its server routes. Requests can include IP addresses, browser details and data submitted to a route.</li>
        <li><strong>Supabase</strong> handles account authentication, private file storage and database records. These can include athlete and guardian intake, source footage, extracted frames, measurements, reports, order references and permission choices.</li>
        <li><strong>Resend</strong> delivers email from configured website features. It can receive the recipient address, subject, message body and delivery information.</li>
        <li><strong>OpenAI</strong> provides an optional drafting service for staff. With current athlete or guardian permission, it receives still images from the delivery, timing and movement data, and relevant athlete intake and screen results. The updated permission also covers automatically drafting a coaching follow-up from staff-reviewed findings, assigned drills and plan details. Staff reviews the drafts.</li>
      </ul>
    </PolicySection>
    <PolicySection title="Payments and browser downloads">
      <p>Stripe hosts checkout and processes payment details. It receives billing and transaction information and can use it for its own payment, fraud-prevention and legal obligations. Its role depends on the processing activity. See <a href="https://stripe.com/privacy">Stripe’s privacy policy</a>.</p>
      <p>When you use browser-based motion analysis, the browser requests software and model files from jsDelivr and Google-hosted storage. Those hosts receive connection details, including the IP address. Pitch Nav runs the pose model in the browser.</p>
    </PolicySection>
    <PolicySection title="Questions from teams and facilities"><p>Use the <Link href="/contact?topic=privacy">privacy request form</Link> to ask which providers handle your account, where processing occurs, or how to receive notices of proposed provider changes under your agreement.</p></PolicySection>
  </PolicyDocument>
}

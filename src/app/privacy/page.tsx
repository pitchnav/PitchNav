import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Pitch Nav Privacy Policy — how we collect, use, and protect your information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400 text-sm">
            Last updated: [DATE — replace before launch]
          </p>
        </div>

        {/* Legal review notice */}
        <div className="mb-10 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <p className="text-sm text-yellow-400 font-semibold mb-1">⚠️ Attorney Review Required</p>
          <p className="text-xs text-yellow-400/80 leading-relaxed">
            This privacy policy contains placeholder sections marked with [PLACEHOLDER]. These
            sections must be reviewed and approved by a qualified attorney before this website
            is launched publicly.
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">1. Who We Are</h2>
            <p className="text-slate-400 leading-relaxed">
              Pitch Nav ("we," "our," or "us") is a baseball pitching mechanics analysis
              service operated by [PLACEHOLDER — legal entity name and address must be inserted
              before launch]. We provide remote pitching analysis services to athletes and their
              families.
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
              <div>
                <h3 className="text-white font-semibold mb-2">Account Information</h3>
                <p>Email address, name, and password (stored as a secure hash by Supabase).</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Athlete Profile Information</h3>
                <p>
                  Date of birth, age, height, weight, throwing handedness, playing level, school or
                  organization, graduation year, contact information, and parent or guardian
                  information for athletes under 18.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Velocity and Pitching Data</h3>
                <p>
                  Self-reported velocity readings, pitch types, throwing program information, and
                  other pitching-related information you choose to provide. This information is
                  clearly labeled as athlete-provided.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Health and Safety Information</h3>
                <p>
                  Responses to our health screening questions, including current pain status, recent
                  injury history, and medical clearance status. This information is used solely to
                  inform your reviewer and flag submissions that may require additional care.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Video Submissions</h3>
                <p>
                  Pitching videos you upload through the Pitch Nav platform. These are stored in a
                  private, access-controlled storage bucket and are accessible only to you and your
                  assigned reviewer.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Payment Information</h3>
                <p>
                  Payments are processed by Stripe. Pitch Nav does not store your full card number
                  or CVV. We receive a payment confirmation and amount from Stripe after a successful
                  transaction.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Usage Data</h3>
                <p>
                  [PLACEHOLDER — describe any analytics tools used, what data is collected, and
                  whether cookies or tracking pixels are used. This section must be accurate and
                  reviewed by an attorney before launch.]
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="space-y-2 text-sm text-slate-400 leading-relaxed list-disc pl-4">
              <li>To provide the pitching analysis service you requested</li>
              <li>To communicate with you about your order and account</li>
              <li>To send transactional emails (order confirmation, status updates, completion notice)</li>
              <li>To respond to support requests</li>
              <li>To process payments through Stripe</li>
              <li>To flag health-screening responses for reviewer awareness</li>
              <li>To process data-deletion requests</li>
              <li>To improve our service (without identifying individual athletes)</li>
            </ul>
            <p className="text-sm text-slate-400 mt-4">
              [PLACEHOLDER — if any analytics or marketing tools are used, their purposes must be
              disclosed here. Review with an attorney before launch.]
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">4. Video Storage and Retention</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Videos you submit are stored in a private Supabase storage bucket using access
              controls that prevent any user other than you and your assigned reviewer from
              accessing your files. After your analysis is complete, raw videos are retained for
              [PLACEHOLDER — configurable retention period, e.g., "one year"] to support potential
              follow-up analyses. After this period, videos may be deleted automatically or upon
              your request.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mt-3">
              You may request deletion of your uploaded videos at any time through your dashboard
              or by contacting support@pitchnav.com.
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">5. Information Sharing</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We do not sell, rent, or trade your personal information or athlete data to any
              third party. We share information only as follows:
            </p>
            <ul className="space-y-2 text-sm text-slate-400 leading-relaxed mt-3 list-disc pl-4">
              <li><strong className="text-white">Assigned reviewer:</strong> Your submitted videos and intake information are accessible to your assigned reviewer for the purpose of completing your analysis.</li>
              <li><strong className="text-white">Supabase:</strong> Our database and file storage provider. Data is stored on Supabase infrastructure.</li>
              <li><strong className="text-white">Stripe:</strong> Our payment processor. We share your email and order information with Stripe to process payments.</li>
              <li><strong className="text-white">Resend:</strong> Our transactional email provider. We share your email address with Resend to deliver order and status emails.</li>
              <li><strong className="text-white">Legal requirements:</strong> We may disclose information when required by law or to protect the rights and safety of users and third parties.</li>
            </ul>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">6. Optional Consent for Educational Use</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              During intake, athletes (and parents or guardians of minors) may optionally consent to:
            </p>
            <ul className="space-y-1 text-sm text-slate-400 mt-3 list-disc pl-4">
              <li>Use of anonymous clips for educational or instructional content</li>
              <li>Use of the athlete's name in promotional materials</li>
              <li>Use of a testimonial</li>
              <li>Use of before-and-after comparison clips</li>
            </ul>
            <p className="text-sm text-slate-400 mt-3">
              <strong className="text-white">These permissions are entirely optional</strong> and are not
              required to purchase or use the service. You may withdraw consent at any time by
              contacting support@pitchnav.com.
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">7. Your Rights and Data Deletion</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              You have the right to access, correct, or delete the personal information we hold
              about you. To exercise these rights:
            </p>
            <ul className="space-y-2 text-sm text-slate-400 mt-3 list-disc pl-4">
              <li>You can update your profile information in your dashboard at any time.</li>
              <li>You can request deletion of your uploaded videos from your dashboard.</li>
              <li>You can request deletion of your entire account and associated data from your dashboard or by emailing support@pitchnav.com.</li>
              <li>Deletion requests are processed within 30 days.</li>
            </ul>
            <p className="text-sm text-slate-400 mt-3">
              [PLACEHOLDER — add jurisdiction-specific rights (CCPA, GDPR, COPPA, etc.) with
              guidance from an attorney before launch. If athletes under 16 are accepted, COPPA
              compliance is required.]
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">8. Children's Privacy</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pitch Nav does not accept registrations from athletes under 13. For athletes
              between 13 and 17, we require a parent or guardian to complete the consent process
              during intake. Parent or guardian consent is required before any video is submitted
              or payment is made on behalf of a minor athlete.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mt-3">
              [PLACEHOLDER — review COPPA requirements with an attorney if any users under 13 may
              interact with the platform in any way.]
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">9. Security</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We use industry-standard security measures including encrypted connections (HTTPS),
              access-controlled storage buckets, row-level security on our database, and secure
              authentication through Supabase. However, no system is perfectly secure. If you
              become aware of a security issue, please contact support@pitchnav.com immediately.
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">10. Changes to This Policy</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of
              significant changes by email or by posting a notice on our website. Continued use
              of the service after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="card">
            <h2 className="text-xl font-bold text-white mb-4">11. Contact</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              For privacy-related questions, contact us at:
            </p>
            <p className="text-sm text-slate-300 mt-2">
              [PLACEHOLDER — legal entity name]<br />
              [PLACEHOLDER — mailing address]<br />
              support@pitchnav.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

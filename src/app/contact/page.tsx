'use client'

import { useState } from 'react'
import { Mail, Clock, AlertTriangle } from 'lucide-react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    // Honeypot field check (spam protection)
    const form = e.currentTarget
    const honeypot = (form.querySelector('[name="website"]') as HTMLInputElement)?.value
    if (honeypot) {
      // Bot filled the honeypot — silently drop
      setSubmitted(true)
      return
    }

    const data = {
      name: (form.querySelector('[name="name"]') as HTMLInputElement).value,
      email: (form.querySelector('[name="email"]') as HTMLInputElement).value,
      subject: (form.querySelector('[name="subject"]') as HTMLSelectElement).value,
      message: (form.querySelector('[name="message"]') as HTMLTextAreaElement).value,
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Request failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Contact Us</h1>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            Have a question about your order, billing, or the analysis process? We're here to help.
          </p>
        </div>

        {/* Emergency notice */}
        <div className="mb-10 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-1">
                Pitch Nav is not a medical or emergency service.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                If you or an athlete is experiencing a medical emergency, call 911 or go to
                the nearest emergency room immediately. For throwing injuries, stop throwing
                and contact an athletic trainer, physical therapist, or physician.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact info sidebar */}
          <div className="space-y-8">
            <div className="card">
              <Mail className="h-6 w-6 text-electric-blue-light mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">Email Support</h3>
              <a href="mailto:support@pitchnav.com" className="text-sm text-electric-blue-light hover:underline">
                support@pitchnav.com
              </a>
              <p className="text-xs text-slate-500 mt-2">[PLACEHOLDER — replace with real support email before launch]</p>
            </div>

            <div className="card">
              <Clock className="h-6 w-6 text-electric-blue-light mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">Response Times</h3>
              <p className="text-sm text-slate-400">
                [PLACEHOLDER — add actual business hours and response time expectations before launch]
              </p>
              <p className="text-xs text-slate-500 mt-2">Example: Monday–Friday, 9am–5pm EST. Typical response: 1–2 business days.</p>
            </div>

            <div className="card border-electric-blue/20">
              <h3 className="text-base font-semibold text-white mb-3">Common Questions</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>→ <a href="/faq#analysis" className="hover:text-white transition-colors">How long does analysis take?</a></li>
                <li>→ <a href="/faq#video" className="hover:text-white transition-colors">What video format is accepted?</a></li>
                <li>→ <a href="/faq#payments" className="hover:text-white transition-colors">Refund policy</a></li>
                <li>→ <a href="/faq#privacy" className="hover:text-white transition-colors">How are videos stored?</a></li>
              </ul>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2 card">
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-white mb-3">Message Sent</h2>
                <p className="text-slate-400">
                  Thanks for reaching out. We'll get back to you within 1–2 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-6">Send a Message</h2>

                {/* Honeypot (hidden from users, catches bots) */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="label">Your Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="input"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="input"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="label">Subject</label>
                  <select id="subject" name="subject" required className="input">
                    <option value="">Select a topic...</option>
                    <option value="order_status">Order Status</option>
                    <option value="video_upload">Video Upload Issue</option>
                    <option value="billing">Billing / Refund</option>
                    <option value="report_question">Question About My Report</option>
                    <option value="account">Account Issue</option>
                    <option value="general">General Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="label">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="input resize-none"
                    placeholder="Describe your question or issue in detail..."
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center py-3"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>

                <p className="text-xs text-slate-600 text-center">
                  Your message is sent securely. We do not share your contact information with third parties.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

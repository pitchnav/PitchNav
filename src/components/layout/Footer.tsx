import Link from 'next/link'
import { Instagram, Youtube, Twitter } from 'lucide-react'

const footerLinks = {
  product: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Sample Report', href: '/sample-report' },
    { label: 'Camera Setup', href: '/camera-setup' },
    { label: 'FAQ', href: '/faq' },
  ],
  account: [
    { label: 'Sign Up', href: '/signup' },
    { label: 'Sign In', href: '/login' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Start Analysis', href: '/start-analysis' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Training Disclaimer', href: '/disclaimer' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center mb-4">
              <span className="text-2xl font-black tracking-tight text-white">Pitch</span>
              <span className="text-2xl font-black italic tracking-tight text-electric-blue-light">Nav</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Remote pitching mechanics analysis for baseball pitchers at every level.
              Understand your delivery. Develop your velocity.
            </p>

            {/* Safety disclaimer */}
            <div className="mt-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                <strong className="text-yellow-400">Safety Notice:</strong> PitchFrame provides
                educational baseball training information. It does not diagnose injuries,
                calculate clinical injury risk, or guarantee velocity increases. Athletes
                experiencing pain should stop throwing and consult a medical professional.
              </p>
            </div>

            {/* Social links */}
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="rounded-lg border border-surface-border p-2.5 text-slate-400 hover:text-white hover:border-electric-blue transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="rounded-lg border border-surface-border p-2.5 text-slate-400 hover:text-white hover:border-electric-blue transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter / X"
                className="rounded-lg border border-surface-border p-2.5 text-slate-400 hover:text-white hover:border-electric-blue transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Account
            </h3>
            <ul className="space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="mt-12 border-surface-border" />

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} PitchFrame. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            PitchFrame is not affiliated with any professional baseball organization, school,
            or athletic program.
          </p>
        </div>
      </div>
    </footer>
  )
}

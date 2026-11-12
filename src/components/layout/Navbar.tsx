'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import type { User as AuthUser } from '@supabase/supabase-js'

const PUBLIC_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/pitch-metrics', label: 'Pitch Tracking' },
  { href: '/arsenal', label: 'Arsenal' },
  { href: '/faq', label: 'FAQ' },
  { href: '/shop', label: 'Shop' },
]

const ATHLETE_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/motion-lab', label: 'Video Review' },
  { href: '/dashboard/pitch-data', label: 'Pitch Data' },
  { href: '/arsenal', label: 'Arsenal Preview' },
  { href: '/shop', label: 'Shop' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const accountToggle = useRef<HTMLButtonElement>(null)
  const mobileToggle = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const links = authUser === undefined ? [] : authUser ? ATHLETE_LINKS : PUBLIC_LINKS
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const userId = authUser?.id
  useEffect(() => {
    let current = true
    setUserProfile(null)
    if (userId) {
      supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => {
        if (current) setUserProfile(data)
      })
    }
    return () => { current = false }
  }, [supabase, userId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserProfile(null)
    setAuthUser(null)
    setUserMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false); setUserMenuOpen(false) }, [pathname])
  useEffect(() => {
    if (!isOpen && !userMenuOpen) return
    function dismiss(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (userMenuOpen) { setUserMenuOpen(false); accountToggle.current?.focus() }
      if (isOpen) { setIsOpen(false); mobileToggle.current?.focus() }
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [isOpen, userMenuOpen])

  return (
    <nav aria-label="Main navigation"
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-md border-b border-surface-border '
          : 'bg-brand-ink border-b border-white/10'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={authUser ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <Image src="/icon.png" unoptimized alt="" width={32} height={29} className="h-auto w-8 rounded-sm" />
            <div className="flex items-center">
              <span className="text-2xl font-black tracking-tight text-white group-hover:text-electric-blue-light transition-colors">
                Pitch
              </span>
              <span className="text-2xl font-black italic tracking-tight text-electric-blue-light">
                Nav
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={cn(
                  'text-sm font-medium transition-colors duration-200',
                  pathname === link.href
                    ? 'text-brand-blue underline decoration-2 underline-offset-8'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA / User */}
          <div className="hidden xl:flex items-center gap-3">
            {authUser === undefined ? null : authUser ? (
              <>
                {userProfile?.is_admin && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-surface-hover"
                    aria-expanded={userMenuOpen}
                    ref={accountToggle}
                    aria-controls={userMenuOpen ? "account-links" : undefined}
                  >
                    <User className="h-4 w-4 text-electric-blue-glow" />
                    <span className="max-w-[120px] truncate">
                      {userProfile?.full_name ?? authUser.email ?? 'Account'}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', userMenuOpen && 'rotate-180')} />
                  </button>

                  {userMenuOpen && (
                    <div id="account-links" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-surface-border bg-navy-800  py-1 z-50">
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-surface-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" /> Profile Settings
                      </Link>
                      <hr className="my-1 border-surface-border" />
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-surface-hover transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary py-2 px-4 text-sm">
                  Sign In
                </Link>
                {pathname !== '/' && pathname !== '/pricing' && <Link href="/pricing" className="btn-secondary py-2 px-4 text-sm">
                  See plans
                </Link>}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="xl:hidden flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            ref={mobileToggle}
            aria-controls={isOpen ? "mobile-navigation" : undefined}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div id="mobile-navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="xl:hidden overflow-hidden border-t border-surface-border bg-navy-900"
          >
          <div className="px-4 py-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={cn(
                  'block rounded-lg px-4 py-3 text-base font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-surface-card text-white'
                    : 'text-slate-400 hover:bg-surface-card hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}

            {authUser === undefined ? null : authUser ? (
              <>
                {userProfile?.is_admin && (
                  <Link
                    href="/admin"
                    className="block rounded-lg px-4 py-3 text-base font-medium text-slate-400 hover:bg-surface-card hover:text-white transition-colors"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/dashboard/profile"
                  className="block rounded-lg px-4 py-3 text-base font-medium text-slate-400 hover:bg-surface-card hover:text-white transition-colors"
                >
                  Profile Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left rounded-lg px-4 py-3 text-base font-medium text-red-400 hover:bg-surface-card transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link href="/login" className="btn-secondary justify-center">
                  Sign In
                </Link>
                <Link href="/pricing" className="btn-secondary justify-center">
                  See plans
                </Link>
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

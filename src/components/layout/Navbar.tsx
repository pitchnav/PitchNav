'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import type { User as AuthUser } from '@supabase/supabase-js'

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/sample-report', label: 'Sample Report' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(data)
      } else {
        setUserProfile(null)
      }
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      loadUser()
    })
    return () => subscription.unsubscribe()
  }, [supabase, pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserProfile(null)
    setAuthUser(null)
    setUserMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  // Close mobile menu on route change
  useEffect(() => setIsOpen(false), [pathname])

  return (
    <nav
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-md border-b border-surface-border shadow-card'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
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
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-200',
                  pathname === link.href
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA / User */}
          <div className="hidden md:flex items-center gap-3">
            {authUser ? (
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
                    aria-haspopup="true"
                  >
                    <User className="h-4 w-4 text-electric-blue-glow" />
                    <span className="max-w-[120px] truncate">
                      {userProfile?.full_name ?? authUser.email ?? 'Account'}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', userMenuOpen && 'rotate-180')} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-surface-border bg-navy-800 shadow-card py-1 z-50">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-surface-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
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
                <Link href="/start-analysis" className="btn-primary py-2 px-4 text-sm">
                  Start Analysis
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden rounded-lg p-2 text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t border-surface-border bg-navy-900/98 backdrop-blur-md">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
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

            {authUser ? (
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
                  href="/dashboard"
                  className="block rounded-lg px-4 py-3 text-base font-medium text-slate-400 hover:bg-surface-card hover:text-white transition-colors"
                >
                  Dashboard
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
                <Link href="/start-analysis" className="btn-primary justify-center">
                  Start Analysis
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

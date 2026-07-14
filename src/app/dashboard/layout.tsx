import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, FileBarChart2, User, Settings, ClipboardList } from 'lucide-react'

const DASHBOARD_NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'My Orders', icon: ClipboardList },
  { href: '/dashboard/profile', label: 'Profile Settings', icon: Settings },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard')

  return (
    <div className="min-h-screen bg-navy-950 pt-16">
      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 min-h-screen border-r border-surface-border bg-navy-900 fixed top-16 bottom-0 left-0 z-10">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Athlete Dashboard
            </p>
            <nav className="space-y-1">
              {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-surface-card hover:text-white transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-6 border-t border-surface-border">
            <Link
              href="/start-analysis"
              className="btn-primary w-full justify-center text-sm py-2.5"
            >
              + New Analysis
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          {/* Mobile nav */}
          <div className="lg:hidden border-b border-surface-border bg-navy-900 px-4 py-3 flex gap-4 overflow-x-auto">
            {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white whitespace-nowrap transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

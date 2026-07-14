import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, ClipboardList, Users, Dumbbell, Settings, AlertTriangle
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'All Orders', icon: ClipboardList },
  { href: '/admin/athletes', label: 'Athletes', icon: Users },
  { href: '/admin/drills', label: 'Drill Library', icon: Dumbbell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You do not have permission to access the admin dashboard.</p>
          <Link href="/dashboard" className="btn-secondary">Return to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-16">
      <div className="flex">
        {/* Admin sidebar */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 min-h-screen border-r border-surface-border bg-navy-900 fixed top-16 bottom-0 left-0 z-10">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="rounded-md bg-electric-blue/20 px-2 py-1">
                <span className="text-xs font-bold text-electric-blue-light uppercase tracking-widest">Admin</span>
              </div>
            </div>
            <nav className="space-y-1">
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
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
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="lg:hidden border-b border-surface-border bg-navy-900 px-4 py-3 flex gap-3 overflow-x-auto">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white whitespace-nowrap"
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

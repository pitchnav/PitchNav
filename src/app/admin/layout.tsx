import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WorkspaceLink } from '@/components/layout/WorkspaceLink'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, ClipboardList, Users, Dumbbell, Settings, AlertTriangle, Activity, Film, Bot, MessageSquare } from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/os', label: 'OS', icon: Bot },
  { href: '/admin/orders', label: 'All Orders', icon: ClipboardList },
  { href: '/admin/athletes', label: 'Athletes', icon: Users },
  { href: '/admin/drills', label: 'Drill Library', icon: Dumbbell },
  { href: '/admin/motion-lab', label: 'Motion Reviews', icon: Activity },
  { href: '/admin/assessment-followups', label: 'Assessment Follow-ups', icon: MessageSquare },
  { href: '/admin/tracker-studio', label: 'Tracker Studio', icon: Film },
  { href: '/admin/program-pricing', label: 'Program Pricing', icon: Users },
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
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 overflow-y-auto border-r border-surface-border bg-navy-900 fixed top-16 bottom-0 left-0 z-10">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="rounded-md bg-electric-blue/20 px-2 py-1">
                <span className="text-sm font-semibold text-brand-blue">Admin</span>
              </div>
            </div>
            <nav aria-label="Administration" className="space-y-1">
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
                <WorkspaceLink key={href} href={href}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </WorkspaceLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 lg:ml-64 min-h-screen">
          <nav aria-label="Administration" className="lg:hidden border-b border-surface-border bg-navy-900 px-4 py-3 flex gap-3 overflow-x-auto">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <WorkspaceLink key={href} href={href}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </WorkspaceLink>
            ))}
          </nav>
          <div className="workspace-content p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

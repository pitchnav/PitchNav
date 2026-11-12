import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WorkspaceLink } from '@/components/layout/WorkspaceLink'
import { createClient } from '@/lib/supabase/server'
import { Activity, LayoutDashboard, Settings, ClipboardList, Dumbbell, TrendingUp, Ruler, Gauge } from 'lucide-react'

const DASHBOARD_NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'My Orders', icon: ClipboardList },
  { href: '/dashboard/motion-lab', label: 'Video Review', icon: Activity },
  { href: '/dashboard/movement-screens', label: 'Movement Screens', icon: Ruler },
  { href: '/dashboard/pitch-data', label: 'Pitch Data', icon: Gauge },
  { href: '/dashboard#feedback-plan', label: 'Feedback & Plan', icon: Dumbbell },
  { href: '/dashboard/compare', label: 'Compare Progress', icon: TrendingUp },
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
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 overflow-y-auto border-r border-surface-border bg-navy-900 fixed top-16 bottom-0 left-0 z-10">
          <div className="p-6">
            <p className="mb-4 border-b border-brand-line pb-3 text-sm font-semibold text-brand-blue">
              Athlete Dashboard
            </p>
            <nav aria-label="Athlete dashboard" className="space-y-1">
              {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => (
                <WorkspaceLink key={href} href={href}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </WorkspaceLink>
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
        <div className="min-w-0 flex-1 lg:ml-64 min-h-screen">
          {/* Mobile nav */}
          <nav aria-label="Athlete dashboard" className="sticky top-16 z-20 flex gap-3 overflow-x-auto border-b border-surface-border bg-navy-900/95 px-4 py-3 backdrop-blur lg:hidden">
            {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => (
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

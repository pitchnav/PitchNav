import type { Metadata } from 'next'
import { TrackerStudio } from '@/components/admin/TrackerStudio'

export const metadata: Metadata = {
  title: 'Tracker Studio',
  description: 'Staff tool for rendering pose-tracker overlays onto a video for sharing.',
}

// Access is enforced by the admin layout, which redirects anyone without
// is_admin before this page renders.
export default function TrackerStudioPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric-blue-light">Staff tools</p>
        <h1 className="mt-1 text-3xl font-black text-white">Tracker Studio</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Drop in any clip and get it back with the pose trackers drawn on, ready to post. Nothing here touches
          athlete records or creates a report.
        </p>
      </div>
      <TrackerStudio />
    </div>
  )
}

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { StatusTimeline } from '@/components/ui/StatusTimeline'
import { SafetyDisclaimer } from '@/components/ui/SafetyDisclaimer'
import { formatDateShort, formatFileSize, PLAYING_LEVEL_LABELS } from '@/lib/utils'
import type { AthleteProfile, VideoSubmission, OrderStatusHistory,
  PlayingLevel
} from '@/types/database'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      athlete_profiles(*),
      video_submissions(*),
      order_status_history(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) notFound()

  const profile = order.athlete_profiles as AthleteProfile
  const videos = order.video_submissions as VideoSubmission[]
  const history = (order.order_status_history as OrderStatusHistory[]) ?? []

  // Generate signed URLs for video previews
  const videoUrls: Record<string, string> = {}
  for (const video of videos ?? []) {
    const { data } = await supabase.storage
      .from('pitch-videos')
      .createSignedUrl(video.storage_path, 3600)
    if (data?.signedUrl) videoUrls[video.id] = data.signedUrl
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-slate-500 hover:text-white transition-colors mb-2 block">
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-black text-white">Order Details</h1>
          <p className="text-slate-400 mt-1">#{id.slice(0, 8).toUpperCase()}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Athlete summary */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Athlete Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Name', profile.athlete_full_name],
                ['Playing Level', profile.playing_level ? PLAYING_LEVEL_LABELS[profile.playing_level as PlayingLevel] : '—'],
                ['Throws', profile.throwing_hand],
                ['Current Velocity', profile.current_avg_velocity ? `${profile.current_avg_velocity} mph` : '—'],
                ['Goal Velocity', profile.goal_velocity ? `${profile.goal_velocity} mph` : '—'],
                ['Submitted', order.submitted_at ? formatDateShort(order.submitted_at) : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-slate-500">{label}</p>
                  <p className="text-white font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery estimate */}
          {order.delivery_estimate_text && (
            <div className="card border-electric-blue/20">
              <p className="text-sm text-electric-blue-glow">{order.delivery_estimate_text}</p>
            </div>
          )}

          {/* Replacement video request */}
          {order.status === 'additional_video_requested' && (
            <div className="card border-yellow-500/30 bg-yellow-500/5">
              <h3 className="text-base font-semibold text-yellow-400 mb-2">Replacement Video Requested</h3>
              <p className="text-sm text-slate-300 mb-4">
                Your reviewer has requested a replacement video. Please check the message from your reviewer below and re-upload.
              </p>
              <Link href={`/start-analysis/upload?orderId=${order.id}&replace=true`} className="btn-primary text-sm">
                Upload Replacement Video <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Videos */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Submitted Videos</h2>
            {videos?.length ? (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="rounded-lg border border-surface-border bg-navy-800 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white capitalize">
                        {video.angle.replace('_', ' ')} View
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        video.quality_approved === true ? 'bg-accent-green/10 text-accent-green' :
                        video.quality_approved === false ? 'bg-red-400/10 text-red-400' :
                        'bg-slate-700/40 text-slate-400'
                      }`}>
                        {video.quality_approved === true ? 'Approved' :
                         video.quality_approved === false ? 'Needs Replacement' :
                         'Pending Review'}
                      </span>
                    </div>
                    {videoUrls[video.id] ? (
                      <video
                        src={videoUrls[video.id]}
                        controls
                        className="w-full rounded-lg bg-black max-h-48 object-contain"
                        aria-label={`${video.angle} view video`}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Video className="h-4 w-4" />
                        {video.file_name}
                        {video.file_size_bytes && ` · ${formatFileSize(video.file_size_bytes)}`}
                      </div>
                    )}
                    {video.quality_rejection_reason && (
                      <p className="text-xs text-red-400 mt-2">{video.quality_rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No videos submitted yet.</p>
            )}
          </div>

          {/* Complete report CTA */}
          {order.status === 'complete' && (
            <div className="card bg-accent-green/5 border-accent-green/30 text-center py-8">
              <h3 className="text-xl font-bold text-accent-green mb-2">Your Report is Ready!</h3>
              <p className="text-slate-400 mb-6">View your complete mechanics analysis, drills, and four-week plan.</p>
              <Link href={`/dashboard/reports/${order.id}`} className="btn-accent">
                View My Report <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <SafetyDisclaimer compact />
        </div>

        {/* Right column — timeline */}
        <div>
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-6">Order Progress</h2>
            <StatusTimeline
              currentStatus={order.status}
              statusHistory={history.map((h) => ({
                new_status: h.new_status,
                created_at: h.created_at,
                note: h.note,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

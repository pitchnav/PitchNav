import { NextResponse } from 'next/server'
import { z } from 'zod'
import { enqueueAutomaticVelocityJob } from '@/lib/automatic-velocity'
import { createClient } from '@/lib/supabase/server'

const requestSchema = z.object({
  orderId: z.string().uuid(),
  videoSubmissionId: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid video request.' }, { status: 400 })

  const { data: video } = await supabase
    .from('video_submissions')
    .select('id,order_id,angle,orders!inner(user_id,payment_confirmed_at)')
    .eq('id', parsed.data.videoSubmissionId)
    .eq('order_id', parsed.data.orderId)
    .eq('angle', 'open_side')
    .eq('orders.user_id', user.id)
    .maybeSingle()

  if (!video) return NextResponse.json({ error: 'Paid side-view video not found.' }, { status: 404 })
  const linkedOrder = Array.isArray(video.orders) ? video.orders[0] : video.orders
  if (!linkedOrder?.payment_confirmed_at) {
    return NextResponse.json({ error: 'Payment must be confirmed before automatic processing.' }, { status: 403 })
  }

  const result = await enqueueAutomaticVelocityJob(parsed.data)
  return NextResponse.json(result, { status: result.ok ? 202 : 400 })
}


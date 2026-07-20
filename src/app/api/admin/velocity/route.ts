import { NextResponse } from 'next/server'
import { z } from 'zod'
import { enqueueAutomaticVelocityJob } from '@/lib/automatic-velocity'
import { createClient } from '@/lib/supabase/server'

const retrySchema = z.object({
  orderId: z.string().uuid(),
  videoSubmissionId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const parsed = retrySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid retry request.' }, { status: 400 })

  const result = await enqueueAutomaticVelocityJob(parsed.data)
  return NextResponse.json(result, { status: result.ok ? 202 : 400 })
}


import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendStaffReviewRequestEmail } from '@/lib/resend'

const schema = z.object({ analysisId: z.string().uuid() })

export async function POST(request: NextRequest) {
  try {
    const { analysisId } = schema.parse(await request.json())
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: analysis } = await supabase.from('motion_analyses').select('id,title,created_at').eq('id', analysisId).eq('user_id', user.id).single()
    if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    const { data: profile } = await supabase.from('profiles').select('full_name,email').eq('id', user.id).single()
    const reviewEmail =
      process.env.STAFF_REVIEW_EMAIL ||
      process.env.OWNER_REVIEW_EMAIL ||
      process.env.CONTACT_DESTINATION_EMAIL ||
      'pitchnavllc@gmail.com'

    const delivery = await sendStaffReviewRequestEmail(
      reviewEmail,
      profile?.full_name || profile?.email || 'Athlete',
      analysis.title,
      analysis.id
    )

    if (!delivery.success) {
      console.error('Staff review email was not delivered', delivery.error)
      return NextResponse.json(
        {
          error: 'The analysis was saved, but the staff notification email could not be delivered.',
          saved: true,
          notificationSent: false,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, saved: true, notificationSent: true })
  } catch (error) {
    console.error('Staff review notification failed', error)
    return NextResponse.json({ error: 'Review request could not be sent' }, { status: 400 })
  }
}

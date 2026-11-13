import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { followUpVoiceSchema } from '@/lib/followup-voice-settings'

const update = z.object({
  voice: followUpVoiceSchema,
  revision: z.string().datetime({offset:true}),
  approvedForReuse: z.boolean(),
}).strict()

export async function PATCH(request: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({error:'Sign in again.'},{status:401})
  const { data: profile } = await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({error:'Staff access required.'},{status:403})
  const parsed = update.safeParse(await request.json().catch(()=>null))
  if (!parsed.success) return NextResponse.json({error:'Enter a voice note or complete each example within the displayed limits.'},{status:400})
  const { voice, revision, approvedForReuse } = parsed.data
  if (voice.examples.length && !approvedForReuse) return NextResponse.json({error:'Confirm you have permission to reuse these examples.'},{status:400})
  const admin = createAdminClient()
  const nextRevision = new Date(Math.max(Date.now(), Date.parse(revision) + 1)).toISOString()
  const { data, error } = await admin.from('followup_voice_settings')
    .update({ ...voice, updated_at: nextRevision }).eq('id',true).eq('updated_at',revision).select('updated_at').maybeSingle()
  if (error) return NextResponse.json({error:'Could not save the team voice.'},{status:500})
  if (!data) return NextResponse.json({error:'The team voice changed since you opened it. Copy your edits and reopen this page.'},{status:409})
  return NextResponse.json({ voice, revision: data.updated_at })
}

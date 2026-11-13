import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const fields = 'specialist_instructions,specialist_revision'
const headers = { 'Cache-Control': 'private, no-store' }
const patch = z.object({
  instructions: z.string().trim().min(1).max(12000), revision: z.string().datetime({ offset: true }),
}).strict()
type Settings = { specialist_instructions: string | null; specialist_revision: string }

function saved(row: Settings) {
  return NextResponse.json({ instructions:row.specialist_instructions, revision:row.specialist_revision }, {headers})
}
function error(message: string, status: number) {
  return NextResponse.json({ error:message }, {status,headers})
}
async function staff() {
  const db = await createClient()
  const {data:{user}} = await db.auth.getUser()
  if (!user) return { denied:error('Sign in to PitchNav.',401) }
  const {data:profile} = await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
  return profile?.is_admin ? { db } : { denied:error('Staff access required.',403) }
}

export async function GET() {
  const access = await staff()
  if (access.denied) return access.denied
  const {data,error:dbError} = await access.db.from('followup_voice_settings').select(fields).eq('id',true).maybeSingle()
  if (dbError || !data) return error('Specialist voice settings are unavailable.',503)
  return saved(data)
}
export async function PATCH(request: Request) {
  const access = await staff()
  if (access.denied) return access.denied
  const input = patch.safeParse(await request.json().catch(() => null))
  if (!input.success) return error('Enter specialist instructions up to 12,000 characters and use the latest revision.',400)
  const {instructions,revision} = input.data
  const nextRevision = new Date(Math.max(Date.now(), Date.parse(revision)+1)).toISOString()
  const {data,error:dbError} = await createAdminClient().from('followup_voice_settings')
    .update({ specialist_instructions:instructions, specialist_revision:nextRevision })
    .eq('id',true).eq('specialist_revision',revision).select(fields).maybeSingle()
  if (dbError) return error('Could not save the specialist instructions.',503)
  if (!data) return error('Another staff member changed the specialist instructions. Reconnect to compare the saved version.',409)
  return saved(data)
}

import 'server-only'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const followUpVoiceSchema = z.object({
  note: z.string().trim().max(1200),
  examples: z.array(z.object({
    source: z.string().trim().min(1).max(1600),
    response: z.string().trim().min(1).max(2400),
  }).strict()).max(3),
}).strict()
export type FollowUpVoice = z.infer<typeof followUpVoiceSchema>
export type SavedFollowUpVoice = { voice: FollowUpVoice; revision: string | null }
const defaults: FollowUpVoice = { note: '', examples: [] }

export async function readFollowUpVoiceSettings(db: Awaited<ReturnType<typeof createClient>>): Promise<SavedFollowUpVoice> {
  const { data, error } = await db.from('followup_voice_settings').select('note,examples,updated_at').eq('id',true).maybeSingle()
  if (error || !data) return { voice: defaults, revision: null }
  const parsed = followUpVoiceSchema.safeParse({ note: data.note, examples: data.examples })
  return { voice: parsed.success ? parsed.data : defaults, revision: data.updated_at }
}

// Generation calls this only on the server, after checking the source and athlete permission.
export async function loadFollowUpVoice(): Promise<FollowUpVoice & { specialistInstructions?: string }> {
  const db = createAdminClient()
  const [settings, specialist] = await Promise.all([
    readFollowUpVoiceSettings(db),
    db.from('followup_voice_settings').select('specialist_instructions').eq('id',true).maybeSingle(),
  ])
  const instructions = specialist.data?.specialist_instructions
  return typeof instructions === 'string' && instructions.trim()
    ? { ...settings.voice, specialistInstructions: instructions } : settings.voice
}

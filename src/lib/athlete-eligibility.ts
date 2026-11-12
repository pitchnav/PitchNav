import type { SupabaseClient } from '@supabase/supabase-js'

export function missingDatabaseFunction(error: { code?: string } | null) {
  return error?.code === 'PGRST202' || error?.code === '42883'
}

export function hasIntakePermission(profile: {
  date_of_birth: string | null
  terms_agreed: boolean | null
  privacy_agreed: boolean | null
  guardian_consented: boolean | null
  guardian_consented_at: string | null
  guardian_name: string | null
  guardian_email: string | null
}, today = new Date()) {
  if (!profile.terms_agreed || !profile.privacy_agreed || !profile.date_of_birth) return false
  const dob = profile.date_of_birth
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false
  const date = today.toISOString().slice(0, 10)
  const age = Number(date.slice(0, 4)) - Number(dob.slice(0, 4)) - Number(date.slice(5) < dob.slice(5))
  if (age < 13) return false
  if (age >= 18) return true
  return Boolean(profile.guardian_consented && profile.guardian_consented_at &&
    profile.guardian_name?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.guardian_email ?? ''))
}

export async function getEligibleAthlete(client: SupabaseClient, userId: string, targetId: string | null = null) {
  const response = await client.rpc('eligible_athlete_id', { target_id: targetId })
  if (!missingDatabaseFunction(response.error)) return response
  // Older installations have the intake fields but not the helper function.
  let query = client.from('athlete_profiles')
    .select('id,date_of_birth,terms_agreed,privacy_agreed,guardian_consented,guardian_consented_at,guardian_name,guardian_email')
    .eq('user_id', userId).eq('terms_agreed', true).eq('privacy_agreed', true)
  if (targetId !== null) query = query.eq('id', targetId)
  const { data, error } = await query.order('updated_at', { ascending: false }).order('id')
  return { data: data?.find(profile => hasIntakePermission(profile))?.id ?? null, error }
}

import { redirect } from 'next/navigation'
import { StaffFollowupBridge } from '@/components/admin/StaffFollowupBridge'
import { isBridgeNonce } from '@/lib/followup-hub-bridge'
import { createClient } from '@/lib/supabase/server'

export default async function StaffBridgePage({ searchParams }: {searchParams:Promise<{connection?: string}>}) {
  const { connection } = await searchParams
  if (!isBridgeNonce(connection)) return <main className="mx-auto max-w-xl px-5 pt-28">Open Staff Follow-ups in your private PitchNav Agent Hub.</main>
  const db = await createClient()
  const {data:{user}} = await db.auth.getUser()
  if (!user) redirect('/login?redirectTo=' + encodeURIComponent('/assessment-followup-bridge?connection=' + connection))
  const {data:profile} = await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
  if (!profile?.is_admin) return <main className="mx-auto max-w-xl px-5 pt-28">A PitchNav staff account is required to open coaching follow-ups.</main>
  return <StaffFollowupBridge nonce={connection}/>
}

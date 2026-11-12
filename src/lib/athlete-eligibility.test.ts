import type { SupabaseClient } from '@supabase/supabase-js'
import { getEligibleAthlete, hasIntakePermission } from './athlete-eligibility'

const today = new Date('2026-11-11T12:00:00Z')
const profile = {
  id: 'athlete', date_of_birth: '2008-11-11', terms_agreed: true, privacy_agreed: true,
  guardian_consented: false, guardian_consented_at: null, guardian_name: null, guardian_email: null,
}

test('applies age and guardian decisions at the birthday boundary', () => {
  expect(hasIntakePermission(profile, today)).toBe(true)
  const minor = { ...profile, date_of_birth: '2013-11-11' }
  expect(hasIntakePermission(minor, today)).toBe(false)
  const approved = { ...minor, guardian_consented: true, guardian_consented_at: '2026-11-11', guardian_name: 'Guardian', guardian_email: 'adult@example.org' }
  expect(hasIntakePermission(approved, today)).toBe(true)
  expect(hasIntakePermission({ ...approved, date_of_birth: '2013-11-12' }, today)).toBe(false)
  expect(hasIntakePermission({ ...approved, privacy_agreed: false }, today)).toBe(false)
})

test('only a missing helper falls back to the signed-in owner’s profile', async () => {
  const orderById = jest.fn().mockResolvedValue({ data: [{ ...profile, date_of_birth: '1980-01-01' }], error: null })
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnValue({ order: orderById }) }
  const rpc = jest.fn().mockResolvedValue({ error: { code: 'PGRST202' } })
  const from = jest.fn().mockReturnValue(query)
  const client = { rpc, from } as unknown as SupabaseClient
  expect((await getEligibleAthlete(client, 'owner', 'athlete')).data).toBe('athlete')
  expect(query.eq).toHaveBeenCalledWith('user_id', 'owner')
  expect(query.eq).toHaveBeenCalledWith('id', 'athlete')
  from.mockClear()
  rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
  expect((await getEligibleAthlete(client, 'owner')).data).toBeNull()
  expect(from).not.toHaveBeenCalled()
})

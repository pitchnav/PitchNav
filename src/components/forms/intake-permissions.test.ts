import { calculateAge } from '@/lib/utils'
import { stepContactSchema } from './intakeSchema'
import { authReturnPath } from '@/lib/auth-redirect'

const base = { athleteFullName: 'Example Athlete', athleteEmail: 'athlete@example.test', termsAgreed: true, privacyAgreed: true }

beforeAll(() => jest.useFakeTimers().setSystemTime(new Date('2026-11-11T09:00:00Z')))
afterAll(() => jest.useRealTimers())

test('the thirteenth birthday is required even with a guardian', () => {
  const guardian = { guardianName: 'Example Guardian', guardianEmail: 'guardian@example.test', guardianConsented: true }
  expect(stepContactSchema.safeParse({ ...base, ...guardian, dateOfBirth: '2013-11-12' }).success).toBe(false)
  expect(stepContactSchema.safeParse({ ...base, ...guardian, dateOfBirth: '2013-11-11' }).success).toBe(true)
  expect(calculateAge('2013-02-30')).toBeNaN()
})
test('all guardian fields are enforced through the day before the eighteenth birthday', () => {
  const missing = stepContactSchema.safeParse({ ...base, dateOfBirth: '2008-11-12' })
  expect(missing.success).toBe(false)
  if (!missing.success) expect(missing.error.issues.map(issue => issue.path[0])).toEqual(expect.arrayContaining(['guardianName','guardianEmail','guardianConsented']))
  expect(stepContactSchema.safeParse({ ...base, dateOfBirth: '2008-11-11' }).success).toBe(true)
})
test('optional AI and publicity permissions can all be declined', () => {
  const data = stepContactSchema.parse({ ...base, dateOfBirth: '1998-01-10' })
  expect(data.consentAiDraft).toBeFalsy()
  expect(data.consentAnonymousClips).toBeFalsy()
})
test('auth returns accept internal paths only', () => {
  expect(authReturnPath('/start-analysis?plan=throwing')).toBe('/start-analysis?plan=throwing')
  expect(authReturnPath('//example.test')).toBe('/dashboard')
  expect(authReturnPath('https://example.test')).toBe('/dashboard')
})

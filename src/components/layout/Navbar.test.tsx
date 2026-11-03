/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Navbar } from './Navbar'

type Session = { user: { id: string; email: string } } | null
let notify: (event: string, session: Session) => void
const client = {
  auth: {
    onAuthStateChange(callback: typeof notify) {
      notify = callback
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    },
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
}
jest.mock('@/lib/supabase/client', () => ({ createClient: () => client }))
jest.mock('next/navigation', () => ({ usePathname: () => '/shop', useRouter: () => ({}) }))

test('switches both menus when the athlete signs in and restores visitor links on sign-out', async () => {
  render(<Navbar />)
  expect(screen.queryByText('FAQ')).toBeNull()
  act(() => notify('INITIAL_SESSION', null))
  expect(screen.getByText('FAQ')).toBeTruthy()
  await act(async () => notify('SIGNED_IN', { user: { id: 'athlete', email: 'pitcher@example.com' } }))
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  expect(screen.queryByText('FAQ')).toBeNull()
  expect(screen.queryByText('Pricing')).toBeNull()
  for (const name of ['Dashboard', 'Video Review', 'Pitch Data', 'Shop']) {
    expect(screen.getAllByRole('link', { name })).toHaveLength(2)
  }
  act(() => notify('SIGNED_OUT', null))
  expect(screen.getAllByText('FAQ')).toHaveLength(2)
  expect(screen.queryByText('Video Review')).toBeNull()
})

import { renderToStaticMarkup } from 'react-dom/server'
import SuccessPage from './page'
const mockMaybeSingle = jest.fn()
const mockEq = jest.fn()
const mockUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockUser }, from: () => ({ select: () => ({ eq: mockEq }) }) }),
}))
jest.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(path) }, notFound: () => { throw new Error('not-found') } }))

async function view(order: object | null) {
  mockMaybeSingle.mockResolvedValue({ data: order })
  return renderToStaticMarkup(await SuccessPage({ searchParams: Promise.resolve({ orderId: 'order-1', session_id: 'returned-session' }) }))
}
beforeEach(() => {
  mockUser.mockResolvedValue({ data: { user: { id: 'owner' } } })
  mockEq.mockReset().mockImplementation(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }))
})
test('confirms only a paid order belonging to the signed-in customer', async () => {
  const html = await view({ id: 'order-1', status: 'awaiting_videos', payment_confirmed_at: '2026-11-06' })
  expect(mockEq).toHaveBeenCalledWith('user_id', 'owner')
  expect(html).toContain('Payment confirmed')
  expect(html).toContain('/start-analysis/upload')
})
test.each([
  [{ status: 'awaiting_payment' }, 'Awaiting payment confirmation'],
  [{ status: 'cancelled', payment_confirmed_at: '2026-11-06' }, 'Order closed'],
  [{ status: 'refunded', payment_confirmed_at: '2026-11-06' }, 'Order closed'],
  [{ status: 'submitted', refunded_at: '2026-11-07', payment_confirmed_at: '2026-11-06' }, 'Order closed'],
])('holds the correct non-payable status', async (state, title) => {
  const html = await view({ id: 'order-1', ...state })
  expect(html).toContain(title)
  expect(html).not.toContain('/start-analysis/upload')
})
test('unknown order and unauthenticated returns never confirm', async () => {
  await expect(view(null)).rejects.toThrow('not-found')
  mockUser.mockResolvedValue({ data: { user: null } })
  await expect(view(null)).rejects.toThrow('/login')
})

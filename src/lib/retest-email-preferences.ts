import { createHmac, timingSafeEqual } from 'node:crypto'

function configuredSecret() {
  const secret = process.env.RETEST_UNSUBSCRIBE_SECRET?.trim()
  return secret && secret.length >= 32 ? secret : null
}

export function retestMailingAddress() {
  return process.env.RETEST_MAILING_ADDRESS?.trim() || null
}

export function retestEmailReady() {
  return Boolean(configuredSecret() && retestMailingAddress())
}

function signature(userId: string, secret: string) {
  return createHmac('sha256', secret).update('pitch-nav/retest-unsubscribe/v1/' + userId).digest('base64url')
}

export function retestUnsubscribeToken(userId: string) {
  const secret = configuredSecret()
  if (!secret || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(userId)) return null
  return userId + '.' + signature(userId, secret)
}

export function unsubscribeAccount(token: unknown): string | null {
  if (typeof token !== 'string' || token.length !== 80) return null
  const [userId] = token.split('.')
  const expected = retestUnsubscribeToken(userId)
  const actualBytes = Buffer.from(token)
  if (!expected || actualBytes.length !== expected.length) return null
  return timingSafeEqual(actualBytes, Buffer.from(expected)) ? userId : null
}

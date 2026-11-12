// Dispatch for the embedded website, not an authentication/authorization primitive.
// Older iOS and Android releases shared the Mobile token; Safari/Chrome do not send it.
export function isStoreWrapper(userAgent: string | null): boolean {
  return /\bPitchNav(?:IOS|Android|Mobile)\//i.test(userAgent ?? '')
}

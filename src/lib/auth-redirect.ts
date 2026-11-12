// Auth return destinations must resolve to a path on this site.
export function authReturnPath(value: string | null, fallback = '/dashboard') {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const url = new URL(value, 'https://return.invalid')
    return url.origin === 'https://return.invalid' ? url.pathname + url.search + url.hash : fallback
  } catch { return fallback }
}

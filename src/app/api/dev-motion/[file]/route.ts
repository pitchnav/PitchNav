import { readFile } from 'node:fs/promises'
import path from 'node:path'

// A design review can play footage from outside public/ without bundling an athlete in a release.
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const dir = process.env.PITCHNAV_LOCAL_MOTION_DIR
  if (process.env.NODE_ENV !== 'development' || !dir || !['delivery.webp', 'delivery.mp4'].includes(file)) return new Response(null, { status: 404 })
  let bytes: Buffer
  try { bytes = await readFile(path.join(dir, file)) } catch { return new Response(null, { status: 404 }) }
  const headers = new Headers({ 'Content-Type': file.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes' })
  const range = request.headers.get('range')
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range)
    const start = match ? Number(match[1]) : -1
    const end = match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1
    if (start < 0 || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } })
    headers.set('Content-Range', `bytes ${start}-${end}/${bytes.length}`)
    headers.set('Content-Length', String(end - start + 1))
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), { status: 206, headers })
  }
  headers.set('Content-Length', String(bytes.length))
  return new Response(new Uint8Array(bytes), { headers })
}

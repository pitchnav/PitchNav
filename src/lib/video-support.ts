/**
 * Whether this browser can actually decode a chosen video file.
 *
 * Rejecting every .mov by extension was wrong: plenty of iPhone clips are
 * H.264 inside a QuickTime container and play perfectly well. What genuinely
 * breaks is the codec, not the container -- an HEVC file gives Chrome nothing
 * to decode.
 *
 * The reason this has to be an explicit probe rather than "just try it" is
 * that an undecodable file does not reliably raise an error. It simply never
 * fires the loaded events the rest of the pipeline waits on, so the UI spins
 * forever with nothing to report. Loading it once in a throwaway element with
 * a timeout turns that silent hang into a fast, honest yes or no.
 */

export type VideoProbeResult = {
  ok: boolean
  /** Athlete-facing explanation, set only when the file cannot be used. */
  problem?: string
}

const UNSUPPORTED_MESSAGE =
  'This browser could not read that video. It is most likely an HEVC recording, which Chrome cannot decode. On iPhone go to Settings → Camera → Formats and choose "Most Compatible", then re-record. You can also open the clip in QuickTime and export it, or send any MP4.'

export async function probeVideoFile(file: File, timeoutMs = 8000): Promise<VideoProbeResult> {
  if (typeof document === 'undefined') return { ok: true }

  const url = URL.createObjectURL(file)
  const probe = document.createElement('video')
  probe.muted = true
  probe.preload = 'metadata'
  probe.playsInline = true

  try {
    const decodable = await new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (value: boolean) => {
        if (settled) return
        settled = true
        window.clearInterval(poll)
        window.clearTimeout(timer)
        resolve(value)
      }

      // Dimensions are the real proof: metadata can arrive for a container the
      // browser cannot actually decode frames from.
      const poll = window.setInterval(() => {
        if (probe.videoWidth > 0 && probe.videoHeight > 0) finish(true)
      }, 120)

      // A file that will hang forever is indistinguishable from a slow one
      // except by waiting, so the timeout is the failure signal.
      const timer = window.setTimeout(() => finish(false), timeoutMs)

      probe.addEventListener('error', () => finish(false), { once: true })
      probe.addEventListener('loadeddata', () => {
        if (probe.videoWidth > 0) finish(true)
      }, { once: true })

      probe.src = url
      probe.load()
    })

    return decodable ? { ok: true } : { ok: false, problem: UNSUPPORTED_MESSAGE }
  } finally {
    probe.removeAttribute('src')
    probe.load()
    URL.revokeObjectURL(url)
  }
}

/** File picker filter. Accepts QuickTime; the probe decides if it truly works. */
export const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm'

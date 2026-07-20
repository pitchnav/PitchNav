'use client'

import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

export function ProgressComparison({ firstUrl, latestUrl }: { firstUrl: string; latestUrl: string }) {
  const firstRef = useRef<HTMLVideoElement>(null)
  const latestRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const [opacity, setOpacity] = useState(50)
  function toggle() {
    const videos = [firstRef.current, latestRef.current].filter(Boolean) as HTMLVideoElement[]
    if (playing) videos.forEach((video) => video.pause())
    else { const time = Math.min(...videos.map((video) => video.currentTime)); videos.forEach((video) => { video.currentTime = time; video.playbackRate = 0.25; void video.play() }) }
    setPlaying(!playing)
  }
  return <div>
    <div className={`grid gap-4 ${overlay ? 'relative' : 'md:grid-cols-2'}`}>
      <video ref={firstRef} src={firstUrl} muted playsInline controls={!overlay} className="aspect-video w-full rounded-xl bg-black object-contain" />
      <video ref={latestRef} src={latestUrl} muted playsInline controls={!overlay} style={overlay ? { opacity: opacity / 100 } : undefined} className={overlay ? 'absolute inset-0 aspect-video h-full w-full rounded-xl bg-black object-contain' : 'aspect-video w-full rounded-xl bg-black object-contain'} />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={toggle} className="btn-primary">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? 'Pause both' : 'Play both at 0.25×'}</button><button onClick={() => setOverlay(!overlay)} className="btn-secondary">{overlay ? 'Side by side' : 'Overlay mode'}</button>{overlay && <label className="flex items-center gap-2 text-sm text-slate-400">Latest opacity <input type="range" min={0} max={100} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="accent-electric-blue" /></label>}</div>
  </div>
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Maximize, Pause, Play, Video } from 'lucide-react'
import { MetricHelp } from '@/components/pitch-data/MetricHelp'
import styles from './PublicHome.module.css'

const posterTime = 53 / 30
const examples = [
  ['armSlot', 'Arm slot', '42°'],
  ['hipShoulder', 'Hip–shoulder sep.', '38°'],
  ['stride', 'Stride', '87%'],
] as const
const clock = (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, '0')}`

export function PitchCard({ mediaBase }: { mediaBase?: string }) {
  const media = useRef<HTMLVideoElement>(null)
  const theater = useRef<HTMLDialogElement>(null)
  const [time, setTime] = useState(posterTime)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const expandButton = useRef<HTMLButtonElement>(null)
  const showReel = !!mediaBase && !failed
  useEffect(() => {
    const v = media.current
    if (!v || !showReel) return
    const ready = () => {
      if (!Number.isFinite(v.duration)) return
      setDuration(v.duration)
      v.currentTime = Math.min(posterTime, v.duration)
    }
    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) ready()
    else v.addEventListener('loadedmetadata', ready, { once: true })
    return () => v.removeEventListener('loadedmetadata', ready)
  }, [showReel, mediaBase])
  async function toggle() {
    const v = media.current
    if (!v) return
    if (!v.paused) { v.pause(); return }
    if (v.ended) v.currentTime = 0
    try { await v.play() } catch { setFailed(true) }
  }
  function toggleTheater() {
    const el = theater.current
    if (!el) return
    el.close()
    if (expanded) el.show()
    else el.showModal()
    setExpanded(!expanded)
    expandButton.current?.focus({ preventScroll: true })
  }
  return <figure className={styles.sample} aria-labelledby="motion-title">
    <figcaption className={styles.sheetHead}><span id="motion-title" className={styles.chip}><Video size={17} aria-hidden="true"/> Motion analysis</span>
      <span>{showReel ? `Frame ${String(Math.min(117,1+Math.floor(time*30+.001))).padStart(3,'0')}` : 'Pose study'}</span></figcaption>
    <dialog open role={expanded ? 'dialog' : 'group'} className={styles.theater} ref={theater} aria-label="Delivery replay" onCancel={e=>{ if(expanded){e.preventDefault();toggleTheater()} }}>
      {showReel ? <video ref={media} className={styles.film} src={mediaBase+'/delivery.mp4'} poster={mediaBase+'/delivery.webp'} muted playsInline preload="metadata"
        aria-label="Side-view footage of the pitcher beside a synchronized 3D anatomical model"
        onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onSeeked={e=>setTime(e.currentTarget.currentTime)}
        onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setFailed(true)} />
        : <Image unoptimized preload sizes="(max-width:899px) 94vw, 57vw" className={styles.film} src="/media/home/motion-study.webp" width="1320" height="638" alt="A side-view study of a pitcher at foot plant beside the 3D anatomical rig estimated from the same pose." />}
      {showReel && <div className={styles.transport}>
        <button type="button" onClick={toggle} aria-label={playing?'Pause delivery replay':'Play delivery replay'}>{playing?<Pause/>:<Play/>}</button>
        <input type="range" min="0" max={duration || 3.9} step={1/30} value={time} disabled={!duration}
          aria-label="Seek through delivery" aria-valuetext={`${time.toFixed(2)} seconds`}
          onChange={e=>{const t=Number(e.target.value);if(media.current) media.current.currentTime=t;setTime(t)}}/>
        <span>{clock(time)} / {clock(Math.ceil(duration || 3.9))}</span>
        <button ref={expandButton} type="button" aria-label={expanded?'Exit expanded replay':'Expand replay'} onClick={toggleTheater}><Maximize/></button>
      </div>}
    </dialog>
    <div className={styles.metricBar}>
      <span className={styles.exampleLabel}>Example metrics</span>
      {examples.map(([metric,label,value])=><MetricHelp key={metric} metric={metric} icon={false} reading={value} className={styles.motionMetric}>
        <span>{label}</span><strong>{value}</strong>
      </MetricHelp>)}
    </div>
  </figure>
}

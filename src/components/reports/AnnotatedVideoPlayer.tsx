'use client'

import { useRef, useState } from 'react'
import { Circle, Eraser, Pause, Play, StepBack, StepForward } from 'lucide-react'

export function AnnotatedVideoPlayer({ src, comparisonSrc, title }: { src: string; comparisonSrc?: string | null; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.25)
  function toggle() { const video = videoRef.current; if (!video) return; video.playbackRate = speed; if (video.paused) void video.play(); else video.pause(); setPlaying(video.paused) }
  function step(direction: number) { const video = videoRef.current; if (!video) return; video.pause(); setPlaying(false); video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + direction / 30)) }
  function point(event: React.PointerEvent<HTMLCanvasElement>) { const canvas = canvasRef.current!; const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height } }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { drawingRef.current = true; const p = point(event); const ctx = canvasRef.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(p.x, p.y) }
  function draw(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawingRef.current) return; const p = point(event); const ctx = canvasRef.current!.getContext('2d')!; ctx.strokeStyle='#38bdf8'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineTo(p.x,p.y); ctx.stroke() }
  function clear() { const canvas=canvasRef.current!; canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height) }
  return <div className="overflow-hidden rounded-xl border border-surface-border bg-black"><div className={`grid ${comparisonSrc ? 'md:grid-cols-2' : ''}`}><div className="relative aspect-video"><video ref={videoRef} src={src} playsInline className="h-full w-full object-contain" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} /><canvas ref={canvasRef} width={1280} height={720} onPointerDown={start} onPointerMove={draw} onPointerUp={() => drawingRef.current=false} onPointerLeave={() => drawingRef.current=false} className="absolute inset-0 h-full w-full touch-none cursor-crosshair" /></div>{comparisonSrc && <video src={comparisonSrc} controls muted className="aspect-video h-full w-full object-contain" />}</div><div className="flex flex-wrap items-center gap-2 border-t border-surface-border bg-navy-900 p-3"><button onClick={toggle} className="btn-primary px-3 py-2">{playing?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{playing?'Pause':'Play'}</button><button onClick={() => step(-1)} className="btn-secondary px-3 py-2" title="Previous frame"><StepBack className="h-4 w-4"/></button><button onClick={() => step(1)} className="btn-secondary px-3 py-2" title="Next frame"><StepForward className="h-4 w-4"/></button><select value={speed} onChange={(event)=>{const value=Number(event.target.value);setSpeed(value);if(videoRef.current)videoRef.current.playbackRate=value}} className="input w-auto py-2"><option value={0.125}>0.125×</option><option value={0.25}>0.25×</option><option value={0.5}>0.5×</option><option value={1}>1×</option></select><span className="flex items-center gap-1 text-xs text-electric-blue-light"><Circle className="h-4 w-4"/> Draw directly over video</span><button onClick={clear} className="btn-secondary ml-auto px-3 py-2"><Eraser className="h-4 w-4"/>Clear</button></div><p className="sr-only">{title}</p></div>
}

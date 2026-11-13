'use client'

import { useEffect, useState } from 'react'
import type { EvidenceFrame } from '@/components/reports/MechanicsFindings'

type Pixel = { x: number; y: number }
type SourceFrame = EvidenceFrame & { sampleTimes?: number[]; columns?: number }
type ReviewAngle = 'Throwing elbow' | 'Glove elbow' | 'Lead knee' | 'Rear knee' | 'Other joint'

const joints: Record<ReviewAngle, string[]> = {
  'Throwing elbow': ['Throwing shoulder', 'Throwing elbow', 'Throwing wrist'],
  'Glove elbow': ['Glove shoulder', 'Glove elbow', 'Glove wrist'],
  'Lead knee': ['Lead hip', 'Lead knee', 'Lead ankle'],
  'Rear knee': ['Rear hip', 'Rear knee', 'Rear ankle'],
  'Other joint': ['First landmark', 'Joint center', 'Last landmark'],
}

export function measuredAngle(points: Pixel[]) {
  if (points.length !== 3) return null
  const [a, joint, b] = points
  const x1 = a.x - joint.x, y1 = a.y - joint.y
  const x2 = b.x - joint.x, y2 = b.y - joint.y
  if (!Math.hypot(x1, y1) || !Math.hypot(x2, y2)) return null
  return Math.round(Math.atan2(Math.abs(x1 * y2 - y1 * x2), x1 * x2 + y1 * y2) * 180 / Math.PI)
}

export function sourcePanel(frame: SourceFrame, index: number, sheetWidth: number, sheetHeight: number) {
  if (!frame.sampleTimes?.length) return { x: 0, y: 0, width: sheetWidth, height: sheetHeight, time: frame.time }
  const columns = Math.min(frame.columns ?? frame.sampleTimes.length, frame.sampleTimes.length)
  const rows = Math.ceil(frame.sampleTimes.length / columns)
  const width = sheetWidth / columns, rowHeight = sheetHeight / rows
  // Motion Lab stores 32px of timestamp underneath each source image in a sheet.
  return { x: (index % columns) * width, y: Math.floor(index / columns) * rowHeight,
    width, height: rowHeight - 32, time: frame.sampleTimes[index] }
}

export function ManualAngleEvidence({ frames, onAttach, initialJoint = 'Lead knee' }: { frames: SourceFrame[]; onAttach: (key: string, text: string) => void; initialJoint?: ReviewAngle }) {
  const available = frames.filter(frame => frame.url)
  const [open, setOpen] = useState(false)
  const [frameKey, setFrameKey] = useState('')
  const [panelIndex, setPanelIndex] = useState(0)
  const [joint, setJoint] = useState<ReviewAngle>(initialJoint)
  const [customJoint, setCustomJoint] = useState('')
  const [points, setPoints] = useState<Pixel[]>([])
  const [nextPoint, setNextPoint] = useState(0)
  const [loaded, setLoaded] = useState<{ url: string; width: number; height: number } | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attached, setAttached] = useState(false)
  const frame = available.find(frame => frame.key === frameKey) ?? available[0]
  const url = frame?.url
  useEffect(() => {
    if (!open || !url) return
    let cancelled = false
    const img = new Image()
    setLoadError(false)
    img.onload = () => { if (!cancelled) setLoaded({ url, width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { if (!cancelled) setLoadError(true) }
    img.src = url
    return () => { cancelled = true }
  }, [open, url])
  if (!frame) return null
  const panel = loaded?.url === url && loaded ? sourcePanel(frame, panelIndex, loaded.width, loaded.height) : null
  const angle = measuredAngle(points)
  const jointName = joint === 'Other joint' ? customJoint.trim() : joint
  function resetPoints() { setPoints([]); setNextPoint(0); setAttached(false) }
  function placePoint(x: number, y: number) {
    if (!panel || nextPoint >= 3) return
    const point = { x: Math.min(panel.width - 1, Math.max(0, Math.round(x))), y: Math.min(panel.height - 1, Math.max(0, Math.round(y))) }
    const updated = points.slice()
    updated[nextPoint] = point
    setPoints(updated)
    setNextPoint(updated.length)
    setAttached(false)
  }
  function attach() {
    if (!panel || angle === null || !jointName || !Number.isFinite(panel.time)) return
    const positions = points.map(p => '(' + p.x + ', ' + p.y + ')').join(' → ')
    const evidence = `${jointName} measured by staff at ${panel.time!.toFixed(3)} s in ${frame.label}: approximately ${angle}° inside angle. Source image ${panel.width}×${panel.height} px, landmarks ${positions} from upper left.`
    onAttach(frame.key, evidence)
    setAttached(true)
  }
  return <div className="space-y-3">
    <button type="button" aria-expanded={open} className="btn-secondary text-sm" onClick={() => setOpen(!open)}>Measure an angle on footage</button>
    {open && <div className="space-y-3 rounded-md border border-slate-700 p-3">
      <div className="flex flex-wrap gap-3">
        <label><span className="label">Source image</span><select className="input" value={frame.key} onChange={e => { setFrameKey(e.target.value); setPanelIndex(0); resetPoints() }}>
          {available.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select></label>
        {!!frame.sampleTimes?.length && <label><span className="label">Sample time</span><select className="input" value={panelIndex} onChange={e => { setPanelIndex(Number(e.target.value)); resetPoints() }}>
          {frame.sampleTimes.map((time, i) => <option key={i} value={i}>{time.toFixed(3)} s</option>)}
        </select></label>}
        <label><span className="label">Joint</span><select className="input" value={joint} onChange={e => { setJoint(e.target.value as ReviewAngle); resetPoints() }}>
          {Object.keys(joints).map(name => <option key={name}>{name}</option>)}
        </select></label>
        {joint === 'Other joint' && <label><span className="label">Joint name</span><input className="input" value={customJoint} onChange={e => { setCustomJoint(e.target.value); setAttached(false) }} /></label>}
      </div>
      {loadError ? <p role="alert">The source image could not be loaded.</p> : panel && loaded && panel.height > 0 ? <>
        <p className="text-sm text-slate-300">{nextPoint < 3 ? 'Click the ' + joints[joint][nextPoint].toLowerCase() + ' on the athlete.' : 'To correct a point, select its name and place it again.'}</p>
        <svg className="block w-full cursor-crosshair bg-black" width={panel.width} height={panel.height} style={{height:'auto'}} viewBox={`0 0 ${panel.width} ${panel.height}`}
          aria-label={'Mark ' + joint.toLowerCase() + ' on source image'} onClick={e => {
            const box = e.currentTarget.getBoundingClientRect()
            placePoint((e.clientX - box.left) * panel.width / box.width, (e.clientY - box.top) * panel.height / box.height)
          }}>
          <image href={url ?? undefined} x={-panel.x} y={-panel.y} width={loaded.width} height={loaded.height}/>
          <polyline points={points.map(p => p.x + ',' + p.y).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
          {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={Math.max(2, panel.width / 200)} fill="none" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}
        </svg>
        <div className="flex flex-wrap items-center gap-2">
          {points.map((_,i) => <button key={i} type="button" className="btn-secondary text-xs" aria-pressed={i === nextPoint} onClick={() => setNextPoint(i)}>{joints[joint][i]}</button>)}
          {points.length > 0 && <button type="button" className="btn-secondary text-xs" onClick={resetPoints}>Clear points</button>}
          {angle !== null && <b className="text-white">{angle}° inside angle</b>}
          <button type="button" className="btn-secondary" disabled={angle === null || !jointName || !Number.isFinite(panel.time) || attached} onClick={attach}>{attached ? 'Attached to finding' : 'Attach measurement'}</button>
        </div>
      </> : <p role="status">Loading source image…</p>}
    </div>}
  </div>
}

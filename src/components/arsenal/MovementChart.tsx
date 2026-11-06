'use client'

import { useId, useMemo, useState } from 'react'
import { pitchTypeKey, type ArsenalPitch } from '@/lib/arsenal'

export function movementPosition(hb: number, ivb: number, extent = 30) {
  return { x: 320 + hb / extent * 250, y: 290 - ivb / extent * 220 }
}
const value = (n: number | null, unit: string) => n === null ? 'Not recorded' : `${Number(n.toFixed(1))} ${unit}`

export function MovementChart({ pitches, handedness }: { pitches: ArsenalPitch[]; handedness: 'RHP' | 'LHP' }) {
  const titleId = useId()
  const [hidden, setHidden] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const labels = useMemo(() => {
    const names = new Map<string, string>()
    for (const pitch of pitches) { const key = pitchTypeKey(pitch.pitchType); if (!names.has(key)) names.set(key, pitch.pitchType.trim().replace(/\s+/g, ' ')) }
    return names
  }, [pitches])
  const types = [...labels.keys()].sort()
  const color = (type: string) => `hsl(${(types.indexOf(pitchTypeKey(type)) * 137.508 + 195) % 360} 80% 68%)`
  const complete = pitches.filter(p => p.hb !== null && p.ivb !== null)
  const extent = Math.max(30, Math.ceil(Math.max(...complete.flatMap(p => [Math.abs(p.hb!), Math.abs(p.ivb!)]), 0) / 10) * 10)
  const active = pitches.find(p => p.id === selected && !hidden.includes(pitchTypeKey(p.pitchType)))
  return <section className="overflow-hidden rounded-2xl border border-slate-700 bg-navy-900" aria-label="Movement profile">
    <div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-5 sm:px-7">
      <div><h2 className="text-xl font-bold text-white">Movement profile</h2><p className="mt-1 text-sm text-slate-400">Pitcher&apos;s view · {handedness} · inches</p></div>
      <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">{complete.length} of {pitches.length} plotted</span>
    </div>
    <svg viewBox="0 0 640 580" className="block w-full" aria-labelledby={titleId} role="group">
      <title id={titleId}>Pitch movement. Positive horizontal break goes to the pitcher&apos;s right. Positive induced vertical break goes up.</title>
      <rect x="70" y="70" width="500" height="440" fill="#0b162b" rx="6" />
      {[-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1].map(fraction => {
        const tick = fraction * extent
        const { x, y } = movementPosition(tick, tick, extent)
        return <g key={fraction}>
          <line x1={x} x2={x} y1="70" y2="510" stroke={fraction === 0 ? '#738199' : '#26344b'} strokeDasharray={fraction === 0 ? undefined : '3 5'} />
          <line x1="70" x2="570" y1={y} y2={y} stroke={fraction === 0 ? '#738199' : '#26344b'} strokeDasharray={fraction === 0 ? undefined : '3 5'} />
          <text x={x} y="532" textAnchor="middle" fill="#aebbd0" className="text-[22px] sm:text-[13px]">{Number(tick.toFixed(1))}</text>
          <text x="57" y={y + 4} textAnchor="end" fill="#aebbd0" className="text-[22px] sm:text-[13px]">{Number(tick.toFixed(1))}</text>
        </g>
      })}
      <text x="320" y="561" textAnchor="middle" fill="#cbd5e1" className="text-[22px] sm:text-[14px]">Horizontal break (in) · pitcher&apos;s right +</text>
      <text x="20" y="290" textAnchor="middle" transform="rotate(-90 20 290)" fill="#cbd5e1" className="text-[22px] sm:text-[14px]">Induced vertical break (in)</text>
      <text x="86" y="94" fill="#7f91ab" className="text-[18px] sm:text-[12px]">{handedness === 'RHP' ? 'Glove side' : 'Arm side'}</text>
      <text x="554" y="94" textAnchor="end" fill="#7f91ab" className="text-[18px] sm:text-[12px]">{handedness === 'RHP' ? 'Arm side' : 'Glove side'}</text>
      {complete.filter(p => !hidden.includes(pitchTypeKey(p.pitchType))).map(p => {
        const pos = movementPosition(p.hb!, p.ivb!, extent)
        return <g key={p.id} transform={`translate(${pos.x} ${pos.y})`} role="button" tabIndex={0}
          aria-label={`${p.pitchType}: HB ${value(p.hb, 'inches')}, IVB ${value(p.ivb, 'inches')}, velocity ${value(p.velocity, 'mph')}`}
          aria-pressed={selected === p.id} onFocus={() => setSelected(p.id)} onMouseEnter={() => setSelected(p.id)}
          onClick={() => setSelected(p.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(p.id) } }}
          className="cursor-pointer outline-none focus:stroke-white">
          <circle r="35" fill="transparent" />
          <circle r={selected === p.id ? 10 : 7} fill={color(p.pitchType)} stroke={selected === p.id ? 'white' : '#0b162b'} strokeWidth="2" />
        </g>
      })}
      {!complete.length && <text x="320" y="255" textAnchor="middle" fill="#cbd5e1" fontSize="16">Add HB and IVB to plot a pitch</text>}
    </svg>
    <div className="flex flex-wrap gap-2 px-5 pb-4 sm:px-7" aria-label="Pitch type visibility">
      {types.map(type => <button key={type} type="button" aria-pressed={!hidden.includes(type)} onClick={() => setHidden(h => h.includes(type) ? h.filter(t => t !== type) : [...h, type])}
        className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${hidden.includes(type) ? 'border-slate-800 text-slate-500 line-through' : 'border-slate-600 text-slate-200'}`}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(type) }} />{labels.get(type) || 'Unnamed pitch'}
      </button>)}
    </div>
    <div className="min-h-24 border-t border-slate-700 bg-navy-950/50 px-5 py-4 sm:px-7" aria-live="polite">
      {active ? <><p className="font-semibold" style={{ color: color(active.pitchType) }}>{active.pitchType}</p><p className="mt-1 text-sm leading-6 text-slate-300">Velocity {value(active.velocity, 'mph')} · IVB {value(active.ivb, 'in')} · HB {value(active.hb, 'in')} · Spin {value(active.spin, 'rpm')}</p><p className="mt-1 text-xs text-slate-400">Source: {active.source || 'Not specified'}{active.count !== null ? ` · ${active.count} recorded pitches` : ''}</p></> : <p className="text-sm leading-6 text-slate-400">Tap, hover, or focus a pitch to inspect its measurements. Use the legend to show or hide a pitch type. Missing measurements are left blank, never estimated.</p>}
    </div>
  </section>
}

'use client'

import { useState } from 'react'
import { sampleArsenal } from '@/lib/arsenal-example'
import styles from './PublicHome.module.css'

const labels = ['Four-seam', 'Slider', 'Changeup']
const colors = ['#124f7b', '#583a6e', '#2d6858']
const x = (inches: number) => 170 + 6 * inches
const y = (inches: number) => 148 - 5 * inches

export function PitchCard() {
  const [active, setActive] = useState(0)
  const pitch = sampleArsenal[active]
  return <figure className={styles.sheet}>
    <figcaption className={styles.sheetHead}><strong>Pitch movement</strong><span>Sample arsenal · RHP</span></figcaption>
    <svg className={styles.plot} viewBox="0 0 340 252" role="img" aria-label="Example movement in inches, from the pitcher’s view. The three pitches are also available using the buttons below.">
      <defs><pattern id="field-grid" x="20" y="23" width="30" height="25" patternUnits="userSpaceOnUse"><path d="M30 0 H0 V25" fill="none" stroke="#c1d0d3" strokeWidth="1"/></pattern></defs>
      <rect x="20" y="23" width="300" height="200" fill="url(#field-grid)"/>
      <path d="M20 148H320 M170 23V223" stroke="#809399" fill="none"/>
      <g fill="#465b64" fontSize="9" fontFamily="ui-monospace, monospace"><text x="5" y="50">20</text><text x="5" y="101">10</text><text x="10" y="151">0</text><text x="49" y="237">−20</text><text x="167" y="237">0</text><text x="282" y="237">+20</text></g>
      <g fill="#314b58" fontSize="10"><text x="20" y="15">Induced vertical break (in.)</text><text x="319" y="251" textAnchor="end">Horizontal break (in.)</text></g>
      {sampleArsenal.map((p,i) => <g key={p.id} transform={`translate(${x(p.hb ?? 0)} ${y(p.ivb ?? 0)})`}>
        {i===active && <circle r="15" fill="none" stroke={colors[i]} strokeWidth="1.5"/>}
        {i===0 ? <circle r="7" fill={colors[i]}/> : i===1 ? <rect x="-6" y="-6" width="12" height="12" rx="1" fill={colors[i]}/> : <path d="M0 -8L8 6H-8Z" fill={colors[i]}/>}
        <text x={i===2?11:0} y={i===2?5:-21} textAnchor={i===2?'start':'middle'} fontSize="10" fontWeight="700" fill={colors[i]}>{labels[i]}</text>
      </g>)}
    </svg>
    <div className={styles.switches} role="group" aria-label="Select sample pitch">{labels.map((label,i)=><button key={label} type="button" onClick={()=>setActive(i)} aria-pressed={i===active}>{label}</button>)}</div>
    <dl className={styles.readings} aria-live="polite" aria-atomic="true">
      {[['Velocity',pitch.velocity,'mph'],['Horiz. break',pitch.hb,'in'],['Vert. break',pitch.ivb,'in']].map(([name,value,unit])=><div key={name}><dt>{name}</dt><dd>{value} <small>{unit}</small></dd></div>)}
    </dl>
  </figure>
}

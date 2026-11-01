import { Target, Play, Database } from 'lucide-react'

/** Illustrative marketing preview: never connected to measurement or athlete records. */
export function PitchTrackingHUD() {
  return <figure className="mx-auto w-full max-w-sm">
    <div className="overflow-hidden rounded-[2rem] border border-slate-600/60 bg-navy-950 p-5 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between gap-3"><span className="font-black italic text-white">PITCH <span className="text-electric-blue-light">NAV</span></span><span className="rounded-full border border-electric-blue/30 px-2 py-1 text-[10px] font-bold tracking-widest text-electric-blue-light">HUD PREVIEW</span></div>
      <div className="mt-6 flex justify-between text-xs text-slate-400"><span>BULLPEN · SAMPLE PITCH</span><span>FASTBALL</span></div>
      <div className="mt-4 rounded-2xl border border-surface-border bg-navy-900 p-5">
        <p className="text-xs font-semibold tracking-widest text-slate-400">VELOCITY · EXAMPLE ONLY</p>
        <p className="mt-2 flex items-baseline gap-2"><span className="text-6xl font-black tracking-tight text-white">88.1</span><span className="text-sm text-slate-400">MPH</span></p>
        <p className="mt-2 text-xs text-slate-400">Illustrative value, not a measured result</p>
      </div>
      <div className="mt-4 rounded-2xl border border-surface-border p-4">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-300"><Target className="h-4 w-4 text-electric-blue-light" /> PITCH LOCATION</p>
        <svg className="mx-auto mt-3 w-full max-w-[220px]" viewBox="0 0 220 170" role="img" aria-label="Illustrative pitch map with persistent circles inside and outside the strike zone">
          <rect x="66" y="25" width="88" height="112" rx="1" fill="none" stroke="currentColor" className="text-slate-400" />
          <path d="M95.3 25V137 M124.7 25V137 M66 62.3H154 M66 99.7H154" fill="none" stroke="currentColor" className="text-slate-600" />
          <path d="M90 147H130V153L110 164L90 153Z" fill="none" stroke="currentColor" className="text-slate-400" />
          {[{x:84,y:54},{x:119,y:88},{x:141,y:112},{x:174,y:77}].map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="9" fill="currentColor" className="text-electric-blue" /><text x={p.x} y={p.y+3} textAnchor="middle" fontSize="9" fill="currentColor" className="text-white">{i+1}</text></g>)}
        </svg>
        <p className="text-center text-xs text-slate-400">Sample locations · including outside the zone</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {['Spin rate','Induced vert. break','Horizontal break','Release extension','Stuff+'].map(label=><div key={label} className={`rounded-lg bg-navy-900 p-3 ${label==='Stuff+'?'col-span-2':''}`}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-white">—</p></div>)}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-400"><span className="flex items-center gap-1"><Play className="h-3 w-3" /> Replay after processing</span><Database className="h-4 w-4" aria-hidden="true" /></div>
    </div>
    <figcaption className="mt-4 text-center text-xs leading-relaxed text-slate-400">Design preview with sample data. Dashes mean unavailable metrics. This is not a live recording or proof of tracking accuracy.</figcaption>
  </figure>
}

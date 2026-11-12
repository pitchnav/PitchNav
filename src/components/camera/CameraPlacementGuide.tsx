export type ThrowingHand = 'right' | 'left'

function TopDownDiagram({ hand, compact }: { hand: ThrowingHand; compact: boolean }) {
  const width = compact ? 320 : 760
  const rubber = compact ? 83 : 220
  const plate = width - (compact ? 29 : 65)
  const at = (x: number) => hand === 'right' ? x : width - x
  const directionLabel = at((rubber + plate) / 2 + (compact ? 13 : 0))

  return (
    <svg viewBox={`0 0 ${width} 245`} aria-hidden="true" className={compact ? 'block w-full sm:hidden' : 'hidden w-full sm:block'}>
      <g transform={hand === 'left' ? `translate(${width} 0) scale(-1 1)` : undefined}>
        <circle cx={rubber} cy="80" r={compact ? 51 : 72} fill="#a79577" />
        <path d={`M${rubber} 80H${plate - 25}`} stroke="#f7f8f6" strokeWidth="2.2" strokeDasharray="8 6" />
        <path d={`M${plate - 33} 75l13 5-13 5z M${plate - 8} 70h12l10 10-10 10h-12z`} fill="#f7f8f6" />
        <g transform={`translate(${rubber} 80)`}>
          <path d="M0 0v112" stroke="#5dabf9" strokeWidth="3" />
          <path d="M0 14h15V0" fill="none" stroke="#e3f2fd" strokeWidth="1.4" />
          <rect x="-3" y="-16" width="6" height="32" rx="1" fill="white"/>
          <g transform="translate(-14 10)" fill="none" stroke="#fff9e9" strokeWidth="1.2">
            <path d="M-14 0q0-5 7-5l8 1q4 0 6-1 6-1 6 4t-6 5l-6-1-8 1q-7 0-7-4Z" />
            <path d="M-10-3v6m3-7v7M3-3v5m3-6v7m3-7v6" />
          </g>
          <g transform="translate(0 116)" fill="none" stroke="#f4f8fa" strokeWidth="2.4" strokeLinecap="round">
            <rect x="-13" y="-9" width="26" height="15" rx="3" fill="#123648"/>
            <circle cx="0" cy="-1.5" r="4" /><path d="M0 7l-9 12m9-12v12m0-12 9 12" />
          </g>
        </g>
      </g>
      <g textAnchor="middle" fontSize={compact ? 12 : 14} fontWeight="700" fill="#f3f8fa">
        <text x={at(rubber)} y="53" fill="#1e2e36">Rubber</text>
        <text x={at(rubber + 33)} y="104" fill="#1e2e36">90°</text>
        <text x={at(rubber) + (hand === 'right' ? -23 : 23)} y="160" fill="#d1ebff">15 ft</text>
        <text x={directionLabel} y="59">Toward home plate</text>
        <text x={at(rubber)} y="238" fontSize={compact ? 12 : 14}>Camera · 6 ft high</text>
      </g>
    </svg>
  )
}

export function CameraPlacementGuide({ hand, setHand }: { hand: ThrowingHand; setHand: (hand: ThrowingHand) => void }) {
  return (
    <section id="tripod" className="card mb-6 scroll-mt-24 bg-gradient-to-br from-[#163b50] to-[#102f41] p-4 sm:p-6" aria-labelledby="placement-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.17em] text-electric-blue-light">Open-side view</p>
          <h2 id="placement-title" className="mt-1 text-2xl font-black text-white">Camera position, top-down</h2>
        </div>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-slate-200">Pitcher’s throwing hand</legend>
          <div className="inline-flex rounded-md border border-surface-border bg-navy-950/60 p-0.5">
            {(['right', 'left'] as const).map(value => (
              <label key={value} className="relative cursor-pointer">
                <input type="radio" name="setup-hand" value={value} checked={hand === value} onChange={() => setHand(value)}
                  className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0" />
                <span className="flex min-h-11 items-center rounded px-4 text-sm font-semibold text-slate-200 peer-checked:bg-brand-blue peer-checked:text-brand-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-white">
                  {value === 'right' ? 'Right' : 'Left'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <figure className="mt-3">
        <div role="img" aria-label={`Top-down view for a ${hand}-handed pitcher. The dashed line goes from the rubber to home plate. The camera sits 15 feet to the pitcher’s ${hand}, perpendicular to that line, with its lens 6 feet high.`}>
          <TopDownDiagram hand={hand} compact={false} />
          <TopDownDiagram hand={hand} compact />
        </div>
        <figcaption className="mt-4 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-200">
          Face home plate. Start about <strong>15 feet to your {hand}</strong> with the phone level in landscape. Back up until the whole delivery fits.
        </figcaption>
      </figure>
    </section>
  )
}

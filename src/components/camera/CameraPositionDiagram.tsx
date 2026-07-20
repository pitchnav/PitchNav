// Bird's-eye technical diagram of the required open-side camera position:
// perpendicular to the pitch line, 15 feet from the rubber, lens at 6 feet.
// Restrained line-art in the brand palette — no invented measurements beyond
// what the written guide already states.
export function CameraPositionDiagram() {
  return (
    <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label="Diagram showing the camera positioned 15 feet from the pitching rubber, at a 90-degree angle to the pitch direction">
      {/* Pitch line: rubber to home plate */}
      <line x1={70} y1={110} x2={330} y2={110} stroke="rgba(148,163,184,0.4)" strokeWidth={1.5} strokeDasharray="4 4" />
      <polygon points="330,110 320,105 320,115" fill="rgba(148,163,184,0.55)" />
      <text x={200} y={98} textAnchor="middle" className="fill-slate-400" style={{ font: '600 10px Inter, sans-serif', letterSpacing: '0.08em' }}>
        PITCH DIRECTION
      </text>

      {/* Pitching rubber */}
      <rect x={58} y={106} width={24} height={8} rx={1.5} fill="#f8fafc" />
      <text x={70} y={128} textAnchor="middle" className="fill-slate-300" style={{ font: '600 9px Inter, sans-serif' }}>RUBBER</text>

      {/* Home plate */}
      <polygon points="330,104 340,104 344,110 340,116 330,116" fill="rgba(248,250,252,0.55)" />

      {/* 90-degree angle marker at the rubber */}
      <path d="M 70 110 L 70 96 L 84 96" fill="none" stroke="rgba(59,130,246,0.7)" strokeWidth={1.2} />
      <text x={88} y={94} className="fill-electric-blue-glow" style={{ font: '700 10px Inter, sans-serif' }}>90°</text>

      {/* Camera offset line: 15 feet, perpendicular to the pitch line */}
      <line x1={70} y1={110} x2={70} y2={196} stroke="#3b82f6" strokeWidth={1.5} />
      <text x={54} y={155} textAnchor="middle" className="fill-electric-blue-light" style={{ font: '700 11px Inter, sans-serif' }} transform="rotate(-90 54 155)">
        15 FT
      </text>

      {/* Camera icon */}
      <g transform="translate(70 196)">
        <ellipse cx={0} cy={14} rx={16} ry={3} fill="rgba(0,0,0,0.35)" />
        <rect x={-14} y={-10} width={28} height={18} rx={3} fill="#111827" stroke="#3b82f6" strokeWidth={1.4} />
        <circle cx={0} cy={-1} r={6} fill="#0d1629" stroke="#7dd3fc" strokeWidth={1.4} />
        <circle cx={0} cy={-1} r={2.2} fill="#38bdf8" />
        <rect x={9} y={-7} width={5} height={4} rx={1} fill="#3b82f6" />
      </g>
      <text x={70} y={218} textAnchor="middle" className="fill-slate-300" style={{ font: '600 9px Inter, sans-serif' }}>
        CAMERA · 6 FT HIGH · LENS LEVEL
      </text>
    </svg>
  )
}

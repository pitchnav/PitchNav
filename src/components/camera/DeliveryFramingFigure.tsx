import type { ThrowingHand } from './CameraPlacementGuide'

export function DeliveryFramingFigure({ hand }: { hand: ThrowingHand }) {
  const right = hand === 'right'
  const x = (position: number) => right ? position : 520 - position

  return (
    <svg viewBox="0 0 520 352" role="img" className="block w-full rounded-xl border border-[#23506a] bg-[#032639]"
      aria-label={`Side view of a ${hand}-handed pitcher at leg lift. The whole body fits inside the frame, the hands meet at the chest, the pivot foot is on the rubber, and there is space toward home plate for the landing foot.`}>
      <defs>
        <clipPath id="leg-lift-silhouette">
          <path d="M78 29Q75 2 98 2Q119 -2 125 20Q132 23 143 26L144 33L131 36L130 57L122 64Q149 70 156 99L154 150L163 179L158 205Q151 232 116 239L87 305L84 321L84 395L90 422L59 425L27 425L28 412L49 395L50 310L48 295Q30 305 6 294L7 284L27 266L35 254L27 176Q25 156 43 146L44 135Q26 152 7 152Q-2 149 3 127L17 103L13 88Q12 61 40 55Q57 53 69 69L81 63L79 44Z" />
        </clipPath>
      </defs>
      <rect x="15" y="16" width="490" height="320" rx="15" fill="none" stroke="#81d9e8" strokeWidth="1.3" strokeDasharray="4 4"/>
      <g transform={right ? undefined : 'translate(520 0) scale(-1 1)'}>
        <path d="M20 314Q180 292 339 308L500 316H20Z" fill="#9e6b3e" stroke="#d89751" strokeWidth="1"/>
        <rect x="197" y="303" width="55" height="4" rx="1" fill="#f5efe1"/>
        <g transform="translate(180 42) scale(.62)">
          <image href="/media/camera/leg-lift.webp" width="165" height="425" clipPath="url(#leg-lift-silhouette)"/>
        </g>
        <g stroke="#c2d9e1" fill="none" strokeWidth="1">
          <path d="M111 96L199 104M122 260L210 300"/>
        </g>
        <g fill="none" stroke="#5de7cd" strokeWidth="1.5">
          <path d="M427 266v29" strokeDasharray="4 4" />
          <ellipse cx="427" cy="305" rx="36" ry="6" strokeDasharray="5 4" />
        </g>
      </g>
      <g fontWeight="650" fontSize="14" textAnchor="middle" className="max-sm:[font-size:21px]">
        <g fill="#061f2c">
          <rect x={x(80) - 52} y="22" width="104" height="25" rx="4"/>
          <rect x={x(81) - 53} y="79" width="106" height="29" rx="4"/>
          <rect x={x(98) - 55} y="242" width="110" height="29" rx="4"/>
          <rect x={x(427) - 67} y="242" width="134" height="29" rx="4"/>
        </g>
        <g fill="#f3f9fa">
          <text x={x(80)} y="42">Full body</text>
          <text x={x(81)} y="100">Hands<tspan className="max-sm:hidden"> together</tspan></text>
          <text x={x(98)} y="263">Pivot foot</text>
          <text x={x(427)} y="263" fill="#85f2d8">Landing zone</text>
          <text x="260" y="332" fontSize="13" className="max-sm:[font-size:18px]">{right ? 'Toward home plate →' : '← Toward home plate'}</text>
        </g>
      </g>
    </svg>
  )
}

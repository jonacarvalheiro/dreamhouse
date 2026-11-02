import { CEILING, HEADROOM, ROOF, STR, roofHeight, type StairCalc } from '@/plan/stair'

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',')

/** Corte norte–sul pelo eixo da escada (norte à esquerda), com o telhado do sótão. */
export function StairSection({ s }: { s: StairCalc }) {
  const H = s.floorToFloor
  const top = H + ROOF.ridge + 0.35
  const Z = (z: number) => top - z
  const D = ROOF.D
  const cx = STR.x + STR.w / 2

  let profile = `M ${STR.yStart} ${Z(0)}`
  for (let k = 1; k <= s.risers; k++) {
    const y = STR.yStart - (k - 1) * s.going
    profile += ` L ${y} ${Z(k * s.riser)}`
    if (k < s.risers) profile += ` L ${y - s.going} ${Z(k * s.riser)}`
  }

  const roofPts: string[] = []
  for (let y = 0; y <= D + 1e-6; y += 0.04) roofPts.push(`${y.toFixed(2)},${Z(H + roofHeight(cx, y)).toFixed(3)}`)

  const short = s.roofAtTop < HEADROOM - 1e-3

  return (
    <svg viewBox={`-0.55 -0.1 ${D + 1.75} ${top + 0.45}`} className="h-auto w-full" role="img" aria-label="Corte pela escada">
      <defs>
        <pattern id="slab" width="0.1" height="0.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="0.1" height="0.1" fill="#e7e5e4" />
          <line x1="0" y1="0" x2="0" y2="0.1" stroke="#a8a29e" strokeWidth="0.02" />
        </pattern>
      </defs>

      <polygon points={`0,${Z(H)} ${roofPts.join(' ')} ${D},${Z(H)}`} fill="#fff7ed" stroke="none" />
      <polyline points={roofPts.join(' ')} fill="none" stroke="#c2410c" strokeWidth={0.03} strokeLinejoin="round" />
      <text x={D / 2} y={Z(H + ROOF.ridge) - 0.1} fontSize={0.2} fill="#9a3412" textAnchor="middle">
        telhado de 4 águas
      </text>
      <text x={0.08} y={Z(H + ROOF.knee / 2) + 0.06} fontSize={0.15} fill="#9a3412">
        {fmt(ROOF.knee, 3)}
      </text>

      <rect x={-0.37} y={Z(H + ROOF.knee)} width={0.37} height={H + ROOF.knee} fill="#d6d3d1" />
      <rect x={D} y={Z(H + ROOF.knee)} width={0.34} height={H + ROOF.knee} fill="#d6d3d1" />
      <text x={-0.18} y={Z(-0.22)} fontSize={0.2} textAnchor="middle" fill="#78716c">
        N
      </text>
      <text x={D + 0.17} y={Z(-0.22)} fontSize={0.2} textAnchor="middle" fill="#78716c">
        S
      </text>

      <rect x={0} y={Z(H)} width={s.yTop} height={H - CEILING} fill="url(#slab)" />
      <rect x={s.openingEnd} y={Z(H)} width={D - s.openingEnd} height={H - CEILING} fill="url(#slab)" />

      <path d={`${profile} L ${s.yTop} ${Z(Math.max(0, H - 0.25))} L ${STR.yStart - 0.3} ${Z(0)} Z`} fill="#d9e7d1" stroke="none" />
      <path d={profile} fill="none" stroke="#3f6212" strokeWidth={0.025} strokeLinejoin="round" />

      <line x1={STR.yStart} y1={Z(HEADROOM)} x2={s.yTop} y2={Z(H + HEADROOM)} stroke="#2563eb" strokeWidth={0.015} strokeDasharray="0.06 0.04" />
      <text x={(STR.yStart + s.yTop) / 2 + 0.25} y={Z(HEADROOM + H / 2) + 0.05} fontSize={0.17} fill="#2563eb">
        {fmt(HEADROOM)} m livres
      </text>

      <line x1={s.yTop} y1={Z(H)} x2={s.yTop} y2={Z(H + s.roofAtTop)} stroke={short ? '#dc2626' : '#16a34a'} strokeWidth={0.03} />
      <text x={s.yTop - 0.1} y={Z(H + s.roofAtTop / 2)} fontSize={0.18} fill={short ? '#b91c1c' : '#15803d'} textAnchor="end" fontWeight={600}>
        {fmt(s.roofAtTop)} m à chegada
      </text>

      <text x={(s.yTop + 2.97) / 2} y={Z(0.9)} fontSize={0.15} fill="#6d28d9" textAnchor="middle">
        roupeiro
      </text>
      <text x={0.9} y={Z(0.3)} fontSize={0.17} fill="#57534e" textAnchor="middle">
        Quarto 2
      </text>
      <text x={(STR.yStart + D) / 2} y={Z(0.3)} fontSize={0.15} fill="#57534e" textAnchor="middle">
        átrio
      </text>

      <line x1={-0.37} y1={Z(0)} x2={D + 0.34} y2={Z(0)} stroke="#292524" strokeWidth={0.03} />

      <g stroke="#78716c" strokeWidth={0.012}>
        <line x1={D + 0.6} y1={Z(0)} x2={D + 0.6} y2={Z(H)} />
        <line x1={D + 0.53} y1={Z(H)} x2={D + 0.67} y2={Z(H)} />
        <line x1={D + 0.53} y1={Z(0)} x2={D + 0.67} y2={Z(0)} />
      </g>
      <text x={D + 0.8} y={Z(H / 2)} fontSize={0.2} fill="#57534e" transform={`rotate(-90 ${D + 0.8} ${Z(H / 2)})`} textAnchor="middle">
        {fmt(H)} m
      </text>
    </svg>
  )
}

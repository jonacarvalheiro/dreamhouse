import { FloorPlan, Label } from '@/components/FloorPlan'
import type { Plan } from '@/plan/types'
import type { Line, Mark, Zone } from '@/works/trades'

const noHover = () => {}

/** Planta mobilada com os pontos de um ofício por cima (círculos numerados ou com o código do símbolo). */
export function TradePlan({ plan, flip, marks, lines = [], zones = [] }: { plan: Plan; flip?: boolean; marks: Mark[]; lines?: Line[]; zones?: Zone[] }) {
  return (
    <FloorPlan plan={plan} flip={flip} showFurniture showDims={false} showWorks={false} showContext={false} hovered={null} onHover={noHover}>
      <g pointerEvents="none">
        {zones.map((r, i) => (
          <rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} fillOpacity={0.08} stroke={r.color} strokeWidth={0.015} strokeDasharray="0.06 0.04" />
        ))}
        {lines.map((l, i) => (
          <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={0.06} strokeLinecap="round" />
        ))}
        {marks.map((k, i) => (
          <g key={`m${i}`}>
            <circle cx={k.x} cy={k.y} r={0.11} fill={k.ghost ? 'white' : k.color} stroke={k.color} strokeWidth={0.02} strokeDasharray={k.ghost ? '0.04 0.03' : undefined} />
            <Label x={k.x} y={k.y + 0.045} textAnchor="middle" fontSize={k.code.length > 1 ? 0.1 : 0.13} fontWeight={700} fill={k.ghost ? k.color : 'white'}>
              {k.code}
            </Label>
          </g>
        ))}
      </g>
    </FloorPlan>
  )
}

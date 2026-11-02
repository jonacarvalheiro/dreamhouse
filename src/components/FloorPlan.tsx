import { createContext, useContext, useId, type ReactNode, type SVGProps } from 'react'
import { CONTEXT_BOTTOM, D, GLASS_BLOCK, T_S, W, contextWalls } from '@/plan/common'
import type { Dir, Door, Furniture, LStair, Plan, Rect, Room, RoomTone, StraightStair, Wall, Window } from '@/plan/types'
import { winderRisers } from '@/plan/winders'

const toneFill: Record<RoomTone, string> = {
  bed: '#f5ecdc',
  bath: '#dcebf3',
  closet: '#ebe4f4',
  circ: '#f1f0ec',
  stair: '#e3ecdf',
  living: '#efe9e1',
  service: '#ecebe6',
}
const toneHover: Record<RoomTone, string> = {
  bed: '#ecd9b8',
  bath: '#bcdaea',
  closet: '#d9cbee',
  circ: '#e2e0d8',
  stair: '#cadcc2',
  living: '#e2d6c6',
  service: '#dcdad2',
}

const vec: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }
const fmt = (v: number) => v.toFixed(2).replace('.', ',')

/** Planta rodada 180° (norte para baixo, entrada em baixo). */
const Flip = createContext(false)

/** Com a planta rodada, roda 180° à volta de (x, y) o que tem dentro, para os textos ficarem direitos e no mesmo sítio. */
function Upright({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return useContext(Flip) ? <g transform={`rotate(180 ${x} ${y})`}>{children}</g> : <>{children}</>
}

type LabelProps = Omit<SVGProps<SVGTextElement>, 'x' | 'y' | 'fontSize'> & { x: number; y: number; fontSize: number }

/** Texto da planta que continua direito quando a planta está rodada (roda à volta do centro das letras, ~0,35 em acima da linha de base). */
export function Label({ x, y, fontSize, textAnchor, transform, ...rest }: LabelProps) {
  if (!useContext(Flip)) return <text x={x} y={y} fontSize={fontSize} textAnchor={textAnchor} transform={transform} {...rest} />
  const upright = `rotate(180 ${x} ${y - 0.35 * fontSize})`
  const anchor = textAnchor === 'middle' ? 'middle' : textAnchor === 'end' ? 'start' : 'end'
  return <text x={x} y={y} fontSize={fontSize} textAnchor={anchor} transform={transform ? `${transform} ${upright}` : upright} {...rest} />
}

type Props = {
  plan: Plan
  showFurniture: boolean
  showDims: boolean
  showWorks: boolean
  showContext?: boolean
  hovered: string | null
  onHover: (id: string | null) => void
  compact?: boolean
  /** Roda a planta 180° para a entrada ficar em baixo (o norte aponta para baixo). */
  flip?: boolean
  /** Desenho extra por cima da planta, nas mesmas coordenadas (roda com ela). */
  children?: ReactNode
}

export function FloorPlan({ plan, showFurniture, showDims, showWorks, showContext = true, hovered, onHover, compact, flip = false, children }: Props) {
  const uid = useId().replace(/:/g, '')
  const bottom = showContext ? CONTEXT_BOTTOM + 0.2 : D + T_S + 0.5
  const box = { x: -1.35, y: -1.45, w: W + 2.9, h: bottom + 1.45 }
  const turn = flip ? `rotate(180 ${box.x + box.w / 2} ${box.y + box.h / 2})` : undefined

  return (
    <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="h-auto w-full select-none" role="img" aria-label={flip ? 'Planta (entrada em baixo)' : 'Planta'}>
      <defs>
        <pattern id={`hatch-${uid}`} width="0.08" height="0.08" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="0.08" height="0.08" fill="#fde7d4" />
          <line x1="0" y1="0" x2="0" y2="0.08" stroke="#ea580c" strokeWidth="0.025" />
        </pattern>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#3f6212" />
        </marker>
      </defs>

      <Flip.Provider value={flip}>
        <g transform={turn}>
          {showContext && <Context uid={uid} />}

          {plan.rooms.map((room) => (
            <RoomShape key={room.id} room={room} active={hovered === room.id} onHover={onHover} />
          ))}

          {plan.ceilingOpenings && plan.ceilingOpenings.length > 0 && (
            <path
              d={openingOutline(plan.ceilingOpenings)}
              fill="none"
              stroke="#65a30d"
              strokeWidth={0.02}
              strokeDasharray="0.02 0.06"
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}

          {showFurniture && plan.furniture.map((f, i) => <FurnitureShape key={i} f={f} />)}

          {plan.stair && (plan.stair.kind === 'l' ? <LStairShape stair={plan.stair} uid={uid} /> : <StairShape stair={plan.stair} uid={uid} />)}

          {plan.walls.map((w, i) => (
            <WallShape key={i} wall={w} showWorks={showWorks} uid={uid} />
          ))}

          {plan.windows.map((w, i) => (
            <WindowShape key={i} win={w} />
          ))}

          {plan.doors.map((d, i) => (
            <DoorShape key={i} door={d} />
          ))}

          {plan.rooms.map((room) => (
            <RoomLabel key={room.id} room={room} showDims={showDims} compact={compact} />
          ))}

          {showDims && plan.dimensions?.map((d, i) => <DimLine key={i} {...d} />)}

          {children}
        </g>
      </Flip.Provider>

      <NorthArrow x={W + (flip ? 1.0 : 0.85)} y={-0.95} down={flip} />
      <ScaleBar x={-0.36} y={bottom - 0.05} />
    </svg>
  )
}

function Context({ uid }: { uid: string }) {
  const y0 = D + T_S
  return (
    <g pointerEvents="none">
      <rect x={0} y={y0} width={2.88} height={CONTEXT_BOTTOM - y0} fill="#f4f4f2" />
      <rect x={3.12} y={y0} width={1.94} height={CONTEXT_BOTTOM - y0} fill="#f4f4f2" />
      {contextWalls.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} fill="#a3a3a3" />
      ))}
      <rect x={5.06} y={7.15} width={0.34} height={0.89} fill="white" />
      <line x1={5.4} y1={7.15} x2={5.4} y2={8.04} stroke="#a3a3a3" strokeWidth={0.02} />
      <Label x={1.44} y={7.55} textAnchor="middle" fontSize={0.2} fill="#8a8a8a" fontWeight={500}>
        Cozinha
      </Label>
      <Label x={4.09} y={7.75} textAnchor="middle" fontSize={0.2} fill="#8a8a8a" fontWeight={500}>
        Hall
      </Label>
      <Label x={5.62} y={7.65} fontSize={0.16} fill="#8a8a8a">
        E2 · entrada
      </Label>
      <rect x={-0.5} y={CONTEXT_BOTTOM - 1.1} width={6.2} height={1.2} fill={`url(#fade-${uid})`} />
    </g>
  )
}

function RoomShape({ room, active, onHover }: { room: Room; active: boolean; onHover: (id: string | null) => void }) {
  return (
    <g
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(room.id)}
      className="cursor-pointer"
    >
      {room.rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={active ? toneHover[room.tone] : toneFill[room.tone]}
          style={{ transition: 'fill 150ms' }}
        />
      ))}
    </g>
  )
}

function RoomLabel({ room, showDims, compact }: { room: Room; showDims: boolean; compact?: boolean }) {
  const { x, y } = room.label
  const big = room.tone === 'bed' || room.tone === 'living'
  const fs = big ? 0.24 : 0.17
  const small = ['escada', 'hall', 'arrumos', 'atrio'].includes(room.id)
  const nameFs = small ? 0.14 : fs
  const name = { fontWeight: 600, fill: '#1c1917', stroke: 'white', strokeWidth: 0.05, paintOrder: 'stroke' } as const
  if (room.id === 'escada')
    return (
      <g pointerEvents="none">
        <Label x={x} y={y} textAnchor="middle" fontSize={nameFs} transform={`rotate(-90 ${x} ${y})`} {...name}>
          {room.name}
        </Label>
      </g>
    )
  const areaY = y + (small ? 0.2 : fs + 0.04)
  const dimsY = y + fs + 0.25
  const withDims = showDims && !compact && room.dims && !small && room.id !== 'closet' && room.id !== 'quarto2'
  const top = y - 0.7 * nameFs
  return (
    <g pointerEvents="none">
      <Upright x={x} y={(top + (withDims ? dimsY : areaY)) / 2}>
        <text x={x} y={y} textAnchor="middle" fontSize={nameFs} {...name}>
          {room.name}
        </text>
        <text x={x} y={areaY} textAnchor="middle" fontSize={small ? 0.13 : 0.16} fill="#57534e" stroke="white" strokeWidth={0.04} paintOrder="stroke">
          {fmt(room.area)} m²
        </text>
        {withDims && (
          <text x={x} y={dimsY} textAnchor="middle" fontSize={0.12} fill="#78716c" stroke="white" strokeWidth={0.03} paintOrder="stroke">
            {room.dims}
          </text>
        )}
      </Upright>
    </g>
  )
}

function WallShape({ wall, showWorks, uid }: { wall: Wall; showWorks: boolean; uid: string }) {
  const { x, y, w, h, kind } = wall
  if (wall.glassBlock) {
    const horizontal = w >= h
    const n = Math.round((horizontal ? w : h) / GLASS_BLOCK.module)
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#e0f2fe" stroke={showWorks ? '#ea580c' : '#0284c7'} strokeWidth={0.012} />
        {Array.from({ length: n - 1 }, (_, i) => {
          const t = (i + 1) * GLASS_BLOCK.module
          return horizontal ? (
            <line key={i} x1={x + t} y1={y} x2={x + t} y2={y + h} stroke="#0284c7" strokeWidth={0.008} />
          ) : (
            <line key={i} x1={x} y1={y + t} x2={x + w} y2={y + t} stroke="#0284c7" strokeWidth={0.008} />
          )
        })}
      </g>
    )
  }
  if (wall.overhead) {
    return <rect x={x} y={y} width={w} height={h} fill="white" fillOpacity={0.5} stroke={showWorks ? '#ea580c' : '#57534e'} strokeWidth={0.015} strokeDasharray="0.06 0.04" />
  }
  if (wall.low) {
    return <rect x={x} y={y} width={w} height={h} fill={showWorks ? '#fdba74' : '#a8a29e'} stroke={showWorks ? '#ea580c' : '#57534e'} strokeWidth={0.012} />
  }
  if (kind === 'demolish') {
    if (!showWorks) return null
    return <rect x={x} y={y} width={w} height={h} fill="#fee2e2" fillOpacity={0.6} stroke="#dc2626" strokeWidth={0.02} strokeDasharray="0.06 0.04" />
  }
  if (kind === 'new') {
    return <rect x={x} y={y} width={w} height={h} fill={showWorks ? '#ea580c' : '#292524'} />
  }
  if (kind === 'infill') {
    return <rect x={x} y={y} width={w} height={h} fill={showWorks ? `url(#hatch-${uid})` : '#292524'} stroke={showWorks ? '#ea580c' : 'none'} strokeWidth={0.015} />
  }
  return <rect x={x} y={y} width={w} height={h} fill="#292524" />
}

function WindowShape({ win }: { win: Window }) {
  const { x, y, w, h, orientation, kind = 'existing' } = win
  const color = kind === 'existing' ? '#0ea5e9' : kind === 'new' ? '#ea580c' : '#94a3b8'
  const dash = kind === 'optional' ? '0.05 0.04' : undefined
  if (orientation === 'h') {
    const m = y + h / 2
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="white" stroke={color} strokeWidth={0.015} strokeDasharray={dash} />
        <line x1={x} y1={m - 0.04} x2={x + w} y2={m - 0.04} stroke={color} strokeWidth={0.015} strokeDasharray={dash} />
        <line x1={x} y1={m + 0.04} x2={x + w} y2={m + 0.04} stroke={color} strokeWidth={0.015} strokeDasharray={dash} />
      </g>
    )
  }
  const m = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="white" stroke={color} strokeWidth={0.015} strokeDasharray={dash} />
      <line x1={m - 0.04} y1={y} x2={m - 0.04} y2={y + h} stroke={color} strokeWidth={0.015} strokeDasharray={dash} />
      <line x1={m + 0.04} y1={y} x2={m + 0.04} y2={y + h} stroke={color} strokeWidth={0.015} strokeDasharray={dash} />
    </g>
  )
}

function DoorShape({ door }: { door: Door }) {
  if (door.type === 'swing') {
    const [ax, ay] = vec[door.along]
    const [ix, iy] = vec[door.into]
    const { x: hx, y: hy } = door.hinge
    const cx = hx + ax * door.width
    const cy = hy + ay * door.width
    const ox = hx + ix * door.width
    const oy = hy + iy * door.width
    const sweep = ax * iy - ay * ix > 0 ? 1 : 0
    return (
      <g pointerEvents="none">
        <line x1={hx} y1={hy} x2={ox} y2={oy} stroke="#292524" strokeWidth={0.03} />
        <path d={`M ${cx} ${cy} A ${door.width} ${door.width} 0 0 ${sweep} ${ox} ${oy}`} fill="none" stroke="#78716c" strokeWidth={0.012} strokeDasharray="0.04 0.03" />
      </g>
    )
  }
  if (door.type === 'sliding') {
    const { x, y, length, orientation } = door
    if (door.pocket) {
      const pocket = { stroke: 'white', strokeWidth: 0.014, strokeDasharray: '0.05 0.03' }
      return orientation === 'v' ? (
        <g pointerEvents="none">
          <line x1={x} y1={y - length + 0.03} x2={x} y2={y} {...pocket} />
          <line x1={x} y1={y} x2={x} y2={y + length} stroke="#292524" strokeWidth={0.03} />
        </g>
      ) : (
        <g pointerEvents="none">
          <line x1={x - length + 0.03} y1={y} x2={x} y2={y} {...pocket} />
          <line x1={x} y1={y} x2={x + length} y2={y} stroke="#292524" strokeWidth={0.03} />
        </g>
      )
    }
    return orientation === 'v' ? (
      <g pointerEvents="none">
        <line x1={x - 0.025} y1={y} x2={x - 0.025} y2={y + length * 0.6} stroke="#292524" strokeWidth={0.03} />
        <line x1={x + 0.025} y1={y + length * 0.4} x2={x + 0.025} y2={y + length} stroke="#292524" strokeWidth={0.03} />
      </g>
    ) : (
      <g pointerEvents="none">
        <line x1={x} y1={y - 0.025} x2={x + length * 0.6} y2={y - 0.025} stroke="#292524" strokeWidth={0.03} />
        <line x1={x + length * 0.4} y1={y + 0.025} x2={x + length} y2={y + 0.025} stroke="#292524" strokeWidth={0.03} />
      </g>
    )
  }
  return null
}

function FurnitureShape({ f }: { f: Furniture }) {
  const stroke = '#a8a29e'
  const common = { stroke, strokeWidth: 0.012, pointerEvents: 'none' as const }
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  const label = f.label ? (
    <Label x={cx} y={cy + 0.04} textAnchor="middle" fontSize={0.11} fill="#78716c" pointerEvents="none">
      {f.label}
    </Label>
  ) : null

  switch (f.kind) {
    case 'bed': {
      const headW = f.w > f.h
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.04} fill="white" {...common} />
          {headW ? (
            <>
              <rect x={f.headEast ? f.x + f.w - 0.41 : f.x + 0.06} y={f.y + 0.08} width={0.35} height={f.h / 2 - 0.12} rx={0.05} fill="#fafaf9" {...common} />
              <rect x={f.headEast ? f.x + f.w - 0.41 : f.x + 0.06} y={f.y + f.h / 2 + 0.04} width={0.35} height={f.h / 2 - 0.12} rx={0.05} fill="#fafaf9" {...common} />
              <line x1={f.headEast ? f.x + f.w - 0.55 : f.x + 0.55} y1={f.y} x2={f.headEast ? f.x + f.w - 0.55 : f.x + 0.55} y2={f.y + f.h} {...common} />
            </>
          ) : (
            <>
              <rect x={f.x + 0.08} y={f.headSouth ? f.y + f.h - 0.41 : f.y + 0.06} width={f.w / 2 - 0.12} height={0.35} rx={0.05} fill="#fafaf9" {...common} />
              <rect x={f.x + f.w / 2 + 0.04} y={f.headSouth ? f.y + f.h - 0.41 : f.y + 0.06} width={f.w / 2 - 0.12} height={0.35} rx={0.05} fill="#fafaf9" {...common} />
              <line x1={f.x} y1={f.headSouth ? f.y + f.h - 0.55 : f.y + 0.55} x2={f.x + f.w} y2={f.headSouth ? f.y + f.h - 0.55 : f.y + 0.55} {...common} />
            </>
          )}
          <Label x={headW ? (f.headEast ? f.x + f.w - 1.25 : f.x + 1.25) : cx} y={headW ? cy + 0.04 : f.headSouth ? f.y + f.h - 1.25 : f.y + 1.3} textAnchor="middle" fontSize={0.11} fill="#78716c" pointerEvents="none">
            {f.label}
          </Label>
        </g>
      )
    }
    case 'wardrobe':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fafaf9" {...common} />
          {f.w > f.h ? (
            <line x1={f.x} y1={f.y + f.h / 2} x2={f.x + f.w} y2={f.y + f.h / 2} {...common} strokeDasharray="0.05 0.03" />
          ) : (
            <line x1={f.x + f.w / 2} y1={f.y} x2={f.x + f.w / 2} y2={f.y + f.h} {...common} strokeDasharray="0.05 0.03" />
          )}
          {f.label && (
            <Label
              x={cx}
              y={cy + 0.04}
              textAnchor="middle"
              fontSize={0.1}
              fill="#78716c"
              pointerEvents="none"
              transform={f.h > f.w * 1.6 ? `rotate(-90 ${cx} ${cy})` : undefined}
              stroke="#fafaf9"
              strokeWidth={0.03}
              paintOrder="stroke"
            >
              {f.label}
            </Label>
          )}
        </g>
      )
    case 'shower':
      if (f.walkIn) {
        const drainH = f.w >= f.h
        return (
          <g>
            <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#f0f9ff" {...common} strokeDasharray="0.05 0.03" />
            {drainH ? (
              <line x1={f.x + 0.1} y1={f.y + 0.08} x2={f.x + f.w - 0.1} y2={f.y + 0.08} stroke="#57534e" strokeWidth={0.03} />
            ) : (
              <line x1={f.x + f.w - 0.08} y1={f.y + 0.1} x2={f.x + f.w - 0.08} y2={f.y + f.h - 0.1} stroke="#57534e" strokeWidth={0.03} />
            )}
          </g>
        )
      }
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#f0f9ff" {...common} />
          <line x1={f.x} y1={f.y} x2={f.x + f.w} y2={f.y + f.h} {...common} />
          <line x1={f.x + f.w} y1={f.y} x2={f.x} y2={f.y + f.h} {...common} />
          <circle cx={cx} cy={cy} r={0.05} fill="white" {...common} />
        </g>
      )
    case 'toilet': {
      const back = f.back ?? (f.y < 0.05 ? 'n' : 's')
      if (back === 'w' || back === 'e') {
        const tankX = back === 'e' ? f.x + f.w - 0.18 : f.x
        const bowlCx = back === 'e' ? f.x + 0.24 : f.x + f.w - 0.24
        return (
          <g>
            <rect x={tankX} y={f.y} width={0.18} height={f.h} rx={0.03} fill="white" {...common} />
            <ellipse cx={bowlCx} cy={cy} rx={0.24} ry={f.h / 2 - 0.02} fill="white" {...common} />
          </g>
        )
      }
      const tankY = back === 's' ? f.y + f.h - 0.18 : f.y
      const bowlCy = back === 's' ? f.y + 0.24 : f.y + f.h - 0.24
      return (
        <g>
          <rect x={f.x} y={tankY} width={f.w} height={0.18} rx={0.03} fill="white" {...common} />
          <ellipse cx={cx} cy={bowlCy} rx={f.w / 2 - 0.02} ry={0.24} fill="white" {...common} />
        </g>
      )
    }
    case 'sink':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="white" {...common} />
          <ellipse cx={cx} cy={cy} rx={Math.min(f.w, f.h) * 0.35} ry={Math.min(f.w, f.h) * 0.28} fill="#f0f9ff" {...common} />
        </g>
      )
    case 'washer':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="white" {...common} />
          <circle cx={cx} cy={cy} r={f.w * 0.3} fill="none" {...common} />
        </g>
      )
    case 'shelves':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fafaf9" {...common} strokeDasharray="0.04 0.03" />
          {f.w > f.h ? (
            <line x1={f.x} y1={f.y + f.h} x2={f.x + f.w} y2={f.y + f.h} {...common} />
          ) : (
            <line x1={f.x + f.w} y1={f.y} x2={f.x + f.w} y2={f.y + f.h} {...common} />
          )}
        </g>
      )
    default:
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.03} fill="white" {...common} />
          {label}
        </g>
      )
  }
}

/** Contorno exterior de um conjunto de retângulos que se tocam (arestas partilhadas são omitidas). */
function openingOutline(rects: Rect[]) {
  const segs: string[] = []
  const eps = 1e-6
  const covered = (px: number, py: number) => rects.some((r) => px > r.x + eps && px < r.x + r.w - eps && py > r.y + eps && py < r.y + r.h - eps)
  for (const r of rects) {
    if (r.w <= 0 || r.h <= 0) continue
    const edges: [number, number, number, number, number, number][] = [
      [r.x, r.y, r.x + r.w, r.y, 0, -1],
      [r.x + r.w, r.y, r.x + r.w, r.y + r.h, 1, 0],
      [r.x, r.y + r.h, r.x + r.w, r.y + r.h, 0, 1],
      [r.x, r.y, r.x, r.y + r.h, -1, 0],
    ]
    for (const [x1, y1, x2, y2, nx, ny] of edges) {
      const n = 50
      for (let i = 0; i < n; i++) {
        const a = i / n
        const b = (i + 1) / n
        const m = (a + b) / 2
        if (covered(x1 + (x2 - x1) * m + nx * 0.01, y1 + (y2 - y1) * m + ny * 0.01)) continue
        segs.push(`M ${x1 + (x2 - x1) * a} ${y1 + (y2 - y1) * a} L ${x1 + (x2 - x1) * b} ${y1 + (y2 - y1) * b}`)
      }
    }
  }
  return segs.join(' ')
}

function LStairShape({ stair, uid }: { stair: LStair; uid: string }) {
  const { w, bandY, flight1: f, landing, treads1, treads2, going, xTop, cutAt } = stair
  const bandEnd = bandY + w
  const cy = bandY + w / 2
  const cutX = w + cutAt * going + going / 2
  const north = f.dir === 'n'
  const fan = north ? (stair.winders ?? 0) : 0
  const inner = { x: landing.x + landing.w, y: landing.y + landing.h }
  const start = north ? f.y + f.h : f.x + f.w
  const lines = []
  for (let k = 0; k <= treads1; k++) {
    const p = start - k * going
    lines.push(
      north ? (
        <line key={`a${k}`} x1={f.x} y1={p} x2={f.x + f.w} y2={p} stroke="#3f6212" strokeWidth={0.018} />
      ) : (
        <line key={`a${k}`} x1={p} y1={f.y} x2={p} y2={f.y + f.h} stroke="#3f6212" strokeWidth={0.018} />
      ),
    )
  }
  for (let k = 0; k <= treads2; k++) {
    const x = w + k * going
    const above = x > cutX
    lines.push(
      <line
        key={`b${k}`}
        x1={x}
        y1={bandY}
        x2={x}
        y2={bandEnd}
        stroke={above ? '#65a30d' : '#3f6212'}
        strokeWidth={above ? 0.012 : 0.018}
        strokeDasharray={above ? '0.05 0.04' : undefined}
      />,
    )
  }
  if (fan)
    winderRisers(landing, fan).forEach((e, j) =>
      lines.push(<line key={`w${j}`} x1={inner.x} y1={inner.y} x2={e.x} y2={e.y} stroke="#3f6212" strokeWidth={0.018} />),
    )
  const s0 = north ? { x: f.x + f.w / 2, y: start - 0.12 } : { x: start - 0.12, y: f.y + f.h / 2 }
  const arrow = fan
    ? `M ${s0.x} ${s0.y} L ${s0.x} ${inner.y} A ${w / 2} ${w / 2} 0 0 1 ${inner.x} ${cy} L ${xTop - 0.15} ${cy}`
    : north
      ? `M ${s0.x} ${s0.y} L ${s0.x} ${cy} L ${xTop - 0.15} ${cy}`
      : `M ${s0.x} ${s0.y} L ${landing.x + landing.w / 2} ${s0.y} L ${landing.x + landing.w / 2} ${cy} L ${xTop - 0.15} ${cy}`
  return (
    <g pointerEvents="none">
      <rect x={landing.x} y={landing.y} width={landing.w} height={landing.h} fill="none" stroke="#3f6212" strokeWidth={0.015} />
      <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="none" stroke="#3f6212" strokeWidth={0.015} />
      <path d={`M ${w} ${bandY} L ${cutX} ${bandY} M ${cutX} ${bandEnd} L ${w} ${bandEnd}`} fill="none" stroke="#3f6212" strokeWidth={0.015} />
      <path
        d={`M ${cutX} ${bandY} L ${xTop} ${bandY} L ${xTop} ${bandEnd} L ${cutX} ${bandEnd}`}
        fill="none"
        stroke="#65a30d"
        strokeWidth={0.012}
        strokeDasharray="0.05 0.04"
      />
      {lines}
      <path
        d={`M ${cutX - 0.12} ${bandY} L ${cutX - 0.12} ${cy - 0.12} L ${cutX + 0.08} ${cy - 0.04} L ${cutX - 0.08} ${cy + 0.04} L ${cutX + 0.12} ${cy + 0.12} L ${cutX + 0.12} ${bandEnd}`}
        fill="none"
        stroke="#3f6212"
        strokeWidth={0.015}
      />
      <circle cx={s0.x} cy={s0.y} r={0.05} fill="#3f6212" />
      <path d={arrow} fill="none" stroke="#3f6212" strokeWidth={0.02} markerEnd={`url(#arrow-${uid})`} />
      {north ? (
        <Label x={s0.x + 0.3} y={start - 0.32} fontSize={0.13} fill="#3f6212" fontWeight={700} textAnchor="middle" transform={`rotate(-90 ${s0.x + 0.3} ${start - 0.32})`}>
          SOBE
        </Label>
      ) : (
        <Label x={start - 0.4} y={s0.y + 0.28} fontSize={0.13} fill="#3f6212" fontWeight={700} textAnchor="middle">
          SOBE
        </Label>
      )}
      <Label x={landing.x + landing.w / 2} y={bandY + 0.2} fontSize={0.11} fill="#3f6212" textAnchor="middle" stroke="white" strokeWidth={0.03} paintOrder="stroke">
        {fan ? 'leque' : 'patamar'}
      </Label>
    </g>
  )
}

function StairShape({ stair, uid }: { stair: StraightStair; uid: string }) {
  const bottom = stair.topY + stair.treads * stair.going
  const x0 = stair.x
  const x1 = stair.x + stair.w
  const cx = (x0 + x1) / 2
  const cutY = bottom - stair.cutAt * stair.going - stair.going / 2
  const lines = []
  for (let k = 0; k <= stair.treads; k++) {
    const y = bottom - k * stair.going
    const above = y < cutY
    lines.push(
      <line
        key={k}
        x1={x0}
        y1={y}
        x2={x1}
        y2={y}
        stroke={above ? '#65a30d' : '#3f6212'}
        strokeWidth={above ? 0.012 : 0.018}
        strokeDasharray={above ? '0.05 0.04' : undefined}
      />,
    )
  }
  return (
    <g pointerEvents="none">
      <rect x={x0} y={stair.topY} width={stair.w} height={bottom - stair.topY} fill="none" stroke="#3f6212" strokeWidth={0.015} />
      {lines}
      <path
        d={`M ${x0} ${cutY + 0.12} L ${cx - 0.12} ${cutY + 0.12} L ${cx - 0.04} ${cutY - 0.08} L ${cx + 0.04} ${cutY + 0.08} L ${cx + 0.12} ${cutY - 0.12} L ${x1} ${cutY - 0.12}`}
        fill="none"
        stroke="#3f6212"
        strokeWidth={0.015}
      />
      <circle cx={cx} cy={bottom - 0.12} r={0.05} fill="#3f6212" />
      <line x1={cx} y1={bottom - 0.12} x2={cx} y2={stair.topY + 0.15} stroke="#3f6212" strokeWidth={0.02} markerEnd={`url(#arrow-${uid})`} />
      <Label x={cx + 0.32} y={bottom - 0.35} fontSize={0.13} fill="#3f6212" fontWeight={700} textAnchor="middle" transform={`rotate(-90 ${cx + 0.32} ${bottom - 0.35})`}>
        SOBE
      </Label>
    </g>
  )
}

function DimLine({ x1, y1, x2, y2, text }: { x1: number; y1: number; x2: number; y2: number; text?: string }) {
  const horizontal = Math.abs(y1 - y2) < 1e-6
  const len = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1)
  const label = text ?? fmt(len)
  const tick = 0.07
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g pointerEvents="none" stroke="#78716c" strokeWidth={0.012}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {horizontal ? (
        <>
          <line x1={x1 - tick} y1={y1 + tick} x2={x1 + tick} y2={y1 - tick} />
          <line x1={x2 - tick} y1={y2 + tick} x2={x2 + tick} y2={y2 - tick} />
          <Label x={mx} y={my - 0.08} textAnchor="middle" fontSize={0.15} fill="#57534e" stroke="none">
            {label}
          </Label>
        </>
      ) : (
        <>
          <line x1={x1 - tick} y1={y1 + tick} x2={x1 + tick} y2={y1 - tick} />
          <line x1={x2 - tick} y1={y2 + tick} x2={x2 + tick} y2={y2 - tick} />
          <Label x={mx - 0.08} y={my} textAnchor="middle" fontSize={0.15} fill="#57534e" stroke="none" transform={`rotate(-90 ${mx - 0.08} ${my})`}>
            {label}
          </Label>
        </>
      )}
    </g>
  )
}

function NorthArrow({ x, y, down }: { x: number; y: number; down?: boolean }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={0.28} fill="white" stroke="#a8a29e" strokeWidth={0.015} />
      <path
        d={`M ${x} ${y - 0.22} L ${x + 0.1} ${y + 0.12} L ${x} ${y + 0.05} L ${x - 0.1} ${y + 0.12} Z`}
        fill="#292524"
        transform={down ? `rotate(180 ${x} ${y})` : undefined}
      />
      <text x={x} y={down ? y + 0.45 : y - 0.34} textAnchor="middle" fontSize={0.15} fontWeight={700} fill="#292524">
        N
      </text>
    </g>
  )
}

function ScaleBar({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + i} y={y - 0.08} width={1} height={0.08} fill={i % 2 ? 'white' : '#292524'} stroke="#292524" strokeWidth={0.01} />
      ))}
      <text x={x} y={y - 0.14} fontSize={0.12} fill="#57534e">
        0
      </text>
      <text x={x + 3} y={y - 0.14} fontSize={0.12} fill="#57534e" textAnchor="middle">
        3 m
      </text>
    </g>
  )
}

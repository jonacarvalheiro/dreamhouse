import { GLASS_BLOCK } from '@/plan/common'
import type { Door, Furniture, Plan, Rect, Room } from '@/plan/types'

/** Grelha de 1 cm: chega para somar perímetros e troços de parede de divisões em L sem casos especiais. */
const CELL = 0.01
export const DOOR_H = 2.0
/** Alturas das janelas atuais acima do pavimento acabado (iguais às do 3D). */
const WINDOW = { sill: 0.975, head: 2.02 }
export const LAMBRIM = 1.2

type Side = 'n' | 's' | 'e' | 'w'
type Inside = (x: number, y: number) => boolean

export type RoomQuantities = {
  floor: number
  height: number
  perimeter: number
  /** Paredes sem vãos e sem as do duche. */
  wallsNet: number
  /** Paredes até 1,20 m, sem vãos e sem as do duche. */
  lambrim: number
  shower?: {
    /** Troços do duche encostados a parede, do maior para o menor. */
    sides: number[]
    walls: number
  }
  /** Comprimento da parede onde encosta a cabeceira da cama. */
  headWall?: number
  /** Largura das portas que abrem nessa parede. */
  headDoors?: number
  /** Janelas que dão luz natural a esta divisão. */
  windows: { label: string; width: number; sill: number; head: number }[]
  /** Divisórias de blocos de vidro dentro da divisão. */
  glassBlocks: { length: number; blocks: number }[]
}

function grid(rects: Rect[]) {
  const xs = rects.flatMap((r) => [r.x, r.x + r.w])
  const ys = rects.flatMap((r) => [r.y, r.y + r.h])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  const nx = Math.round((Math.max(...xs) - x0) / CELL)
  const ny = Math.round((Math.max(...ys) - y0) / CELL)
  const cells = new Uint8Array(nx * ny)
  for (const r of rects) {
    const i0 = Math.round((r.x - x0) / CELL)
    const i1 = Math.round((r.x + r.w - x0) / CELL)
    const j0 = Math.round((r.y - y0) / CELL)
    const j1 = Math.round((r.y + r.h - y0) / CELL)
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) cells[j * nx + i] = 1
  }
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < nx && j < ny && cells[j * nx + i] === 1
  const inside: Inside = (x, y) => at(Math.floor((x - x0) / CELL), Math.floor((y - y0) / CELL))
  let edges = 0
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      if (!at(i, j)) continue
      edges += Number(!at(i - 1, j)) + Number(!at(i + 1, j)) + Number(!at(i, j - 1)) + Number(!at(i, j + 1))
    }
  return { inside, perimeter: edges * CELL }
}

/** É limite da divisão no ponto t da linha c: dentro de um lado, fora do outro. */
function onBoundary(inside: Inside, side: Side, c: number, t: number) {
  const d = 0.02
  if (side === 'n') return inside(t, c + d) && !inside(t, c - d)
  if (side === 's') return inside(t, c - d) && !inside(t, c + d)
  if (side === 'w') return inside(c + d, t) && !inside(c - d, t)
  return inside(c - d, t) && !inside(c + d, t)
}

/** Comprimento do segmento [a, b] da linha c que é parede da divisão. */
function boundaryRun(inside: Inside, side: Side, c: number, a: number, b: number) {
  const steps = Math.max(1, Math.round((b - a) / CELL))
  let n = 0
  for (let k = 0; k < steps; k++) if (onBoundary(inside, side, c, a + (k + 0.5) * ((b - a) / steps))) n++
  return n * ((b - a) / steps)
}

/** Troço contínuo de parede que passa por t. */
function wallThrough(inside: Inside, side: Side, c: number, t: number) {
  if (!onBoundary(inside, side, c, t)) return 0
  let a = t
  let b = t
  while (onBoundary(inside, side, c, a - CELL)) a -= CELL
  while (onBoundary(inside, side, c, b + CELL)) b += CELL
  return b - a + CELL
}

/** Um vão conta para a divisão se tocar o seu limite por dentro. */
function touches(inside: Inside, r: Rect) {
  const pad = 0.06
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 8; j++) if (inside(r.x - pad + ((r.w + 2 * pad) * i) / 8, r.y - pad + ((r.h + 2 * pad) * j) / 8)) return true
  return false
}

function doorRect(d: Door): { r: Rect; width: number } {
  if (d.type === 'swing') {
    const { hinge: h, width, along } = d
    if (along === 'n') return { r: { x: h.x - 0.02, y: h.y - width, w: 0.04, h: width }, width }
    if (along === 's') return { r: { x: h.x - 0.02, y: h.y, w: 0.04, h: width }, width }
    if (along === 'e') return { r: { x: h.x, y: h.y - 0.02, w: width, h: 0.04 }, width }
    return { r: { x: h.x - width, y: h.y - 0.02, w: width, h: 0.04 }, width }
  }
  const r = d.orientation === 'h' ? { x: d.x, y: d.y - 0.02, w: d.length, h: 0.04 } : { x: d.x - 0.02, y: d.y, w: 0.04, h: d.length }
  return { r, width: d.length }
}

const inRoom = (inside: Inside, f: Furniture) => inside(f.x + f.w / 2, f.y + f.h / 2)

export function roomQuantities(plan: Plan, room: Room): RoomQuantities {
  const { inside, perimeter } = grid(room.rects)
  const height = plan.ceiling ?? 2.45

  let openings = 0
  let openingsLow = 0
  const windows: RoomQuantities['windows'] = []
  for (const w of plan.windows) {
    if (!touches(inside, w)) continue
    const width = w.orientation === 'h' ? w.w : w.h
    const sill = w.sill ?? WINDOW.sill
    const head = w.head ?? WINDOW.head
    windows.push({ label: (w.label ?? 'Janela').split(' · ')[0], width, sill, head })
    openings += width * (head - sill)
    openingsLow += width * Math.max(0, LAMBRIM - sill)
  }
  for (const d of plan.doors) {
    const { r, width } = doorRect(d)
    if (!touches(inside, r)) continue
    openings += width * DOOR_H
    openingsLow += width * LAMBRIM
  }

  const q: RoomQuantities = {
    floor: room.area,
    height,
    perimeter,
    wallsNet: Math.max(0, perimeter * height - openings),
    lambrim: Math.max(0, perimeter * LAMBRIM - openingsLow),
    windows,
    glassBlocks: plan.walls
      .filter((w) => w.glassBlock && touches(inside, { x: w.x + w.w / 2, y: w.y + w.h / 2, w: 0, h: 0 }))
      .map((w) => {
        const length = Math.max(w.w, w.h)
        return { length, blocks: Math.round(length / GLASS_BLOCK.module) * Math.round(GLASS_BLOCK.h / GLASS_BLOCK.module) }
      }),
  }

  const shower = plan.furniture.find((f) => f.kind === 'shower' && inRoom(inside, f))
  if (shower) {
    const sides = [
      boundaryRun(inside, 'n', shower.y, shower.x, shower.x + shower.w),
      boundaryRun(inside, 's', shower.y + shower.h, shower.x, shower.x + shower.w),
      boundaryRun(inside, 'w', shower.x, shower.y, shower.y + shower.h),
      boundaryRun(inside, 'e', shower.x + shower.w, shower.y, shower.y + shower.h),
    ]
      .filter((v) => v > 0.05)
      .sort((a, b) => b - a)
    const run = sides.reduce((s, v) => s + v, 0)
    q.shower = { sides, walls: run * height }
    q.wallsNet = Math.max(0, q.wallsNet - run * height)
    q.lambrim = Math.max(0, q.lambrim - run * LAMBRIM)
  }

  const bed = plan.furniture.find((f) => f.kind === 'bed' && inRoom(inside, f))
  if (bed) {
    const longY = bed.h > bed.w
    const side: Side = longY ? (bed.headSouth ? 's' : 'n') : bed.headEast ? 'e' : 'w'
    const c = side === 'n' ? bed.y : side === 's' ? bed.y + bed.h : side === 'w' ? bed.x : bed.x + bed.w
    const t = longY ? bed.x + bed.w / 2 : bed.y + bed.h / 2
    const back = side === 'n' || side === 'w' ? -CELL : CELL
    // a cabeceira pode ficar a poucos centímetros da parede
    for (let k = 0; k <= 10 && !q.headWall; k++) {
      const line = c + k * back
      const run = wallThrough(inside, side, line, t)
      if (!run) continue
      q.headWall = run
      q.headDoors = 0
      for (const d of plan.doors) {
        const { r, width } = doorRect(d)
        const along = side === 'n' || side === 's' ? r.w > r.h : r.h > r.w
        const cLine = side === 'n' || side === 's' ? r.y + r.h / 2 : r.x + r.w / 2
        const cAlong = side === 'n' || side === 's' ? r.x + r.w / 2 : r.y + r.h / 2
        if (along && Math.abs(cLine - line) < 0.15 && onBoundary(inside, side, line, cAlong)) q.headDoors += width
      }
    }
  }
  return q
}

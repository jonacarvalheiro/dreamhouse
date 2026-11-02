import { D, W } from '@/plan/common'
import { horizontalWall } from '@/plan/setout'
import type { Door, Plan, Rect, Room } from '@/plan/types'

export const f = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d)).replace('.', ',')
export const xy = (x: number, y: number) => `x ${f(x)} · y ${f(y)}`

export type Side = 'n' | 's' | 'e' | 'w'
export const sideName: Record<Side, string> = { n: 'norte', s: 'sul', e: 'nascente', w: 'poente' }
export const opposite: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' }
export const inRect = (r: Rect, x: number, y: number) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h
export const inRoom = (room: Room, x: number, y: number) => room.rects.some((r) => inRect(r, x, y))
export const roomAt = (plan: Plan, x: number, y: number) => plan.rooms.find((r) => inRoom(r, x, y))
export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
export const furnitureIn = (plan: Plan, room: Room) => plan.furniture.filter((fu) => inRoom(room, center(fu).x, center(fu).y))
export const inOpening = (plan: Plan, x: number, y: number) => (plan.ceilingOpenings ?? []).some((o) => inRect(o, x, y))

/** Linha (c) e troço (a–b) de um lado de um retângulo. */
export function edge(r: Rect, side: Side) {
  if (side === 'n') return { c: r.y, a: r.x, b: r.x + r.w, vertical: false }
  if (side === 's') return { c: r.y + r.h, a: r.x, b: r.x + r.w, vertical: false }
  if (side === 'w') return { c: r.x, a: r.y, b: r.y + r.h, vertical: true }
  return { c: r.x + r.w, a: r.y, b: r.y + r.h, vertical: true }
}
export const outward: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }
export const at = (side: Side, c: number, t: number) => (side === 'n' || side === 's' ? { x: t, y: c } : { x: c, y: t })

/** Um lado do móvel encosta a parede se, logo a seguir, já se está fora da divisão. */
export function sideInfo(plan: Plan, room: Room, r: Rect, side: Side) {
  const e = edge(r, side)
  const [ox, oy] = outward[side]
  const mid = at(side, e.c, (e.a + e.b) / 2)
  const wall = !inRoom(room, mid.x + ox * 0.05, mid.y + oy * 0.05)
  const exterior = (side === 'n' && e.c < 0.05) || (side === 's' && e.c > D - 0.05) || (side === 'w' && e.c < 0.05) || (side === 'e' && e.c > W - 0.05)
  const windows = exterior
    ? plan.windows
        .filter((w) => (e.vertical ? w.orientation === 'v' && (side === 'w' ? w.x < 0 : w.x >= W - 0.01) : w.orientation === 'h' && (side === 'n' ? w.y < 0 : w.y >= D - 0.01)))
        .map((w) => (e.vertical ? { a: w.y, b: w.y + w.h, label: w.label } : { a: w.x, b: w.x + w.w, label: w.label }))
        .filter((w) => w.b > e.a + 0.01 && w.a < e.b - 0.01)
    : []
  return { side, ...e, wall, exterior, windows, len: e.b - e.a }
}
export type SideInfo = ReturnType<typeof sideInfo>

export const wallLabel = (s: SideInfo) => `parede ${sideName[s.side]}${s.exterior ? ' (fachada)' : ''}, ${s.vertical ? 'x' : 'y'} ${f(s.c)}`

/** Parede da planta em que encosta um lado (para saber a espessura). */
export function wallOn(plan: Plan, side: Side, c: number, a: number, b: number) {
  return plan.walls.find((w) => {
    const vertical = !horizontalWall(w)
    if (vertical !== (side === 'e' || side === 'w')) return false
    const face = side === 'e' ? w.x : side === 'w' ? w.x + w.w : side === 's' ? w.y : w.y + w.h
    const [lo, hi] = vertical ? [w.y, w.y + w.h] : [w.x, w.x + w.w]
    return Math.abs(face - c) < 0.02 && hi > a + 0.01 && lo < b - 0.01
  })
}

/** Troços de portas e vãos, para não pôr interruptores em cima deles. */
export function doorSpan(d: Door) {
  if (d.type === 'swing') {
    const vertical = d.along === 'n' || d.along === 's'
    const p = vertical ? d.hinge.y : d.hinge.x
    const q = p + (d.along === 'n' || d.along === 'w' ? -d.width : d.width)
    return { vertical, c: vertical ? d.hinge.x : d.hinge.y, a: Math.min(p, q), b: Math.max(p, q), latch: q, hinge: p }
  }
  const vertical = d.orientation === 'v'
  const a = vertical ? d.y : d.x
  return { vertical, c: vertical ? d.x : d.y, a, b: a + d.length, latch: a + d.length, hinge: a }
}

/** Divisões dos dois lados de uma porta. */
export function doorRooms(plan: Plan, d: Door) {
  const sp = doorSpan(d)
  const mid = (sp.a + sp.b) / 2
  return [-1, 1]
    .map((sgn) => (sp.vertical ? roomAt(plan, sp.c + sgn * 0.25, mid) : roomAt(plan, mid, sp.c + sgn * 0.25)))
    .filter((r): r is Room => !!r)
}

/** Afasta t de portas na mesma parede, no sentido dir. */
export function clearOfDoors(plan: Plan, vertical: boolean, c: number, t: number, dir: 1 | -1) {
  for (let i = 0; i < 4; i++) {
    const hit = plan.doors.map(doorSpan).find((s) => s.vertical === vertical && Math.abs(s.c - c) < 0.25 && t > s.a - 0.1 && t < s.b + 0.1)
    if (!hit) return t
    t = dir > 0 ? hit.b + 0.15 : hit.a - 0.15
  }
  return t
}

export function centroid(room: Room) {
  const area = room.rects.reduce((s, r) => s + r.w * r.h, 0)
  const x = room.rects.reduce((s, r) => s + (r.x + r.w / 2) * r.w * r.h, 0) / area
  const y = room.rects.reduce((s, r) => s + (r.y + r.h / 2) * r.w * r.h, 0) / area
  if (inRoom(room, x, y)) return { x, y }
  const big = [...room.rects].sort((a, b) => b.w * b.h - a.w * a.h)[0]
  return center(big)
}

export const distToRect = (r: Rect, x: number, y: number) => Math.hypot(Math.max(r.x - x, 0, x - r.x - r.w), Math.max(r.y - y, 0, y - r.y - r.h))

import { D, GLASS_BLOCK, T_E, T_N, T_S, T_W, W } from '@/plan/common'
import { existingPlan } from '@/plan/existing'
import { buildProposal } from '@/plan/proposal'
import { buildProposalC } from '@/plan/proposalC'
import { buildProposalE } from '@/plan/proposalE'
import { FLOOR_TO_FLOOR, calcC, calcE, calcStair } from '@/plan/stair'
import type { Dir, Furniture, Plan, Rect, Wall } from '@/plan/types'

/** Caixa em coordenadas da planta (x para nascente, y para sul) e altura z acima do pavimento acabado. */
export type Box = Rect & { z0: number; z1: number; mat: string; room?: string; bevel?: number }
export type Cyl = { cx: number; cy: number; r: number; z0: number; z1: number; mat: string; bowl?: boolean }
export type Scene = {
  variant: string
  ceiling: number
  boxes: Box[]
  cylinders: Cyl[]
  /** Vãos de janela: vidro entre peitoril e padieira. */
  panes: (Rect & { z0: number; z1: number })[]
  /** Divisórias de blocos de vidro, para o Blender partir em blocos. `curb` é o murete baixo. */
  glass: (Rect & { z0: number; z1: number; curb?: number })[]
  lights: { x: number; y: number; z: number; w: number; h: number; power: number; room: string }[]
  rooms: { id: string; name: string; tone: string; rects: Rect[] }[]
}

const HEAD = 2.02
const SILL = HEAD - 1.045
const DOOR_H = 2.05
const DADO = 1.2
const SKIN = 0.008
/** Murete baixo debaixo dos 4×10 blocos de vidro. */
const CURB = 0.12
/** Banco embutido no duche: 0,35 m de fundo na parede da entrada, ao fundo. */
const BENCH = { d: 0.35, l: 0.42, h: 0.45 }
/** Nicho recuado na parede do chuveiro (0,30 × 0,60, 8 cm de fundo). */
const NICHE = { w: 0.3, h: 0.6, d: 0.08, z0: 1.05 }

const plans: Record<string, () => Plan> = {
  a: () => buildProposal(calcStair(FLOOR_TO_FLOOR)),
  c: () => buildProposalC(calcC(FLOOR_TO_FLOOR)),
  e: () => buildProposalE(calcE(FLOOR_TO_FLOOR)),
  existente: () => existingPlan,
}

const inRect = (r: Rect, x: number, y: number) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h
const floorMat: Record<string, string> = { bath: 'floor_wet', bed: 'floor_wood', closet: 'floor_wood', circ: 'floor_wood', stair: 'floor_wood', living: 'floor_wood', service: 'floor_wet' }

function subtract(r: Rect, holes: Rect[]): Rect[] {
  let out = [r]
  for (const h of holes) {
    const next: Rect[] = []
    for (const a of out) {
      const x0 = Math.max(a.x, h.x), x1 = Math.min(a.x + a.w, h.x + h.w)
      const y0 = Math.max(a.y, h.y), y1 = Math.min(a.y + a.h, h.y + h.h)
      if (x1 <= x0 || y1 <= y0) {
        next.push(a)
        continue
      }
      if (y0 > a.y) next.push({ x: a.x, y: a.y, w: a.w, h: y0 - a.y })
      if (y1 < a.y + a.h) next.push({ x: a.x, y: y1, w: a.w, h: a.y + a.h - y1 })
      if (x0 > a.x) next.push({ x: a.x, y: y0, w: x0 - a.x, h: y1 - y0 })
      if (x1 < a.x + a.w) next.push({ x: x1, y: y0, w: a.x + a.w - x1, h: y1 - y0 })
    }
    out = next
  }
  return out
}

/** Paredes partidas pelos vãos de janela: troços cheios, peitoris e padieiras. */
function wallPieces(plan: Plan, top: number): Box[] {
  const raise = plan.floorRaise ?? 0
  const out: Box[] = []
  for (const wall of plan.walls) {
    if (wall.kind === 'demolish' || wall.glassBlock) continue
    if (wall.low) {
      out.push({ x: wall.x, y: wall.y, w: wall.w, h: wall.h, z0: 0, z1: Math.min(wall.low, top), mat: 'wall' })
      continue
    }
    const mat = wall.kind === 'existing' ? 'wall_ext' : 'wall'
    const horizontal = wall.w >= wall.h
    const a0 = horizontal ? wall.x : wall.y
    const a1 = horizontal ? wall.x + wall.w : wall.y + wall.h
    const cuts = plan.windows
      .filter((win) => win.kind !== 'optional')
      .filter((win) => win.x < wall.x + wall.w - 1e-3 && win.x + win.w > wall.x + 1e-3 && win.y < wall.y + wall.h - 1e-3 && win.y + win.h > wall.y + 1e-3)
      .map((win) => ({
        s0: horizontal ? Math.max(a0, win.x) : Math.max(a0, win.y),
        s1: horizontal ? Math.min(a1, win.x + win.w) : Math.min(a1, win.y + win.h),
        sill: win.sill ?? SILL - raise,
        head: win.head ?? HEAD - raise,
      }))
      .sort((p, q) => p.s0 - q.s0)
    const rect = (s0: number, s1: number): Rect => (horizontal ? { x: s0, y: wall.y, w: s1 - s0, h: wall.h } : { x: wall.x, y: s0, w: wall.w, h: s1 - s0 })
    let cur = a0
    for (const c of cuts) {
      if (c.s0 > cur) out.push({ ...rect(cur, c.s0), z0: 0, z1: top, mat })
      if (c.sill > 0.001) out.push({ ...rect(c.s0, c.s1), z0: 0, z1: c.sill, mat })
      out.push({ ...rect(c.s0, c.s1), z0: c.head, z1: top, mat })
      cur = Math.max(cur, c.s1)
    }
    if (cur < a1) out.push({ ...rect(cur, a1), z0: 0, z1: top, mat })
  }
  return out
}

function panes(plan: Plan) {
  const raise = plan.floorRaise ?? 0
  return plan.windows
    .filter((w) => w.kind !== 'optional')
    .map((w) => {
      const horizontal = w.orientation === 'h'
      const t = 0.05
      const r = horizontal ? { x: w.x, y: w.y + w.h / 2 - t / 2, w: w.w, h: t } : { x: w.x + w.w / 2 - t / 2, y: w.y, w: t, h: w.h }
      return { ...r, z0: w.sill ?? SILL - raise, z1: w.head ?? HEAD - raise }
    })
}

const dirVec: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }

/** Padieiras por cima das portas e folhas: as de abrir ficam abertas a 90°, as de correr meio recolhidas. */
function doors(plan: Plan, top: number, solid: Rect[]): Box[] {
  const out: Box[] = []
  for (const d of plan.doors) {
    if (d.type === 'swing') {
      const [ax, ay] = dirVec[d.along]
      const [ix, iy] = dirVec[d.into]
      const px = d.hinge.x - ax * 0.02 - ix * 0.02
      const py = d.hinge.y - ay * 0.02 - iy * 0.02
      const host = solid.find((w) => px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h)
      const vertical = d.along === 'n' || d.along === 's'
      const t = host ? (vertical ? host.w : host.h) : 0.17
      const g0x = Math.min(d.hinge.x, d.hinge.x + ax * d.width)
      const g0y = Math.min(d.hinge.y, d.hinge.y + ay * d.width)
      if (vertical) out.push({ x: ix > 0 ? d.hinge.x - t : d.hinge.x, y: g0y, w: t, h: d.width, z0: DOOR_H, z1: top, mat: 'wall' })
      else out.push({ x: g0x, y: iy > 0 ? d.hinge.y - t : d.hinge.y, w: d.width, h: t, z0: DOOR_H, z1: top, mat: 'wall' })
      const lx = Math.min(d.hinge.x, d.hinge.x + ix * d.width)
      const ly = Math.min(d.hinge.y, d.hinge.y + iy * d.width)
      const leaf = ix !== 0 ? { x: lx, y: d.hinge.y - 0.02, w: d.width, h: 0.04 } : { x: d.hinge.x - 0.02, y: ly, w: 0.04, h: d.width }
      out.push({ ...leaf, z0: 0.01, z1: DOOR_H - 0.01, mat: 'door' })
    } else if (d.type === 'sliding') {
      const lintel = d.orientation === 'v' ? { x: d.x - 0.05, y: d.y, w: 0.1, h: d.length } : { x: d.x, y: d.y - 0.05, w: d.length, h: 0.1 }
      out.push({ ...lintel, z0: DOOR_H, z1: top, mat: 'wall' })
      const leaf = d.orientation === 'v' ? { x: d.x - 0.11, y: d.y + d.length * 0.55, w: 0.04, h: d.length } : { x: d.x + d.length * 0.55, y: d.y - 0.11, w: d.length, h: 0.04 }
      out.push({ ...leaf, z0: 0.01, z1: DOOR_H - 0.01, mat: 'door' })
    } else if (d.orientation === 'v') {
      out.push({ x: d.x - 0.085, y: d.y, w: 0.17, h: d.length, z0: DOOR_H, z1: top, mat: 'wall' })
    } else {
      out.push({ x: d.x, y: d.y - T_S / 2, w: d.length, h: T_S, z0: DOOR_H, z1: top, mat: 'wall' })
    }
  }
  return out
}

/**
 * Revestimento das casas de banho: uma pele fina de azulejo nas faces de parede viradas para a divisão,
 * até ao teto dentro do duche e até ao lambrim no resto.
 */
function tileSkins(plan: Plan, pieces: Box[]): Box[] {
  const baths = plan.rooms.filter((r) => r.tone === 'bath')
  const showers = plan.furniture.filter((f) => f.kind === 'shower')
  const out: Box[] = []
  const roomAt = (x: number, y: number) => baths.find((r) => r.rects.some((q) => inRect(q, x, y)))
  const step = 0.01
  const off = 0.02
  for (const p of pieces) {
    const faces: { side: Dir; c: number; a0: number; a1: number }[] = [
      { side: 'n', c: p.y, a0: p.x, a1: p.x + p.w },
      { side: 's', c: p.y + p.h, a0: p.x, a1: p.x + p.w },
      { side: 'w', c: p.x, a0: p.y, a1: p.y + p.h },
      { side: 'e', c: p.x + p.w, a0: p.y, a1: p.y + p.h },
    ]
    for (const f of faces) {
      const [dx, dy] = dirVec[f.side]
      const pt = (t: number) => (f.side === 'n' || f.side === 's' ? [t, f.c + dy * off] : [f.c + dx * off, t]) as [number, number]
      type Run = { a: number; b: number; room: string; wet: boolean }
      const runs: Run[] = []
      for (let t = f.a0 + step / 2; t < f.a1; t += step) {
        const [x, y] = pt(t)
        const room = roomAt(x, y)
        if (!room) continue
        const wet = showers.some((s) => x > s.x - 0.03 && x < s.x + s.w + 0.03 && y > s.y - 0.03 && y < s.y + s.h + 0.03)
        const last = runs[runs.length - 1]
        if (last && last.room === room.id && last.wet === wet && Math.abs(last.b - (t - step / 2)) < 1e-6) last.b = t + step / 2
        else runs.push({ a: t - step / 2, b: t + step / 2, room: room.id, wet })
      }
      for (const r of runs) {
        const z1 = Math.min(p.z1, r.wet ? p.z1 : DADO)
        if (z1 <= p.z0 + 1e-3) continue
        const box: Rect =
          f.side === 'n' ? { x: r.a, y: f.c - SKIN, w: r.b - r.a, h: SKIN }
          : f.side === 's' ? { x: r.a, y: f.c, w: r.b - r.a, h: SKIN }
          : f.side === 'w' ? { x: f.c - SKIN, y: r.a, w: SKIN, h: r.b - r.a }
          : { x: f.c, y: r.a, w: SKIN, h: r.b - r.a }
        out.push({ ...box, z0: p.z0, z1, mat: r.wet ? 'tile_shower' : 'tile_dado', room: r.room })
      }
    }
  }
  return out
}

function furniture(f: Furniture, top: number, boxes: Box[], cyl: Cyl[]) {
  const b = (r: Rect, z0: number, z1: number, mat: string, bevel = 0.01) => boxes.push({ x: r.x, y: r.y, w: r.w, h: r.h, z0, z1, mat, bevel })
  switch (f.kind) {
    case 'bed': {
      const headW = f.w > f.h
      b(f, 0.05, 0.3, 'oak')
      b({ x: f.x + 0.02, y: f.y + 0.02, w: f.w - 0.04, h: f.h - 0.04 }, 0.3, 0.55, 'linen', 0.05)
      const head = headW
        ? { x: f.headEast ? f.x + f.w - 0.06 : f.x, y: f.y, w: 0.06, h: f.h }
        : { x: f.x, y: f.headSouth ? f.y + f.h - 0.06 : f.y, w: f.w, h: 0.06 }
      b(head, 0, 1.05, 'oak')
      const pillow = (r: Rect) => b(r, 0.55, 0.68, 'pillow', 0.05)
      if (headW) {
        const px = f.headEast ? f.x + f.w - 0.45 : f.x + 0.08
        pillow({ x: px, y: f.y + 0.1, w: 0.36, h: f.h / 2 - 0.15 })
        pillow({ x: px, y: f.y + f.h / 2 + 0.05, w: 0.36, h: f.h / 2 - 0.15 })
        b({ x: f.headEast ? f.x - 0.01 : f.x + f.w - 0.55, y: f.y - 0.01, w: 0.56, h: f.h + 0.02 }, 0.32, 0.57, 'throw', 0.02)
      } else {
        const py = f.headSouth ? f.y + f.h - 0.45 : f.y + 0.08
        pillow({ x: f.x + 0.1, y: py, w: f.w / 2 - 0.15, h: 0.36 })
        pillow({ x: f.x + f.w / 2 + 0.05, y: py, w: f.w / 2 - 0.15, h: 0.36 })
        b({ x: f.x - 0.01, y: f.headSouth ? f.y - 0.01 : f.y + f.h - 0.55, w: f.w + 0.02, h: 0.56 }, 0.32, 0.57, 'throw', 0.02)
      }
      return
    }
    case 'nightstand':
      return b(f, 0, 0.5, 'oak')
    case 'wardrobe':
      return b(f, 0, Math.min(top, 2.2), 'oak_doors', 0.005)
    case 'desk':
      b(f, 0.72, 0.76, 'oak')
      for (const [x, y] of [[f.x + 0.03, f.y + 0.03], [f.x + f.w - 0.07, f.y + 0.03], [f.x + 0.03, f.y + f.h - 0.07], [f.x + f.w - 0.07, f.y + f.h - 0.07]])
        b({ x, y, w: 0.04, h: 0.04 }, 0, 0.72, 'oak', 0.002)
      return
    case 'shower':
      if (f.walkIn) b({ x: f.x + 0.1, y: f.y + 0.06, w: f.w - 0.2, h: 0.04 }, 0, 0.004, 'steel', 0)
      return
    case 'toilet': {
      const back = f.back ?? (f.y + f.h > D - 0.05 ? 's' : f.y < 0.05 ? 'n' : f.x < 0.05 ? 'w' : 'e')
      const bowl = back === 's' ? { x: f.x + 0.02, y: f.y, w: f.w - 0.04, h: f.h - 0.02 } : back === 'n' ? { x: f.x + 0.02, y: f.y + 0.02, w: f.w - 0.04, h: f.h - 0.02 } : f
      b(bowl, 0.22, 0.4, 'ceramic', 0.08)
      b(bowl, 0.4, 0.43, 'ceramic', 0.015)
      const plate = back === 's' ? { x: f.x + f.w / 2 - 0.12, y: f.y + f.h - 0.01, w: 0.24, h: 0.01 } : back === 'n' ? { x: f.x + f.w / 2 - 0.12, y: f.y, w: 0.24, h: 0.01 } : { x: f.x, y: f.y + f.h / 2 - 0.12, w: 0.01, h: 0.24 }
      b(plate, 0.95, 1.1, 'brass', 0.002)
      return
    }
    case 'sink': {
      b(f, 0.78, 0.86, 'oak_slab', 0.008)
      const r = Math.min(0.2, Math.min(f.w, f.h) / 2 - 0.04)
      const cx = f.w > 1 ? f.x + f.w - 0.35 : f.x + f.w / 2
      cyl.push({ cx, cy: f.y + f.h / 2 + 0.02, r, z0: 0.86, z1: 1.0, mat: 'stone', bowl: true })
      return
    }
    case 'shelves':
      for (const z of [0.3, 0.75, 1.2, 1.65]) b(f, z, z + 0.035, 'oak', 0.004)
      return
    case 'washer':
      return b(f, 0, 0.85, 'ceramic', 0.02)
    default:
      return b(f, 0, f.label === 'Cadeirão' ? 0.8 : 0.85, f.label === 'Cadeirão' ? 'throw' : 'oak', 0.02)
  }
}

function stair(plan: Plan, boxes: Box[]) {
  const s = plan.stair
  if (!s || s.kind === 'l') return
  const riser = FLOOR_TO_FLOOR / (s.treads + 1)
  const bottom = s.topY + s.treads * s.going
  for (let i = 0; i < s.treads; i++) {
    const z1 = (i + 1) * riser
    boxes.push({ x: s.x, y: bottom - (i + 1) * s.going, w: s.w, h: s.going, z0: Math.max(0, z1 - 0.32), z1, mat: 'stair', bevel: 0.006 })
  }
  if (s.underFill) {
    for (let i = 0; i < s.treads; i++) {
      const y0 = Math.max(s.underFill.y0, bottom - (i + 1) * s.going)
      const y1 = Math.min(s.underFill.y1, bottom - i * s.going)
      const z1 = Math.min((i + 1) * riser - 0.3, FLOOR_TO_FLOOR - 0.5)
      if (y1 - y0 > 1e-3 && z1 > 0.05) boxes.push({ x: s.x + 0.02, y: y0, w: s.w - 0.04, h: y1 - y0, z0: 0, z1, mat: 'oak_doors', bevel: 0.003 })
    }
  }
}

/** Lado do retângulo encostado a um troço de parede (para pendurar espelhos e chuveiros). */
function wallSide(r: Rect, pieces: Box[]): Dir | null {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.03
  const overlaps = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 0.05
  for (const p of pieces) {
    if (p.z1 < 1.8) continue
    if (near(p.y + p.h, r.y) && overlaps(p.x, p.x + p.w, r.x, r.x + r.w)) return 'n'
    if (near(p.y, r.y + r.h) && overlaps(p.x, p.x + p.w, r.x, r.x + r.w)) return 's'
    if (near(p.x + p.w, r.x) && overlaps(p.y, p.y + p.h, r.y, r.y + r.h)) return 'w'
    if (near(p.x, r.x + r.w) && overlaps(p.y, p.y + p.h, r.y, r.y + r.h)) return 'e'
  }
  return null
}

/** Espelho por cima de cada lavatório. */
function fittings(plan: Plan, pieces: Box[], boxes: Box[]) {
  for (const f of plan.furniture.filter((item) => item.kind === 'sink')) {
    const side = wallSide(f, pieces)
    const cx = f.w > 1 ? f.x + f.w - 0.35 : f.x + f.w / 2
    const cy = f.y + f.h / 2
    const mw = 0.55
    if (side === 'n') boxes.push({ x: cx - mw / 2, y: f.y, w: mw, h: 0.025, z0: 1.15, z1: 1.95, mat: 'mirror', bevel: 0.004 })
    if (side === 's') boxes.push({ x: cx - mw / 2, y: f.y + f.h - 0.025, w: mw, h: 0.025, z0: 1.15, z1: 1.95, mat: 'mirror', bevel: 0.004 })
    if (side === 'w') boxes.push({ x: f.x, y: cy - mw / 2, w: 0.025, h: mw, z0: 1.15, z1: 1.95, mat: 'mirror', bevel: 0.004 })
    if (side === 'e') boxes.push({ x: f.x + f.w - 0.025, y: cy - mw / 2, w: 0.025, h: mw, z0: 1.15, z1: 1.95, mat: 'mirror', bevel: 0.004 })
  }
}

/** Furo axial numa caixa (para o nicho do duche). */
function subtractBox(a: Box, hole: { x: number; y: number; w: number; h: number; z0: number; z1: number }): Box[] {
  const x0 = Math.max(a.x, hole.x), x1 = Math.min(a.x + a.w, hole.x + hole.w)
  const y0 = Math.max(a.y, hole.y), y1 = Math.min(a.y + a.h, hole.y + hole.h)
  const z0 = Math.max(a.z0, hole.z0), z1 = Math.min(a.z1, hole.z1)
  if (x1 <= x0 + 1e-4 || y1 <= y0 + 1e-4 || z1 <= z0 + 1e-4) return [a]
  const out: Box[] = []
  const keep = (b: Box) => {
    if (b.w > 1e-4 && b.h > 1e-4 && b.z1 - b.z0 > 1e-4) out.push(b)
  }
  if (hole.z0 > a.z0) keep({ ...a, z1: hole.z0 })
  if (hole.z1 < a.z1) keep({ ...a, z0: hole.z1 })
  const mid: Box = { ...a, z0: Math.max(a.z0, hole.z0), z1: Math.min(a.z1, hole.z1) }
  if (hole.x > mid.x) keep({ ...mid, w: hole.x - mid.x })
  if (hole.x + hole.w < mid.x + mid.w) keep({ ...mid, x: hole.x + hole.w, w: mid.x + mid.w - hole.x - hole.w })
  const mx0 = Math.max(mid.x, hole.x), mx1 = Math.min(mid.x + mid.w, hole.x + hole.w)
  if (hole.y > mid.y) keep({ ...mid, x: mx0, w: mx1 - mx0, y: mid.y, h: hole.y - mid.y })
  if (hole.y + hole.h < mid.y + mid.h) keep({ ...mid, x: mx0, w: mx1 - mx0, y: hole.y + hole.h, h: mid.y + mid.h - hole.y - hole.h })
  return out
}

function punch(boxes: Box[], hole: { x: number; y: number; w: number; h: number; z0: number; z1: number }) {
  const next = boxes.flatMap((b) => subtractBox(b, hole))
  boxes.length = 0
  boxes.push(...next)
}

/**
 * Duche da suite (vidro E-W): banco na entrada e chuveiro na parede nascente.
 * WC partilhado original (vidro N-S): chuveiro e nicho na parede sul, sem banco.
 */
function showerDetails(plan: Plan, boxes: Box[], cyl: Cyl[]) {
  const add = (r: Rect, z0: number, z1: number, mat: string, bevel = 0.006) =>
    boxes.push({ x: r.x, y: r.y, w: r.w, h: r.h, z0, z1, mat, bevel })

  for (const s of plan.furniture.filter((f) => f.kind === 'shower')) {
    const gb = plan.walls.find(
      (w) => w.glassBlock && w.x < s.x + s.w + 0.02 && w.x + w.w > s.x - 0.02 && w.y < s.y + s.h + 0.02 && w.y + w.h > s.y - 0.02,
    )
    const nsGlass = !!gb && gb.h > gb.w

    if (nsGlass) {
      const face = s.y + s.h
      const nicheX = s.x + (s.w - NICHE.w) / 2
      const hole = { x: nicheX, y: face - SKIN, w: NICHE.w, h: NICHE.d + SKIN, z0: NICHE.z0, z1: NICHE.z0 + NICHE.h }
      punch(boxes, hole)
      add({ x: nicheX, y: face + NICHE.d - 0.012, w: NICHE.w, h: 0.012 }, NICHE.z0, NICHE.z0 + NICHE.h, 'tile_shower', 0)
      add({ x: nicheX, y: face, w: NICHE.w, h: NICHE.d }, NICHE.z0, NICHE.z0 + 0.012, 'tile_shower', 0)
      add({ x: nicheX, y: face, w: NICHE.w, h: NICHE.d }, NICHE.z0 + NICHE.h - 0.012, NICHE.z0 + NICHE.h, 'tile_shower', 0)
      add({ x: nicheX, y: face, w: 0.012, h: NICHE.d }, NICHE.z0, NICHE.z0 + NICHE.h, 'tile_shower', 0)
      add({ x: nicheX + NICHE.w - 0.012, y: face, w: 0.012, h: NICHE.d }, NICHE.z0, NICHE.z0 + NICHE.h, 'tile_shower', 0)
      add({ x: nicheX + 0.01, y: face, w: NICHE.w - 0.02, h: NICHE.d - 0.005 }, NICHE.z0 + NICHE.h / 2 - 0.008, NICHE.z0 + NICHE.h / 2 + 0.008, 'oak_slab', 0.002)

      const armX = s.x + s.w - 0.14
      add({ x: armX - 0.01, y: face - 0.3, w: 0.02, h: 0.3 }, 2.05, 2.07, 'brass', 0)
      cyl.push({ cx: armX, cy: face - 0.3, r: 0.11, z0: 2.0, z1: 2.02, mat: 'brass' })
      add({ x: armX - 0.06, y: face - 0.05, w: 0.12, h: 0.05 }, 1.05, 1.17, 'brass', 0.01)
      continue
    }

    const glassEast = !gb || gb.x + gb.w / 2 >= s.x + s.w / 2
    const glassNorth = !gb || gb.y + gb.h / 2 <= s.y + s.h / 2

    const bench: Rect = {
      x: glassEast ? s.x + 0.02 : s.x + s.w - BENCH.d - 0.02,
      y: glassNorth ? s.y + s.h - BENCH.l - 0.02 : s.y + 0.02,
      w: BENCH.d,
      h: BENCH.l,
    }
    add(bench, 0, BENCH.h - 0.03, 'tile_shower', 0.008)
    add(bench, BENCH.h - 0.03, BENCH.h, 'oak_slab', 0.004)

    const face = glassEast ? s.x + s.w : s.x - NICHE.d
    const nicheY = s.y + (s.h - NICHE.w) / 2
    const hole = { x: glassEast ? face - SKIN : face, y: nicheY, w: NICHE.d + SKIN, h: NICHE.w, z0: NICHE.z0, z1: NICHE.z0 + NICHE.h }
    punch(boxes, hole)
    add({ x: glassEast ? face + NICHE.d - 0.012 : face, y: nicheY, w: 0.012, h: NICHE.w }, NICHE.z0, NICHE.z0 + NICHE.h, 'tile_shower', 0)
    add({ x: face, y: nicheY, w: NICHE.d, h: NICHE.w }, NICHE.z0, NICHE.z0 + 0.012, 'tile_shower', 0)
    add({ x: face, y: nicheY, w: NICHE.d, h: NICHE.w }, NICHE.z0 + NICHE.h - 0.012, NICHE.z0 + NICHE.h, 'tile_shower', 0)
    add({ x: face, y: nicheY, w: NICHE.d, h: 0.012 }, NICHE.z0, NICHE.z0 + NICHE.h, 'tile_shower', 0)
    add({ x: face, y: nicheY + NICHE.w - 0.012, w: NICHE.d, h: 0.012 }, NICHE.z0, NICHE.z0 + NICHE.h, 'tile_shower', 0)
    add({ x: face, y: nicheY + 0.01, w: NICHE.d - 0.005, h: NICHE.w - 0.02 }, NICHE.z0 + NICHE.h / 2 - 0.008, NICHE.z0 + NICHE.h / 2 + 0.008, 'oak_slab', 0.002)

    const armY = glassNorth ? s.y + 0.14 : s.y + s.h - 0.14
    const wallX = glassEast ? s.x + s.w : s.x
    const into = glassEast ? -1 : 1
    add({ x: into < 0 ? wallX - 0.3 : wallX, y: armY - 0.01, w: 0.3, h: 0.02 }, 2.05, 2.07, 'brass', 0)
    cyl.push({ cx: wallX + into * 0.3, cy: armY, r: 0.11, z0: 2.0, z1: 2.02, mat: 'brass' })
    add({ x: into < 0 ? wallX - 0.05 : wallX, y: armY - 0.06, w: 0.05, h: 0.12 }, 1.05, 1.17, 'brass', 0.01)
  }
}

export function buildScene(variant: string): Scene {
  const plan = plans[variant]()
  const top = plan.ceiling ?? 2.45
  const pieces = wallPieces(plan, top)
  const boxes: Box[] = [...pieces]
  const cylinders: Cyl[] = []
  boxes.push(...doors(plan, top, plan.walls.filter((w: Wall) => w.kind !== 'demolish' && !w.glassBlock)))
  boxes.push(...tileSkins(plan, pieces))

  for (const room of plan.rooms)
    for (const r of room.rects) boxes.push({ ...r, z0: -0.04, z1: 0, mat: floorMat[room.tone] ?? 'floor_wood', room: room.id })
  boxes.push({ x: -T_W, y: -T_N, w: W + T_W + T_E, h: D + T_N + T_S, z0: -0.1, z1: -0.04, mat: 'wall' })
  for (const r of subtract({ x: -T_W, y: -T_N, w: W + T_W + T_E, h: D + T_N + T_S }, plan.ceilingOpenings ?? []))
    boxes.push({ ...r, z0: top, z1: top + 0.03, mat: 'pine' })
  boxes.push({ x: -T_W - 0.5, y: -T_N - 0.5, w: W + T_W + T_E + 1, h: D + T_N + T_S + 1, z0: top + 0.03, z1: top + 0.25, mat: 'wall_ext' })

  for (const f of plan.furniture) if (!f.only2d) furniture(f, top, boxes, cylinders)
  stair(plan, boxes)
  fittings(plan, pieces, boxes)
  showerDetails(plan, boxes, cylinders)

  const glass = plan.walls.filter((w) => w.glassBlock).map((g) => ({ x: g.x, y: g.y, w: g.w, h: g.h, z0: CURB, z1: CURB + GLASS_BLOCK.h, curb: CURB }))

  const lights = plan.rooms.flatMap((room) =>
    room.rects
      .filter((r) => r.w > 0.5 && r.h > 0.5)
      .map((r) => ({
        x: r.x + r.w / 2,
        y: r.y + r.h / 2,
        z: top - 0.02,
        w: Math.min(0.6, r.w * 0.4),
        h: Math.min(0.6, r.h * 0.4),
        power: (room.tone === 'bath' ? 22 : 14) * r.w * r.h,
        room: room.id,
      })),
  )

  return {
    variant,
    ceiling: top,
    boxes,
    cylinders,
    panes: panes(plan),
    glass,
    lights,
    rooms: plan.rooms.map((r) => ({ id: r.id, name: r.name, tone: r.tone, rects: r.rects })),
  }
}

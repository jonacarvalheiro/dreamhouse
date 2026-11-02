import { roomQuantities } from '@/decor/quantities'
import type { Furniture, Plan, Rect, Room } from '@/plan/types'
import { at, center, centroid, f, furnitureIn, inOpening, inRoom, opposite, outward, sideInfo, wallLabel, wallOn, type Side, type SideInfo } from './geometry'

export type Bath = {
  room: Room
  hasWindow: boolean
  shower?: {
    f: Furniture
    walkIn: boolean
    mixSide: Side
    mixWall: string
    mixThickness?: number
    mixExterior: boolean
    mixer: { x: number; y: number }
    head: { x: number; y: number }
    niche: { x0: number; y0: number; x1: number; y1: number }
    drain: { x1: number; y1: number; x2: number; y2: number; fallCm: number } | { x: number; y: number }
    zone2: Rect
  }
  toilet?: { f: Furniture; side: Side; wall: string; exterior: boolean; axis: { x: number; y: number }; prewall: boolean }
  sink?: { f: Furniture; side: Side; wall: string; exterior: boolean; axis?: { x: number; y: number }; window?: string; ends: { x: number; y: number }[] }
  extractor: { x: number; y: number; where: string }
}

function analyseBath(plan: Plan, room: Room): Bath {
  const items = furnitureIn(plan, room)
  const q = roomQuantities(plan, room)
  const sh = items.find((i) => i.kind === 'shower')
  const tl = items.find((i) => i.kind === 'toilet')
  const sk = items.find((i) => i.kind === 'sink')
  const bath: Bath = { room, hasWindow: q.windows.length > 0, extractor: { ...centroid(room), where: 'no teto' } }

  if (sh) {
    const sides = (['n', 's', 'w', 'e'] as Side[]).map((s) => sideInfo(plan, room, sh, s))
    const gb = plan.walls.find((w) => w.glassBlock && w.x < sh.x + sh.w + 0.02 && w.x + w.w > sh.x - 0.02 && w.y < sh.y + sh.h + 0.02 && w.y + w.h > sh.y - 0.02)
    let mixSide: Side
    let front: Side | undefined
    if (gb) {
      const horiz = gb.w >= gb.h
      front = horiz ? (Math.abs(gb.y - sh.y) < Math.abs(gb.y - sh.y - sh.h) ? 'n' : 's') : Math.abs(gb.x - sh.x) < Math.abs(gb.x - sh.x - sh.w) ? 'w' : 'e'
      mixSide = horiz ? (Math.abs(gb.x + gb.w - sh.x - sh.w) < 0.02 ? 'e' : 'w') : Math.abs(gb.y + gb.h - sh.y - sh.h) < 0.02 ? 's' : 'n'
    } else {
      const cand = sides.filter((s) => s.wall).sort((a, b) => Number(a.exterior) - Number(b.exterior) || a.windows.length - b.windows.length || b.len - a.len)
      mixSide = cand[0]?.side ?? 'n'
    }
    const mix = sides.find((s) => s.side === mixSide)!
    const ends: [Side, Side] = mix.vertical ? ['n', 's'] : ['w', 'e']
    if (!front || front === mixSide || front === opposite[mixSide]) front = ends.find((e) => !sides.find((s) => s.side === e)!.wall)
    const L = mix.len
    // t medido a partir da ponta da frente (aberta ou com vidro) da parede do chuveiro
    const fromFront = (t: number) => {
      const v = front === ends[1] ? mix.b - t : mix.a + t
      return at(mixSide, mix.c, v)
    }
    const nicheA = fromFront(Math.max(L - 0.45, L / 2 + 0.05))
    const nicheB = fromFront(Math.max(L - 0.15, L / 2 + 0.35))
    const wall = wallOn(plan, mixSide, mix.c, mix.a, mix.b)
    const walkIn = !!sh.walkIn
    const drainH = sh.w >= sh.h
    const c = center(sh)
    const drain = walkIn
      ? drainH
        ? { x1: c.x - 0.35, y1: sh.y + 0.08, x2: c.x + 0.35, y2: sh.y + 0.08, fallCm: (sh.h - 0.08) * 1.5 }
        : { x1: sh.x + sh.w - 0.08, y1: c.y - 0.35, x2: sh.x + sh.w - 0.08, y2: c.y + 0.35, fallCm: (sh.w - 0.08) * 1.5 }
      : c
    const bb = room.rects.reduce(
      (a, r) => ({ x0: Math.min(a.x0, r.x), y0: Math.min(a.y0, r.y), x1: Math.max(a.x1, r.x + r.w), y1: Math.max(a.y1, r.y + r.h) }),
      { x0: 99, y0: 99, x1: -99, y1: -99 },
    )
    const z = { x0: Math.max(bb.x0, sh.x - 0.6), y0: Math.max(bb.y0, sh.y - 0.6), x1: Math.min(bb.x1, sh.x + sh.w + 0.6), y1: Math.min(bb.y1, sh.y + sh.h + 0.6) }
    bath.shower = {
      f: sh,
      walkIn,
      mixSide,
      mixWall: wallLabel(mix),
      mixThickness: wall ? Math.min(wall.w, wall.h) : undefined,
      mixExterior: mix.exterior,
      mixer: fromFront(front ? Math.min(0.25, L / 2) : L / 2),
      head: fromFront(L / 2),
      niche: { x0: Math.min(nicheA.x, nicheB.x), y0: Math.min(nicheA.y, nicheB.y), x1: Math.max(nicheA.x, nicheB.x), y1: Math.max(nicheA.y, nicheB.y) },
      drain,
      zone2: { x: z.x0, y: z.y0, w: z.x1 - z.x0, h: z.y1 - z.y0 },
    }
  }

  if (tl) {
    const ends: Side[] = tl.back ? [tl.back] : tl.h > tl.w ? ['n', 's'] : ['w', 'e']
    const s = ends.map((e) => sideInfo(plan, room, tl, e)).find((s) => s.wall) ?? sideInfo(plan, room, tl, ends[ends.length - 1])
    // pré-parede baixa por trás da sanita: o autoclismo fica dentro dela e a sanita encosta à face do lado do WC
    const pre = plan.walls.find((w) => w.low && w.x < tl.x + tl.w && w.x + w.w > tl.x && w.y < tl.y + tl.h && w.y + w.h > tl.y)
    const face = pre ? { w: pre.x + pre.w, e: pre.x, n: pre.y + pre.h, s: pre.y }[s.side] : s.c
    const span = pre && (s.vertical ? `x ${f(pre.x)} a ${f(pre.x + pre.w)}` : `y ${f(pre.y)} a ${f(pre.y + pre.h)}`)
    bath.toilet = {
      f: tl,
      side: s.side,
      wall: pre ? `pré-parede nova, de ${span} (até ${f(pre.low!)} m)` : wallLabel(s),
      exterior: !pre && s.exterior,
      axis: at(s.side, face, (s.a + s.b) / 2),
      prewall: !!pre,
    }
  }

  if (sk) {
    const longs: Side[] = sk.w >= sk.h ? ['n', 's'] : ['w', 'e']
    const s = longs.map((e) => sideInfo(plan, room, sk, e)).find((s) => s.wall) ?? sideInfo(plan, room, sk, longs[0])
    // a torneira de parede fica no troço da parede de trás que não é janela
    let segs = [{ a: s.a, b: s.b }]
    for (const w of s.windows) segs = segs.flatMap((g) => [{ a: g.a, b: Math.min(g.b, w.a) }, { a: Math.max(g.a, w.b), b: g.b }]).filter((g) => g.b - g.a > 0.01)
    const free = segs.sort((a, b) => b.b - b.a - (a.b - a.a))[0]
    const axis = free && free.b - free.a >= 0.15 ? at(s.side, s.c, (free.a + free.b) / 2) : undefined
    bath.sink = {
      f: sk,
      side: s.side,
      wall: wallLabel(s),
      exterior: s.exterior,
      axis,
      window: s.windows.length ? (s.windows[0].label ?? 'janela').split(' · ')[0] : undefined,
      ends: sinkEnds(room, s),
    }
  }

  if (bath.toilet) {
    const [ox, oy] = outward[bath.toilet.side]
    let pt = { x: bath.toilet.axis.x - ox * 0.5, y: bath.toilet.axis.y - oy * 0.5 }
    if (!inOpening(plan, pt.x, pt.y)) bath.extractor = { ...pt, where: 'no teto, por cima da sanita' }
    else {
      // por cima da sanita passa a escada: o extrator vai para o teto à frente dela
      for (let i = 0; i < 60 && inOpening(plan, pt.x, pt.y); i++) pt = { x: pt.x - ox * 0.05, y: pt.y - oy * 0.05 }
      pt = { x: pt.x - ox * 0.1, y: pt.y - oy * 0.1 }
      if (inRoom(room, pt.x, pt.y)) bath.extractor = { ...pt, where: 'no teto, à frente da sanita (por cima dela fica a escada)' }
    }
  }
  return bath
}

/** Pontas do lavatório para a tomada: fora das janelas e dentro do WC. */
function sinkEnds(room: Room, s: SideInfo) {
  const [ox, oy] = outward[s.side]
  const ends = [
    { t: s.a - 0.1, dir: -1 },
    { t: s.b + 0.1, dir: 1 },
  ].map(({ t, dir }) => {
    const w = s.windows.find((w) => t > w.a - 0.05 && t < w.b + 0.05)
    return w ? (dir < 0 ? w.a - 0.1 : w.b + 0.1) : t
  })
  const ok = ends.map((t) => at(s.side, s.c, t)).filter((pt) => inRoom(room, pt.x - ox * 0.1, pt.y - oy * 0.1))
  return ok.length ? ok : [at(s.side, s.c, (s.a + s.b) / 2)]
}

export const baths = (plan: Plan) => plan.rooms.filter((r) => r.tone === 'bath').map((r) => analyseBath(plan, r))

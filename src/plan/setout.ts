import { D, GLASS_BLOCK, T_E, T_N, T_S, T_W, W } from './common'
import type { Door, Plan, Wall } from './types'

export const m = (v: number) => (Math.abs(v) < 0.005 ? '0,00' : v.toFixed(2).replace('.', ','))
const eps = 0.01

const CORRIDOR = { west: 3.43, east: 4.83 }

const THICK = [0.1, 0.16, 0.17, T_S, T_W, T_N, T_E]
const isThick = (v: number) => THICK.some((t) => Math.abs(v - t) < eps)
export const horizontalWall = (w: Wall) => (isThick(w.h) && !isThick(w.w)) || (isThick(w.h) === isThick(w.w) && w.w >= w.h)

/** Parede na linha c que encosta a uma das pontas do troço a–b (ou, se só existir acima dos degraus, que passa por cima dele). */
const hostWall = (plan: Plan, horizontal: boolean, c: number, a: number, b: number) =>
  plan.walls.find((w) =>
    horizontalWall(w) !== horizontal
      ? false
      : horizontal
        ? c > w.y - eps &&
          c < w.y + w.h + eps &&
          (Math.abs(w.x + w.w - a) < eps || Math.abs(w.x - b) < eps || (!!w.overhead && w.x < b - eps && w.x + w.w > a + eps))
        : c > w.x - eps &&
          c < w.x + w.w + eps &&
          (Math.abs(w.y + w.h - a) < eps || Math.abs(w.y - b) < eps || (!!w.overhead && w.y < b - eps && w.y + w.h > a + eps)),
  )

/** Nome da parede em que fica um vão: as do corredor e as exteriores pelo nome, as outras pela posição das faces. */
function hostName(plan: Plan, horizontal: boolean, c: number, a: number, b: number): string {
  if (!horizontal) {
    if (c > CORRIDOR.west - eps && c < CORRIDOR.west + 0.17 + eps) return 'Parede poente do corredor'
    if (c > CORRIDOR.east - eps && c < CORRIDOR.east + 0.17 + eps) return 'Parede nascente do corredor'
  } else {
    if (c < eps) return 'Parede norte'
    if (c > D - eps) return 'Parede sul'
  }
  const host = hostWall(plan, horizontal, c, a, b)
  if (host) return horizontal ? `Parede y ${m(host.y)}–${m(host.y + host.h)}` : `Parede x ${m(host.x)}–${m(host.x + host.w)}`
  return horizontal ? `Parede a y ${m(c)}` : `Parede a x ${m(c)}`
}

/** Linha da parede (c) e troço (a–b) de um vão. */
function doorLine(d: Door) {
  if (d.type === 'swing') {
    const { hinge: h, width, along, into } = d
    const horizontal = along === 'e' || along === 'w'
    const a = horizontal ? (along === 'e' ? h.x : h.x - width) : along === 's' ? h.y : h.y - width
    return { horizontal, c: horizontal ? h.y : h.x + (into === 'e' ? -0.05 : 0.05), a, b: a + width }
  }
  const horizontal = d.orientation === 'h'
  const a = horizontal ? d.x : d.y
  return { horizontal, c: horizontal ? d.y : d.x, a, b: a + d.length }
}

/** Parede em que fica um vão (numa porta embutida, a que recebe a folha). */
export function doorHost(plan: Plan, d: Door): Wall | undefined {
  const { horizontal, c, a, b } = doorLine(d)
  return pocketWallOf(plan, d) ?? hostWall(plan, horizontal, c, a, b)
}

/** Espessura de uma parede. */
export const wallThickness = (w: Wall) => (horizontalWall(w) ? w.h : w.w)

/** Blocos de uma divisória de blocos de vidro: blocos por fiada, fiadas e total. */
export function glassBlockCount(w: Wall) {
  const n = Math.round(Math.max(w.w, w.h) / GLASS_BLOCK.module)
  const rows = Math.round(GLASS_BLOCK.h / GLASS_BLOCK.module)
  return { n, rows, total: n * rows }
}

/** Descreve onde fica uma parede, em metros a partir das faces interiores das paredes poente (x) e norte (y). */
export function whereWall(w: Wall): string {
  if (w.glassBlock) {
    const horizontal = w.w >= w.h
    const { n, rows, total } = glassBlockCount(w)
    const span = horizontal ? `face norte a y ${m(w.y)}, de x ${m(w.x)} a ${m(w.x + w.w)}` : `face poente a x ${m(w.x)}, de y ${m(w.y)} a ${m(w.y + w.h)}`
    return `Divisória do duche em blocos de vidro 19×19×8 cm, ${span}: ${n} blocos × ${rows} fiadas = ${total} blocos`
  }
  const corridorSide = Math.abs(w.w - 0.17) < eps && (Math.abs(w.x - CORRIDOR.west) < eps || Math.abs(w.x - CORRIDOR.east) < eps)
  if (corridorSide) return `Parede ${Math.abs(w.x - CORRIDOR.west) < eps ? 'poente' : 'nascente'} do corredor, de y ${m(w.y)} a ${m(w.y + w.h)}`
  if (w.y >= D - eps) return `Parede sul (exterior), de x ${m(Math.max(0, w.x))} a ${m(Math.min(W, w.x + w.w))}`
  if (horizontalWall(w)) return `Parede de ${Math.round(w.h * 100)} cm, face norte a y ${m(w.y)}, de x ${m(w.x)} a ${m(w.x + w.w)}`
  return `Parede de ${Math.round(w.w * 100)} cm, face poente a x ${m(w.x)}, de y ${m(w.y)} a ${m(w.y + w.h)}`
}

/** Parede onde recolhe a folha de uma porta de correr embutida (do lado de x ou y menor). */
export function pocketWallOf(plan: Plan, d: Door): Wall | undefined {
  if (d.type !== 'sliding' || !d.pocket) return undefined
  const horizontal = d.orientation === 'h'
  const a = horizontal ? d.x : d.y
  const c = horizontal ? d.y : d.x
  return plan.walls.find((w) =>
    horizontalWall(w) !== horizontal
      ? false
      : horizontal
        ? c > w.y - eps && c < w.y + w.h + eps && w.x < a - d.length + eps && w.x + w.w > a - eps
        : c > w.x - eps && c < w.x + w.w + eps && w.y < a - d.length + eps && w.y + w.h > a - eps,
  )
}

export function whereDoor(plan: Plan, d: Door): { kind: string; where: string; size: string } {
  if (d.type === 'swing') {
    const { hinge: h, width, along, into } = d
    const side = { n: 'norte', s: 'sul', e: 'nascente', w: 'poente' }[into]
    const horizontal = along === 'e' || along === 'w'
    const a = horizontal ? (along === 'e' ? h.x : h.x - width) : along === 's' ? h.y : h.y - width
    const c = horizontal ? h.y : h.x + (into === 'e' ? -0.05 : 0.05)
    const axis = horizontal ? 'x' : 'y'
    return {
      kind: 'Batente',
      where: `${hostName(plan, horizontal, c, a, a + width)}, de ${axis} ${m(a)} a ${m(a + width)}; dobradiça a ${axis} ${m(horizontal ? h.x : h.y)}, abre para ${side}`,
      size: `${m(width)} m`,
    }
  }
  const horizontal = d.orientation === 'h'
  const a = horizontal ? d.x : d.y
  const axis = horizontal ? 'x' : 'y'
  const pocket = d.type === 'sliding' && d.pocket
  const c = horizontal ? d.y : d.x
  const pocketWall = pocketWallOf(plan, d)
  const pocketNote = !pocket
    ? ''
    : `; a folha recolhe para dentro da parede, de ${axis} ${m(a - d.length)} a ${m(a)}${
        pocketWall?.kind === 'existing'
          ? `. A parede é existente: abre-se esse troço para o kit de embutir, com padieira de ${axis} ${m(a - d.length)} a ${m(a + d.length)}, e nesse troço não pode haver caixas elétricas nem tubos, dos dois lados`
          : ''
      }`
  return {
    kind: d.type === 'opening' ? 'Vão livre' : pocket ? 'De correr embutida' : 'De correr',
    where: `${hostName(plan, horizontal, c, a, a + d.length)}, de ${axis} ${m(a)} a ${m(a + d.length)}${pocketNote}`,
    size: `${m(d.length)} m`,
  }
}

export type WorkWall = Wall & { kind: Exclude<Wall['kind'], 'existing'> }

export const wallAction: Record<WorkWall['kind'], string> = {
  demolish: 'Demolir',
  new: 'Construir',
  infill: 'Fechar vão',
}

/** Paredes a demolir, vãos a fechar e paredes novas, por esta ordem e de norte para sul. */
export const workWalls = (plan: Plan): WorkWall[] =>
  plan.walls
    .filter((w): w is WorkWall => w.kind !== 'existing')
    .sort((a, b) => ['demolish', 'infill', 'new'].indexOf(a.kind) - ['demolish', 'infill', 'new'].indexOf(b.kind) || a.y - b.y || a.x - b.x)

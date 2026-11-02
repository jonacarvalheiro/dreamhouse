import type { Rect } from './types'

/*
 * Degraus em leque no canto `l` de uma escada que sobe para norte e vira para nascente.
 * Os espelhos saem todos do canto interior (sudeste de `l`) com ângulos iguais:
 * 0 aponta para poente (último espelho do 1.º lanço) e π/2 para norte (primeiro do 2.º lanço).
 */

type Pt = { x: number; y: number }

const angle = (j: number, n: number) => (j * Math.PI) / 2 / n

function rayEnd(l: Rect, a: number): Pt {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const t = Math.min(c > 1e-9 ? l.w / c : Infinity, s > 1e-9 ? l.h / s : Infinity)
  return { x: l.x + l.w - c * t, y: l.y + l.h - s * t }
}

/** Polígono de cada degrau do leque, de poente para norte. */
export function winderPolys(l: Rect, n: number): Pt[][] {
  const p = { x: l.x + l.w, y: l.y + l.h }
  const outer = Math.atan2(l.h, l.w)
  return Array.from({ length: n }, (_, j) => {
    const a0 = angle(j, n)
    const a1 = angle(j + 1, n)
    const pts = [p, rayEnd(l, a0)]
    if (a0 < outer - 1e-9 && a1 > outer + 1e-9) pts.push({ x: l.x, y: l.y })
    pts.push(rayEnd(l, a1))
    return pts
  })
}

/** Ponta exterior dos espelhos inclinados (o primeiro e o último espelho do leque são os dos lanços). */
export const winderRisers = (l: Rect, n: number): Pt[] => Array.from({ length: n - 1 }, (_, j) => rayEnd(l, angle(j + 1, n)))

/** x onde os espelhos inclinados cruzam a linha y, para o corte poente–nascente. */
export const winderXs = (l: Rect, n: number, y: number): number[] =>
  Array.from({ length: n - 1 }, (_, j) => Math.max(l.x, l.x + l.w - (l.y + l.h - y) / Math.tan(angle(j + 1, n))))

/** Ponto da linha de passo (a meio da largura) no degrau j do leque. */
export function winderWalk(l: Rect, n: number, j: number): Pt {
  const a = angle(j + 0.5, n)
  return { x: l.x + l.w - (l.w / 2) * Math.cos(a), y: l.y + l.h - (l.w / 2) * Math.sin(a) }
}

/** Cobertor de cada degrau do leque na linha de passo. */
export const winderGoing = (l: Rect, n: number) => ((Math.PI / 4) * l.w) / n

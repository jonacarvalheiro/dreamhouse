import type { LStairCalc } from './stair'
import type { LStair } from './types'

/** Escada em L: 1.º lanço junto à fachada poente a subir para norte até ao patamar ou ao leque. */
export const lStair = (s: LStairCalc): LStair => ({
  kind: 'l',
  w: s.w,
  bandY: s.bandY,
  flight1: { x: 0, y: s.bandY + s.w, w: s.w, h: s.treads1 * s.going, dir: 'n' },
  landing: { x: 0, y: s.bandY, w: s.w, h: s.w },
  winders: s.winders || undefined,
  treads1: s.treads1,
  treads2: s.treads2,
  going: s.going,
  xTop: s.xTop,
  cutAt: s.winders ? 0 : 2,
})

import type { Wall, Window } from './types'

export const W = 8.46
export const D = 6.32
export const T_W = 0.36
export const T_N = 0.37
export const T_E = 0.36
export const T_S = 0.34

/** Bloco de vidro 19×19×8 cm com junta de 1 cm; a divisória sobe 10 fiadas. */
export const GLASS_BLOCK = { module: 0.2, t: 0.08, h: 2.0 }

export const exteriorSides: Wall[] = [
  { x: -T_W, y: 0, w: T_W, h: D + T_S, kind: 'existing' },
  { x: W, y: 0, w: T_E, h: D + T_S, kind: 'existing' },
]

export const northWallSegments = (frontDoorOpen: boolean): Wall[] =>
  frontDoorOpen
    ? [
        { x: -T_W, y: -T_N, w: 3.77 + T_W, h: T_N, kind: 'existing' },
        { x: 4.72, y: -T_N, w: W + T_E - 4.72, h: T_N, kind: 'existing' },
      ]
    : [{ x: -T_W, y: -T_N, w: W + T_W + T_E, h: T_N, kind: 'existing' }]

export const existingWindows: Window[] = [
  { x: 1.12, y: -T_N, w: 1.17, h: T_N, orientation: 'h', label: 'N1 · 1,17×1,045' },
  { x: 6.12, y: -T_N, w: 1.17, h: T_N, orientation: 'h', label: 'N2 · 1,17×1,045' },
  { x: -T_W, y: 2.84, w: T_W, h: 1.17, orientation: 'v', label: 'W1 · 1,17×1,045' },
  { x: W, y: 4.16, w: T_E, h: 1.17, orientation: 'v', label: 'E1 · 1,17×1,045' },
]

/** Contexto a sul (cozinha e hall lateral) — fora do âmbito. */
export const contextWalls: Wall[] = [
  { x: -T_W, y: D + T_S, w: T_W, h: 2.0, kind: 'existing' },
  { x: 2.88, y: 7.45, w: 0.24, h: 1.21, kind: 'existing' },
  { x: 5.06, y: D + T_S, w: 0.34, h: 0.49, kind: 'existing' },
  { x: 5.06, y: 8.04, w: 0.34, h: 0.62, kind: 'existing' },
]

export const CONTEXT_BOTTOM = D + T_S + 2.0

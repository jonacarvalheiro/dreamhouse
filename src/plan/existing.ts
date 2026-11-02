import { D, T_S, existingWindows, exteriorSides, northWallSegments } from './common'
import type { Plan } from './types'

const cw = (x: number, y0: number, y1: number) => ({ x, y: y0, w: 0.17, h: y1 - y0, kind: 'existing' as const })

export const existingPlan: Plan = {
  ceiling: 2.55,
  rooms: [
    { id: 'sala', name: 'Sala de estar', rects: [{ x: 0, y: 0, w: 3.43, h: 2.04 }], tone: 'living', label: { x: 1.72, y: 1.02 }, area: 7.0, dims: '3,43 × 2,04' },
    { id: 'q3', name: 'Quarto 3', rects: [{ x: 0, y: 2.21, w: 3.43, h: 2.44 }], tone: 'bed', label: { x: 1.72, y: 3.43 }, area: 8.46, dims: '3,44 × 2,46' },
    { id: 'desp', name: 'Despensa', rects: [{ x: 0, y: 4.81, w: 1.66, h: 1.51 }], tone: 'service', label: { x: 0.83, y: 5.56 }, area: 2.47, dims: '1,69 × 1,46' },
    { id: 'wc', name: 'WC', rects: [{ x: 1.76, y: 4.81, w: 1.67, h: 1.51 }], tone: 'bath', label: { x: 2.6, y: 5.56 }, area: 2.42, dims: '1,69 × 1,43' },
    { id: 'hall', name: 'Hall de entrada', rects: [{ x: 3.6, y: 0, w: 1.23, h: D }], tone: 'circ', label: { x: 4.215, y: 2.6 }, area: 7.77, dims: '1,23 × 6,32' },
    { id: 'q1', name: 'Quarto 1', rects: [{ x: 5.0, y: 0, w: 3.46, h: 3.06 }], tone: 'bed', label: { x: 6.73, y: 1.53 }, area: 10.59, dims: '3,46 × 3,06' },
    { id: 'q2', name: 'Quarto 2', rects: [{ x: 5.0, y: 3.23, w: 3.46, h: 3.09 }], tone: 'bed', label: { x: 6.73, y: 4.78 }, area: 10.69, dims: '3,46 × 3,09' },
  ],
  walls: [
    ...exteriorSides,
    ...northWallSegments(true),
    { x: -0.36, y: D, w: 0.82, h: T_S, kind: 'existing' },
    { x: 1.2, y: D, w: 2.66, h: T_S, kind: 'existing' },
    { x: 4.55, y: D, w: 4.27, h: T_S, kind: 'existing' },
    cw(3.43, 0, 0.69),
    cw(3.43, 1.39, 3.07),
    cw(3.43, 3.77, 5.17),
    cw(3.43, 5.87, D),
    cw(4.83, 0, 0.69),
    cw(4.83, 1.39, 4.41),
    cw(4.83, 5.11, D),
    { x: 0, y: 2.04, w: 3.43, h: 0.17, kind: 'existing' },
    { x: 0, y: 4.65, w: 3.43, h: 0.16, kind: 'existing' },
    { x: 1.66, y: 4.81, w: 0.1, h: 1.51, kind: 'existing' },
    { x: 5.0, y: 3.06, w: 3.46, h: 0.17, kind: 'existing' },
  ],
  doors: [
    { type: 'swing', hinge: { x: 3.77, y: 0 }, width: 0.95, along: 'e', into: 's' },
    { type: 'swing', hinge: { x: 3.43, y: 1.39 }, width: 0.7, along: 'n', into: 'w' },
    { type: 'swing', hinge: { x: 3.43, y: 3.77 }, width: 0.7, along: 'n', into: 'w' },
    { type: 'swing', hinge: { x: 3.43, y: 5.87 }, width: 0.7, along: 'n', into: 'w' },
    { type: 'swing', hinge: { x: 5.0, y: 1.39 }, width: 0.7, along: 'n', into: 'e' },
    { type: 'swing', hinge: { x: 5.0, y: 5.11 }, width: 0.7, along: 'n', into: 'e' },
    { type: 'opening', x: 0.46, y: D + T_S / 2, length: 0.74, orientation: 'h' },
    { type: 'opening', x: 3.86, y: D + T_S / 2, length: 0.69, orientation: 'h' },
  ],
  windows: existingWindows,
  furniture: [],
  dimensions: [
    { x1: 0, y1: -0.8, x2: 3.43, y2: -0.8 },
    { x1: 3.6, y1: -0.8, x2: 4.83, y2: -0.8 },
    { x1: 5.0, y1: -0.8, x2: 8.46, y2: -0.8 },
    { x1: -0.8, y1: 0, x2: -0.8, y2: 2.04 },
    { x1: -0.8, y1: 2.21, x2: -0.8, y2: 4.65 },
    { x1: -0.8, y1: 4.81, x2: -0.8, y2: 6.32 },
    { x1: 9.25, y1: 0, x2: 9.25, y2: 3.06 },
    { x1: 9.25, y1: 3.23, x2: 9.25, y2: 6.32 },
  ],
}

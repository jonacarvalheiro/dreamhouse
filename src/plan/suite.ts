import { D, T_S, W, exteriorSides, northWallSegments } from './common'
import type { Door, Furniture, Room, Wall } from './types'

export const cw = (x: number, y0: number, y1: number, kind: Wall['kind'] = 'existing'): Wall => ({ x, y: y0, w: 0.17, h: y1 - y0, kind })
export const nw = (x: number, y: number, w: number, h: number): Wall => ({ x, y, w, h, kind: 'new' })

export const r2 = (v: number) => Math.round(v * 100) / 100
export const f2 = (v: number) => v.toFixed(2).replace('.', ',')

export const SACADA = { x: 6.3, w: 1.2, head: 2.15 }

/** Closet da suite: 1,95 m de largura para roupeiros dos dois lados de uma passagem de 0,75 m. */
const CLOSET_W = 1.95
/** Face nascente da parede closet/WC privativo. */
const WCS_X = 5.0 + CLOSET_W + 0.1
/** Fundo da zona do lavatório, em frente à janela N2 (bancada de 0,50 m + 0,75 m livres). */
const SINK_D = 1.25
/**
 * Porta do WC privativo: de correr embutida na parede entre o closet e a zona do lavatório, encostada à parede sul.
 * A parede só tem 1,25 m do lado do WC, por isso a folha não passa de 0,60 m: recolhe para norte, por trás do
 * módulo de canto do closet e da bancada.
 */
export const WCS_DOOR = { y: SINK_D - 0.6, w: 0.6 }
/** Vão livre do closet para o quarto, junto à parede do corredor. */
export const CLOSET_GAP = { x: 5.0, w: 0.75 }

/** Corredor, suite, closet e WC privativo: iguais nas duas propostas. */
export const hallRoom = (note: string): Room => ({
  id: 'hall',
  name: 'Corredor',
  rects: [{ x: 3.6, y: 0, w: 1.23, h: D }],
  tone: 'circ',
  label: { x: 4.215, y: 2.6 },
  area: 7.77,
  dims: '1,23 × 6,32',
  note: `${note} A porta de entrada passa a ter as dobradiças do lado nascente e abre encostada à parede do closet da suite, onde não há porta.`,
})

export const suiteRooms: Room[] = [
  {
    id: 'closet',
    name: 'Closet',
    rects: [
      { x: 5.0, y: 0, w: 1.02, h: SINK_D + 0.1 },
      { x: 5.0, y: SINK_D + 0.1, w: CLOSET_W, h: 2.85 - SINK_D - 0.1 },
    ],
    tone: 'closet',
    label: { x: 5.97, y: 2.3 },
    area: r2(1.02 * (SINK_D + 0.1) + CLOSET_W * (2.85 - SINK_D - 0.1)),
    dims: `${f2(CLOSET_W)} × 2,85 (em L)`,
    note: `Roupeiro de 2,2 m na parede poente, um módulo de canto a norte e um roupeiro de 0,85 m junto ao quarto, com uma passagem de 0,75 m ao meio. Do quarto entra-se por um vão livre de ${f2(CLOSET_GAP.w)} m, sem porta. A porta do WC é de correr embutida, na parede nascente do lado norte, e dá diretamente para a zona do lavatório.`,
  },
  {
    id: 'wcsuite',
    name: 'WC privativo',
    rects: [
      { x: 6.12, y: 0, w: 2.34, h: SINK_D },
      { x: WCS_X, y: SINK_D, w: W - WCS_X, h: 2.85 - SINK_D },
    ],
    tone: 'bath',
    label: { x: 7.75, y: 1.5 },
    area: r2(2.34 * SINK_D + (W - WCS_X) * (2.85 - SINK_D)),
    dims: '2,34 × 2,85 (em L)',
    note: `A janela N2 fica onde está, sobre a bancada do lavatório, com 0,75 m livres à frente (a zona do lavatório tem 2,34 × ${f2(SINK_D)} m). Entra-se do closet por uma porta de correr embutida de ${f2(WCS_DOOR.w)} m, encostada à parede sul dessa zona; a folha recolhe para dentro da parede, por trás da bancada. Duche de ${f2(W - WCS_X)} × 0,90 m a toda a largura, ao fundo, e sanita junto à fachada.`,
  },
  {
    id: 'suite',
    name: 'Quarto suite',
    rects: [{ x: 5.0, y: 2.95, w: 3.46, h: 3.37 }],
    tone: 'bed',
    label: { x: 7.1, y: 5.5 },
    area: r2(3.46 * 3.37),
    dims: '3,46 × 3,37',
    note: 'Janela de sacada nova a sul (1,20 × 2,15 m) e janela nascente atual. Mantém a porta do antigo Quarto 2. Cama encostada à parede do closet.',
  },
]

export const sharedWalls: Wall[] = [
  { x: 5.0, y: 3.06, w: 3.46, h: 0.17, kind: 'demolish' },
  ...exteriorSides,
  ...northWallSegments(true),
  { x: 4.55, y: D, w: W + 0.36 - 4.55, h: T_S, kind: 'existing' },
  cw(4.83, 0, 0.69),
  cw(4.83, 0.69, 1.39, 'infill'),
  cw(4.83, 1.39, 4.41),
  cw(4.83, 5.11, D),
  nw(CLOSET_GAP.x + CLOSET_GAP.w, 2.85, W - CLOSET_GAP.x - CLOSET_GAP.w, 0.1),
  nw(6.02, 0, 0.1, WCS_DOOR.y),
  nw(6.02, SINK_D, WCS_X - 6.02, 0.1),
  nw(WCS_X - 0.1, SINK_D + 0.1, 0.1, 2.85 - SINK_D - 0.1),
]

export const sharedDoors: Door[] = [
  { type: 'swing', hinge: { x: 4.72, y: 0 }, width: 0.95, along: 'w', into: 's' },
  { type: 'swing', hinge: { x: 5.0, y: 5.11 }, width: 0.7, along: 'n', into: 'e' },
  { type: 'opening', x: CLOSET_GAP.x, y: 2.9, length: CLOSET_GAP.w, orientation: 'h' },
  { type: 'sliding', x: 6.07, y: WCS_DOOR.y, length: WCS_DOOR.w, orientation: 'v', pocket: true },
  { type: 'opening', x: 3.86, y: D + T_S / 2, length: 0.69, orientation: 'h' },
]

export const suiteFurniture: Furniture[] = [
  { x: 5.0, y: 0, w: 0.6, h: 2.2, kind: 'wardrobe', label: 'Roupeiro' },
  { x: 5.6, y: 0, w: 0.42, h: 0.6, kind: 'wardrobe' },
  { x: WCS_X - 0.7, y: 2.0, w: 0.6, h: 0.85, kind: 'wardrobe' },

  { x: 6.15, y: 0, w: 1.45, h: 0.5, kind: 'sink', label: 'Bancada' },
  { x: 8.04, y: 0, w: 0.4, h: 0.7, kind: 'toilet' },
  { x: WCS_X, y: 1.95, w: W - WCS_X, h: 0.9, kind: 'shower', label: 'Duche' },

  { x: 6.3, y: 2.95, w: 1.6, h: 2.0, kind: 'bed', label: '160×200' },
  { x: 5.85, y: 2.98, w: 0.42, h: 0.42, kind: 'nightstand' },
  { x: 7.93, y: 2.98, w: 0.42, h: 0.42, kind: 'nightstand' },
  { x: 5.0, y: 5.35, w: 0.5, h: 0.95, kind: 'generic', label: 'Cómoda' },
  { x: 7.65, y: 5.45, w: 0.7, h: 0.7, kind: 'generic', label: 'Cadeirão' },
]

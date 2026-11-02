import { D, T_S, T_W, existingWindows } from './common'
import { CEILING, underL, type LStairCalc } from './stair'
import { lStair } from './lstair'
import { SACADA, cw, f2, hallRoom, nw, r2, sharedDoors, sharedWalls, suiteFurniture, suiteRooms } from './suite'
import type { Plan } from './types'

/** WC partilhado a toda a largura da fachada norte, com a janela N1 e 1,21 m de fundo. */
const WC = { x: 0, y: 0, w: 3.43, h: 1.21 }
/** A porta da antiga sala (0,69–1,39) sobe 39 cm para caber no WC. */
const WC_DOOR_Y = 0.3
/** Início do armário embutido debaixo do 2.º lanço (antes disso a altura é demasiado baixa). */
const UNDER_X0 = 1.3
const UNDER_DEPTH = 0.6
/** Passagem para o closet por baixo dos últimos degraus (escada de estrutura fina). */
const PASS_X = 2.62

/** WC a norte, Quarto 2 ao meio com a W1 e closet a sul (por baixo do fim da escada), escada em L a partir da cozinha. */
/** Altura livre mínima e máxima na passagem para o closet. */
export const passClearance = (s: LStairCalc): [number, number] => [underL(s, PASS_X), underL(s, 3.43 - 0.01)]
export const PASS_W = 3.43 - PASS_X

export function buildProposalE(s: LStairCalc): Plan {
  const { xTop, bandY } = s
  const [passLo, passHi] = passClearance(s)
  const q2Y = bandY - 0.1
  const bandEnd = bandY + s.w
  const q2Top = WC.h + 0.1
  const strip = { x: s.w + 0.1, y: bandEnd + 0.1, w: 3.43 - s.w - 0.1, h: D - bandEnd - 0.1 }
  const pass = { x: PASS_X, y: bandY, w: 3.43 - PASS_X, h: s.w + 0.1 }
  const closetArea = strip.w * strip.h + pass.w * pass.h
  const stair = { ...lStair(s), underFill: { x0: s.w + 0.1, x1: PASS_X, y: bandY, h: s.w } }

  return {
    ceiling: CEILING,
    floorRaise: 0.1,
    dimensions: [
      { x1: 0, y1: -0.8, x2: 3.43, y2: -0.8 },
      { x1: 3.6, y1: -0.8, x2: 4.83, y2: -0.8 },
      { x1: 5.0, y1: -0.8, x2: 8.46, y2: -0.8 },
      { x1: -0.8, y1: 0, x2: -0.8, y2: WC.h },
      { x1: -0.8, y1: q2Top, x2: -0.8, y2: q2Y },
      { x1: -0.8, y1: bandY, x2: -0.8, y2: D },
      { x1: 9.25, y1: 0, x2: 9.25, y2: 2.85 },
      { x1: 9.25, y1: 2.95, x2: 9.25, y2: D },
    ],
    rooms: [
      {
        id: 'wc',
        name: 'WC partilhado',
        rects: [WC],
        tone: 'bath',
        label: { x: 1.3, y: 0.72 },
        area: r2(WC.w * WC.h),
        dims: `${f2(WC.w)} × ${f2(WC.h)}`,
        note: 'A toda a largura da fachada norte, com a janela N1: luz e ventilação natural. Tem 1,21 m de fundo. A porta da antiga sala sobe 39 cm no mesmo pano de parede do corredor (fica de 0,30 a 1,00 m da fachada), para abrir dentro do WC. Duche de 1,20 × 0,90 m, lavatório por baixo da janela e sanita suspensa (0,55 m de fundo, autoclismo embutido na parede norte), para ficarem 0,66 m livres à frente.',
      },
      {
        id: 'quarto2',
        name: 'Quarto 2',
        rects: [{ x: 0, y: q2Top, w: 3.43, h: q2Y - q2Top }],
        tone: 'bed',
        label: { x: 1.55, y: 3.45 },
        area: r2(3.43 * (q2Y - q2Top)),
        dims: `3,43 × ${f2(q2Y - q2Top)}`,
        note: `Entre o WC e a escada, com a janela W1 e a porta do antigo Quarto 3. Cama de 140×190 com a cabeceira na parede do WC e as duas laterais livres (1,20 m do lado da secretária, por baixo da janela W1, e 0,83 m do lado do corredor), com 0,80 m livres aos pés; a roupa fica no closet e no armário debaixo da escada. Junto ao corredor passa-se por baixo dos últimos degraus para o closet; a poente dessa passagem fica um armário de ${f2(PASS_X - UNDER_X0)} m debaixo da escada.`,
      },
      {
        id: 'closet2',
        name: 'Closet',
        rects: [pass, strip],
        tone: 'closet',
        label: { x: 2.0, y: 5.55 },
        area: r2(closetArea),
        dims: `${f2(strip.w)} × ${f2(strip.h)} + passagem ${f2(pass.w)} × ${f2(pass.h)}`,
        note: `É a antiga lavandaria, agora do Quarto 2. Entra-se pelo quarto, por baixo dos últimos degraus da escada (passagem de ${f2(pass.w)} m com ${f2(passLo)} a ${f2(passHi)} m de altura, com a escada em estrutura fina de madeira ou metal). Roupeiro de 2,3 m ao longo da fachada sul, com o pé-direito todo, e gavetas e sapateira por baixo dos degraus. A porta do antigo WC para o corredor é fechada.`,
      },
      {
        id: 'escada',
        name: 'Escada',
        rects: [{ x: 0, y: bandY, w: s.w, h: D - bandY }],
        tone: 'stair',
        label: { x: s.w / 2, y: 5.55 },
        area: r2(s.w * (D - bandY)),
        dims: `${f2(s.w)} × ${f2(D - bandY)}`,
        note: `Escada em L de ${s.risers} degraus, com patamar. Arranca da cozinha, pelo vão atual alargado para ${f2(s.w)} m, sobe ${s.risers1} degraus junto à fachada até um patamar de ${f2(s.w)} × ${f2(s.w)} m e vira para nascente. O 2.º lanço passa por cima do armário e da passagem para o closet e chega ao sótão junto ao corredor, com ${f2(s.roofAtTop)} m a meio da escada e ${f2(s.roofAtTopNorth)} m do lado do quarto.`,
      },
      hallRoom(
        'Fica como está: entrada principal, paredes e vãos. A porta da antiga sala sobe 39 cm e passa a ser a do WC; a do antigo Quarto 3 passa a ser a do Quarto 2; fecham-se as do antigo Quarto 1 e do antigo WC.',
      ),
      ...suiteRooms,
    ],
    walls: [
      { x: 0, y: 2.04, w: 3.43, h: 0.17, kind: 'demolish' },
      { x: 0, y: 4.65, w: 3.43, h: 0.16, kind: 'demolish' },
      { x: 1.66, y: 4.81, w: 0.1, h: 1.51, kind: 'demolish' },
      ...sharedWalls,
      { x: -T_W, y: D, w: T_W, h: T_S, kind: 'existing' },
      { x: 0, y: D, w: 0.46, h: T_S, kind: 'demolish' },
      { x: s.w, y: D, w: 1.2 - s.w, h: T_S, kind: 'infill' },
      { x: 1.2, y: D, w: 2.66, h: T_S, kind: 'existing' },

      cw(3.43, 0, WC_DOOR_Y),
      cw(3.43, WC_DOOR_Y, 0.69, 'demolish'),
      cw(3.43, WC_DOOR_Y + 0.7, 1.39, 'infill'),
      cw(3.43, 1.39, 3.07),
      cw(3.43, 3.77, 5.17),
      cw(3.43, 5.17, 5.87, 'infill'),
      cw(3.43, 5.87, D),

      nw(0, WC.h, 3.43, 0.1),
      nw(0, q2Y, UNDER_X0, 0.1),
      { x: UNDER_X0, y: q2Y, w: xTop - UNDER_X0, h: 0.1, kind: 'new', overhead: true },
      nw(s.w, bandEnd, 0.1, D - bandEnd),
      { x: s.w + 0.1, y: bandEnd, w: xTop - s.w - 0.1, h: 0.1, kind: 'new', overhead: true },
    ],
    doors: [
      ...sharedDoors,
      { type: 'sliding', x: 3.515, y: WC_DOOR_Y, length: 0.7, orientation: 'v' },
      { type: 'swing', hinge: { x: 3.43, y: 3.07 }, width: 0.7, along: 's', into: 'w' },
      { type: 'opening', x: PASS_X, y: q2Y + 0.05, length: 3.43 - PASS_X, orientation: 'h' },
      { type: 'opening', x: 0, y: D + T_S / 2, length: s.w, orientation: 'h' },
    ],
    windows: [
      ...existingWindows,
      { x: SACADA.x, y: D, w: SACADA.w, h: T_S, orientation: 'h', kind: 'new', label: 'Janela de sacada', sill: 0, head: SACADA.head },
    ],
    furniture: [
      { x: 0, y: 0, w: 1.2, h: 0.9, kind: 'shower', label: 'Duche' },
      { x: 1.5, y: 0, w: 0.6, h: 0.45, kind: 'sink' },
      { x: 2.25, y: 0, w: 0.4, h: 0.55, kind: 'toilet', label: 'Suspensa' },

      { x: 1.2, y: q2Top, w: 1.4, h: 1.9, kind: 'bed', label: '140×190' },
      { x: 0.75, y: q2Top, w: 0.4, h: 0.4, kind: 'nightstand' },
      { x: 2.65, y: q2Top, w: 0.4, h: 0.4, kind: 'nightstand' },
      { x: 0, y: 2.9, w: 0.55, h: 1.0, kind: 'desk', label: 'Secret.' },
      { x: UNDER_X0, y: bandY, w: PASS_X - 0.05 - UNDER_X0, h: UNDER_DEPTH, kind: 'wardrobe', label: 'Armário', only2d: true },
      { x: s.w + 0.1, y: bandY + UNDER_DEPTH, w: PASS_X - 0.05 - s.w - 0.1, h: s.w - UNDER_DEPTH, kind: 'generic', label: 'Gavetas', only2d: true },
      { x: strip.x, y: D - 0.55, w: strip.w, h: 0.55, kind: 'wardrobe', label: 'Roupeiro do closet' },

      ...suiteFurniture,
    ],
    stair,
    ceilingOpenings: [
      { x: 0, y: bandY, w: xTop, h: s.w },
      { x: 0, y: bandEnd, w: s.w, h: s.yOpen - bandEnd },
    ],
  }
}

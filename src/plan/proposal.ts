import { D, GLASS_BLOCK, T_S, T_W, existingWindows } from './common'
import { CEILING, STR, type StairCalc } from './stair'
import { SACADA, cw, f2, hallRoom, nw, r2, sharedDoors, sharedWalls, suiteFurniture, suiteRooms } from './suite'
import type { Plan } from './types'

export { SACADA }

/** Fim do Quarto 2 / início do WC partilhado. */
const WC_Y = 4.3
/** Parede entre o lanço e o Quarto 2. */
const SIDE_X = STR.x - 0.1
const BED_W = 1.4
const BED_L = 1.9
/** Cama ao centro da faixa entre a fachada poente e os roupeiros da escada. */
const BED_X = Math.round(((SIDE_X - BED_W) / 2) * 100) / 100
/** Duche do WC partilhado no canto sudoeste; divisória de blocos de vidro do lado da sanita. */
const SHOWER = { x: 0, y: 5.42, w: 1.1, h: D - 5.42 }
const SHOWER_GB = { x: SHOWER.x + SHOWER.w, y: D - 4 * GLASS_BLOCK.module, w: GLASS_BLOCK.t, h: 4 * GLASS_BLOCK.module }
/** Duche da suite, a toda a largura ao fundo do WC: blocos de vidro do lado nascente, entrada de 0,61 m junto ao closet. */
const SUITE_GB = { x: 8.46 - 4 * GLASS_BLOCK.module, y: 1.95, w: 4 * GLASS_BLOCK.module, h: GLASS_BLOCK.t }
/** Módulos de arrumação debaixo da escada, abertos para o Quarto 2 (de norte para sul). */
const underModules = (yTop: number) => [
  { y: yTop, h: 2.72 - yTop, kind: 'wardrobe' as const, label: 'Roupeiro alto' },
  { y: 2.72, h: 0.8, kind: 'wardrobe' as const, label: 'Roupeiro' },
  { y: 3.52, h: 0.78, kind: 'generic' as const, label: 'Gavetões' },
]

export function buildProposal(s: StairCalc): Plan {
  const yTop = s.yTop
  const atrioH = D - STR.yStart

  return {
    ceiling: CEILING,
    floorRaise: 0.1,
    dimensions: [
      { x1: 0, y1: -0.8, x2: SIDE_X, y2: -0.8 },
      { x1: STR.x, y1: -0.8, x2: 3.43, y2: -0.8 },
      { x1: 3.6, y1: -0.8, x2: 4.83, y2: -0.8 },
      { x1: 5.0, y1: -0.8, x2: 8.46, y2: -0.8 },
      { x1: -0.8, y1: 0, x2: -0.8, y2: WC_Y },
      { x1: -0.8, y1: WC_Y + 0.1, x2: -0.8, y2: D },
      { x1: 9.25, y1: 0, x2: 9.25, y2: 2.85 },
      { x1: 9.25, y1: 2.95, x2: 9.25, y2: D },
    ],
    rooms: [
      {
        id: 'quarto2',
        name: 'Quarto 2',
        rects: [
          { x: 0, y: 0, w: 3.43, h: yTop },
          { x: 0, y: yTop, w: SIDE_X, h: WC_Y - yTop },
        ],
        tone: 'bed',
        label: { x: 1.65, y: 1.15 },
        area: r2(3.43 * yTop + SIDE_X * (WC_Y - yTop)),
        dims: `3,43 × ${f2(yTop)} + ${f2(SIDE_X)} × ${f2(WC_Y - yTop)}`,
        note: `Junta a antiga sala e o Quarto 3, com as janelas N1 e W1 no sítio e a porta atual da sala. Cama de 140×190 com a cabeceira na parede do WC, a sul, solta das duas laterais: ${f2(BED_X)} m livres do lado da fachada poente (janela W1) e ${f2(SIDE_X - BED_X - BED_W)} m do lado dos roupeiros da escada. A norte o quarto tem 3,43 × ${f2(yTop)} m; a porta de 0,70 m fica nesse alvéolo, a 0,33 m do canto da escada, e a cómoda é só 0,60 × 0,40 m para a folha abrir. A roupa fica toda debaixo da escada, em três módulos de ${f2(STR.w)} m de fundo abertos para o quarto, de frente para a cama`,
      },
      {
        id: 'escada',
        name: 'Escada',
        rects: [{ x: STR.x, y: yTop, w: STR.w, h: STR.yStart - yTop }],
        tone: 'stair',
        label: { x: STR.x + STR.w / 2, y: (WC_Y + STR.yStart) / 2 + 0.1 },
        area: r2(STR.w * (STR.yStart - yTop)),
        dims: `${f2(STR.w)} × ${f2(STR.yStart - yTop)}`,
        note: `Lanço reto de ${s.risers} degraus com ${f2(STR.w)} m livres, encostado à parede do corredor, a subir de sul para norte. Chega ao sótão a ${f2(yTop)} m da face interior da parede norte, onde o telhado tem ${f2(s.roofAtTop)} m. Debaixo dela, do lado do Quarto 2: roupeiro alto, roupeiro e gavetões, com ${f2(STR.w)} m de fundo.`,
      },
      {
        id: 'atrio',
        name: 'Átrio',
        rects: [{ x: STR.x, y: STR.yStart, w: STR.w, h: atrioH }],
        tone: 'circ',
        label: { x: STR.x + STR.w / 2, y: STR.yStart + 0.5 },
        area: r2(STR.w * atrioH),
        dims: `${f2(STR.w)} × ${f2(atrioH)}`,
        note: 'Entra-se do corredor pelo vão do antigo WC, que fica como está. Daqui sobe-se a escada e entra-se no WC partilhado.',
      },
      {
        id: 'wc',
        name: 'WC partilhado',
        rects: [{ x: 0, y: WC_Y + 0.1, w: SIDE_X, h: D - WC_Y - 0.1 }],
        tone: 'bath',
        label: { x: 1.2, y: 5.05 },
        area: r2(SIDE_X * (D - WC_Y - 0.1)),
        dims: `${f2(SIDE_X)} × ${f2(D - WC_Y - 0.1)}`,
        note: 'No canto do WC e da despensa atuais (esgotos perto). Duche de nível de 1,10 × 0,90 m sem base, com uma divisória de blocos de vidro do lado da sanita, na mesma linha do extremo poente do tampo; entrada pelo lado norte; sanita suspensa e lavatório na parede norte. Sem janela: extração mecânica. O vão para a cozinha é fechado.',
      },
      hallRoom('Fica como está: entrada principal, paredes e vãos. Fecham-se apenas a porta do antigo Quarto 3 (fica atrás da escada) e a do antigo Quarto 1.'),
      ...suiteRooms,
    ],
    walls: [
      { x: 0, y: 2.04, w: 3.43, h: 0.17, kind: 'demolish' },
      { x: 0, y: 4.65, w: 3.43, h: 0.16, kind: 'demolish' },
      { x: 1.66, y: 4.81, w: 0.1, h: 1.51, kind: 'demolish' },
      ...sharedWalls,
      { x: -T_W, y: D, w: 0.46 + T_W, h: T_S, kind: 'existing' },
      { x: 0.46, y: D, w: 0.74, h: T_S, kind: 'infill' },
      { x: 1.2, y: D, w: 2.66, h: T_S, kind: 'existing' },

      cw(3.43, 0, 0.69),
      cw(3.43, 1.39, 3.07),
      cw(3.43, 3.07, 3.77, 'infill'),
      cw(3.43, 3.77, 5.17),
      cw(3.43, 5.87, D),

      { x: SIDE_X, y: yTop, w: 0.1, h: WC_Y - yTop, kind: 'new', overhead: true },
      nw(SIDE_X, WC_Y, 0.1, 5.35 - WC_Y),
      nw(SIDE_X, 6.1, 0.1, D - 6.1),
      nw(0, WC_Y, SIDE_X, 0.1),
      /** Ressalto do lavatório na mesma linha dos blocos de vidro (x = 1,10 m). */
      { x: SHOWER.w, y: WC_Y + 0.1, w: GLASS_BLOCK.t, h: 0.45, kind: 'new' },
      { ...SHOWER_GB, kind: 'new', glassBlock: true },
      { ...SUITE_GB, kind: 'new', glassBlock: true },
    ],
    doors: [
      ...sharedDoors,
      { type: 'swing', hinge: { x: 3.43, y: 1.39 }, width: 0.7, along: 'n', into: 'w' },
      { type: 'opening', x: 3.515, y: 5.17, length: 0.7, orientation: 'v' },
      { type: 'sliding', x: SIDE_X + 0.05, y: 5.35, length: 0.75, orientation: 'v' },
    ],
    windows: [
      ...existingWindows,
      { x: SACADA.x, y: D, w: SACADA.w, h: T_S, orientation: 'h', kind: 'new', label: 'Janela de sacada', sill: 0, head: SACADA.head },
    ],
    furniture: [
      { x: BED_X, y: WC_Y - BED_L, w: BED_W, h: BED_L, kind: 'bed', label: '140×190', headSouth: true },
      { x: 2.5, y: 0, w: 0.6, h: 0.4, kind: 'generic', label: 'Cómoda' },
      { x: 1.12, y: 0, w: 1.17, h: 0.6, kind: 'desk', label: 'Secretária' },
      { x: 0, y: 0.1, w: 0.3, h: 1.2, kind: 'generic', label: 'Estante' },
      ...underModules(yTop).map((m) => ({ x: STR.x, y: m.y, w: STR.w, h: m.h, kind: m.kind, label: m.label, only2d: true })),

      { x: SHOWER.w, y: WC_Y + 0.1, w: 0.75, h: 0.45, kind: 'sink' },
      { ...SHOWER, kind: 'shower', label: 'Duche', walkIn: true },
      { x: 1.4, y: D - 0.55, w: 0.4, h: 0.55, kind: 'toilet', label: 'Suspensa' },

      ...suiteFurniture.map((f) => (f.kind === 'shower' ? { ...f, walkIn: true } : f)),
    ],
    stair: { x: STR.x, w: STR.w, topY: yTop, treads: s.treads, going: s.going, cutAt: 7, underFill: { y0: yTop, y1: WC_Y } },
    ceilingOpenings: [{ x: STR.x, y: yTop, w: STR.w, h: s.openingEnd - yTop }],
  }
}

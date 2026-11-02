import { D, T_S, T_W, existingWindows } from './common'
import { CEILING, LST, underL, type LStairCalc } from './stair'
import { lStair } from './lstair'
import { SACADA, cw, f2, hallRoom, nw, r2, sharedDoors, sharedWalls, suiteFurniture, suiteRooms } from './suite'
import type { Plan } from './types'

/** Porta do Quarto 2 (a da antiga sala): dobradiça a sul, abre para dentro do quarto. */
const Q2_DOOR = { hingeY: 1.39, w: 0.7 }
/** O roupeiro do Quarto 2 começa logo atrás da porta aberta (folha de ~4 cm e folga). */
const WARDROBE_Y = Q2_DOOR.hingeY + 0.06

/**
 * WC partilhado. A porta é a do WC atual, agora de correr embutida: a folha recolhe para norte, para dentro da parede do
 * corredor. O duche fica em frente a quem entra, ao fundo da faixa sul, e o lavatório logo à entrada. A sanita suspensa
 * fica debaixo da parte alta da escada, virada para o corredor; a pré-parede do autoclismo fecha os arrumos debaixo dos
 * degraus mais baixos e acaba no alinhamento do duche.
 */
export const WC_C = {
  door: { y: 5.17, w: 0.7 },
  prewall: { x: 2.05, w: 0.15, h: 1.2 },
  /** Sanita: d é o que sai da pré-parede. */
  toilet: { d: 0.55, w: 0.4 },
  sink: { x: 2.85, w: 0.45, d: 0.42 },
}

/** Escada em leque a sul da janela W1, a arrancar da cozinha; o Quarto 2 fica com a N1 e a W1. */
export function buildProposalC(s: LStairCalc): Plan {
  const { xTop, bandY, w } = s
  const q2Y = bandY - 0.1
  const bandEnd = bandY + w
  const wcX = w + 0.1
  const wcW = 3.43 - wcX
  const wcH = D - bandY
  const stripY = bandEnd + 0.1
  const pre = WC_C.prewall
  const showerX1 = pre.x + pre.w
  const toiletX1 = showerX1 + WC_C.toilet.d
  const wcRects = [
    { x: showerX1, y: bandY, w: 3.43 - showerX1, h: stripY - bandY },
    { x: wcX, y: stripY, w: wcW, h: D - stripY },
  ]

  return {
    ceiling: CEILING,
    floorRaise: 0.1,
    dimensions: [
      { x1: 0, y1: -0.8, x2: 3.43, y2: -0.8 },
      { x1: 3.6, y1: -0.8, x2: 4.83, y2: -0.8 },
      { x1: 5.0, y1: -0.8, x2: 8.46, y2: -0.8 },
      { x1: -0.8, y1: 0, x2: -0.8, y2: q2Y },
      { x1: -0.8, y1: bandY, x2: -0.8, y2: D },
      { x1: 9.25, y1: 0, x2: 9.25, y2: 2.85 },
      { x1: 9.25, y1: 2.95, x2: 9.25, y2: D },
    ],
    rooms: [
      {
        id: 'quarto2',
        name: 'Quarto 2',
        rects: [{ x: 0, y: 0, w: 3.43, h: q2Y }],
        tone: 'bed',
        label: { x: 1.65, y: 3.2 },
        area: r2(3.43 * q2Y),
        dims: `3,43 × ${f2(q2Y)}`,
        note: `Fica com a antiga sala e quase todo o Quarto 3: 3,43 × ${f2(q2Y)} m, com as janelas N1 e W1; a parede sul fica a 10 cm do aro da W1. Cama de 140×190 com a cabeceira na fachada poente e as duas laterais livres, secretária junto à W1 e roupeiro de ${f2(q2Y - WARDROBE_Y)} m na parede do corredor, da parede sul até atrás da porta. Mantém a porta atual da sala; a do antigo Quarto 3 é fechada.`,
      },
      {
        id: 'escada',
        name: 'Escada',
        rects: [{ x: 0, y: bandY, w, h: D - bandY }],
        tone: 'stair',
        label: { x: w / 2, y: bandEnd + 0.34 },
        area: r2(w * (D - bandY)),
        dims: `${f2(w)} × ${f2(D - bandY)}`,
        note: `Escada de ${s.risers} degraus e ${f2(w)} m de largura, com leque em vez de patamar. Arranca da cozinha, pelo vão atual alargado para ${f2(w)} m, sobe ${s.treads1} degraus junto à fachada e vira para nascente com ${s.winders} degraus em leque no canto de ${f2(w)} × ${f2(w)} m. O 2.º lanço, de ${s.treads2 + 1} degraus, passa por cima do WC e chega ao sótão a ${f2(LST.xMax - xTop)} m da parede do corredor, com ${f2(s.roofAtTop)} m a meio da escada e ${f2(s.roofAtTopNorth)} m do lado do quarto.`,
      },
      {
        id: 'wc',
        name: 'WC partilhado',
        rects: wcRects,
        tone: 'bath',
        label: { x: 2.52, y: stripY + 0.25 },
        area: r2(wcRects.reduce((a, r) => a + r.w * r.h, 0)),
        dims: `${f2(wcW)} × ${f2(wcH)}`,
        note: `No sítio do WC atual, com a mesma porta para o corredor, agora de correr embutida (${f2(WC_C.door.w)} m; a folha recolhe para norte, para dentro da parede). Quem entra fica de frente para o duche, ao fundo da faixa sul (${f2(showerX1 - wcX)} × ${f2(D - stripY)} m, com o pé-direito todo), e tem o lavatório logo à entrada, na parede sul. A sanita suspensa fica debaixo da parte alta da escada, virada para o corredor, com ${f2(underL(s, showerX1 + 0.01))} a ${f2(underL(s, toiletX1 - 0.01))} m por cima; à frente dela, o canto junto ao corredor tem o pé-direito todo. A pré-parede do autoclismo (${f2(pre.w)} m, até ${f2(pre.h)} m de altura) fecha os arrumos debaixo dos degraus mais baixos. Sem janela: extração mecânica.`,
      },
      {
        id: 'arrumos',
        name: 'Arrumos',
        rects: [{ x: w, y: bandY, w: pre.x - w, h: w }],
        tone: 'service',
        label: { x: (w + pre.x) / 2, y: bandY + 0.21 },
        area: r2((pre.x - w) * w),
        dims: `${f2(pre.x - w)} × ${f2(w)}`,
        note: `Debaixo dos degraus mais baixos do 2.º lanço, com ${f2(underL(s, w + 0.01))} a ${f2(underL(s, pre.x - 0.01))} m de altura. Fica atrás da pré-parede da sanita e abre por cima dela, do lado do WC: dá para o papel, as toalhas e os produtos de limpeza. Se der mais jeito, pode abrir antes para o Quarto 2, com uma porta baixa na parede sul do quarto.`,
      },
      hallRoom('Fica como está: entrada principal, paredes e vãos. Fecham-se só as portas do antigo Quarto 3 e do antigo Quarto 1; a do antigo WC continua a ser a do WC, agora de correr embutida.'),
      ...suiteRooms,
    ],
    walls: [
      { x: 0, y: 2.04, w: 3.43, h: 0.17, kind: 'demolish' },
      { x: 0, y: 4.65, w: 3.43, h: 0.16, kind: 'demolish' },
      { x: 1.66, y: 4.81, w: 0.1, h: 1.51, kind: 'demolish' },
      ...sharedWalls,
      { x: -T_W, y: D, w: T_W, h: T_S, kind: 'existing' },
      { x: 0, y: D, w: 0.46, h: T_S, kind: 'demolish' },
      { x: w, y: D, w: 1.2 - w, h: T_S, kind: 'infill' },
      { x: 1.2, y: D, w: 2.66, h: T_S, kind: 'existing' },

      cw(3.43, 0, 0.69),
      cw(3.43, 1.39, 3.07),
      cw(3.43, 3.07, 3.77, 'infill'),
      cw(3.43, 3.77, 5.17),
      cw(3.43, 5.87, D),

      nw(0, q2Y, 3.43, 0.1),
      nw(w, bandEnd, 0.1, D - bandEnd),
      nw(wcX, bandEnd, showerX1 - wcX, 0.1),
      { x: showerX1, y: bandEnd, w: xTop - showerX1, h: 0.1, kind: 'new', overhead: true },
      { x: pre.x, y: bandY, w: pre.w, h: w, kind: 'new', low: pre.h },
    ],
    doors: [
      ...sharedDoors,
      { type: 'swing', hinge: { x: 3.43, y: Q2_DOOR.hingeY }, width: Q2_DOOR.w, along: 'n', into: 'w' },
      { type: 'sliding', x: 3.515, y: WC_C.door.y, length: WC_C.door.w, orientation: 'v', pocket: true },
      { type: 'opening', x: 0, y: D + T_S / 2, length: w, orientation: 'h' },
    ],
    windows: [
      ...existingWindows,
      { x: SACADA.x, y: D, w: SACADA.w, h: T_S, orientation: 'h', kind: 'new', label: 'Janela de sacada', sill: 0, head: SACADA.head },
    ],
    furniture: [
      { x: 0.03, y: 0.55, w: 1.9, h: 1.4, kind: 'bed', label: '140×190' },
      { x: 0.03, y: 0.1, w: 0.42, h: 0.42, kind: 'nightstand' },
      { x: 0.03, y: 1.98, w: 0.42, h: 0.42, kind: 'nightstand' },
      { x: 2.5, y: 0, w: 0.9, h: 0.5, kind: 'generic', label: 'Cómoda' },
      { x: 0, y: 2.95, w: 0.55, h: 1.0, kind: 'desk', label: 'Secret.' },
      { x: 2.83, y: WARDROBE_Y, w: 0.6, h: q2Y - WARDROBE_Y, kind: 'wardrobe', label: 'Roupeiro' },

      { x: wcX, y: stripY, w: showerX1 - wcX, h: D - stripY, kind: 'shower', label: 'Duche' },
      { x: pre.x, y: bandY + (w - WC_C.toilet.w) / 2, w: toiletX1 - pre.x, h: WC_C.toilet.w, kind: 'toilet', back: 'w' },
      { x: WC_C.sink.x, y: D - WC_C.sink.d, w: WC_C.sink.w, h: WC_C.sink.d, kind: 'sink' },

      ...suiteFurniture,
    ],
    stair: { ...lStair(s), underFill: { x0: w, x1: pre.x, y: bandY, h: w } },
    ceilingOpenings: [
      { x: 0, y: bandY, w: xTop, h: w },
      { x: 0, y: bandEnd, w, h: s.yOpen - bandEnd },
    ],
  }
}

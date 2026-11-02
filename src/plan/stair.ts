import { winderGoing, winderWalk } from './winders'

/** Pé-direito final (2,55 atual − 0,10 de aumento do pavimento). */
export const CEILING = 2.45
export const HEADROOM = 2.0
/** Espessura da laje do sótão (medida: 9,5 cm). */
export const SOFFIT = 0.095
/** Piso a piso confirmado em obra: do chão acabado do R/C (já subido 10 cm) ao chão do sótão. */
export const FLOOR_TO_FLOOR = 2.55
export const MAX_RISER = 0.193

/** Sótão (medido a partir da laje): parede de 0,615 m em todo o perímetro e telhado de 4 águas com 3,50 m no ponto mais alto. */
export const ROOF = { knee: 0.615, ridge: 3.5, W: 8.46, D: 6.32 }
const ROOF_SLOPE = (ROOF.ridge - ROOF.knee) / (ROOF.D / 2)

/** Altura livre do sótão acima da laje num ponto da planta. */
export function roofHeight(x: number, y: number) {
  const d = Math.max(0, Math.min(x, ROOF.W - x, y, ROOF.D - y))
  return Math.min(ROOF.ridge, ROOF.knee + ROOF_SLOPE * d)
}

/** Distância à fachada a partir da qual o sótão tem a altura livre pedida. */
export const distForHeight = (h: number) => (h - ROOF.knee) / ROOF_SLOPE

/** Lanço reto encostado à parede do corredor, a subir de sul para norte. */
export const STR = {
  x: 2.53,
  w: 0.9,
  /** Primeiro espelho, logo a norte do vão do antigo WC. */
  yStart: 5.17,
}

export type StairCalc = {
  floorToFloor: number
  risers: number
  riser: number
  going: number
  blondel: number
  treads: number
  run: number
  /** y do último espelho (chegada ao sótão). */
  yTop: number
  /** Altura livre do telhado por cima da chegada. */
  roofAtTop: number
  /** Fim (lado sul) da abertura no teto. */
  openingEnd: number
  ok: boolean
  warnings: string[]
}

export function calcStair(floorToFloor: number): StairCalc {
  const risers = Math.ceil(floorToFloor / MAX_RISER - 1e-9)
  const riser = floorToFloor / risers
  const treads = risers - 1
  const available = STR.yStart - distForHeight(HEADROOM)
  const going = Math.max(0.25, Math.min(0.63 - 2 * riser, 0.28, available / treads))
  const run = treads * going
  const yTop = STR.yStart - run
  const roofAtTop = roofHeight(STR.x + STR.w / 2, yTop)
  const openingEnd = STR.yStart - ((CEILING - HEADROOM) / riser) * going
  const blondel = 2 * riser + going

  const warnings: string[] = []
  if (roofAtTop < HEADROOM - 1e-3)
    warnings.push(
      `Com esta altura são precisos ${risers} degraus e a escada chega ao sótão onde o telhado só tem ${roofAtTop.toFixed(2).replace('.', ',')} m. Para caber, é preciso pôr 2 ou 3 degraus em leque no arranque.`,
    )
  if (blondel < 0.6 || blondel > 0.66) warnings.push('Fora da regra de Blondel (60–66 cm).')

  return {
    floorToFloor,
    risers,
    riser,
    going,
    blondel,
    treads,
    run,
    yTop,
    roofAtTop,
    openingEnd,
    ok: warnings.length === 0,
    warnings,
  }
}

/** Altura livre por baixo do lanço reto num ponto y (estrutura de ~0,30 m, como no 3D). */
export const underStraight = (s: StairCalc, y: number) => Math.min(((STR.yStart - y) / s.going) * s.riser - 0.3, s.floorToFloor - 0.5)

/** Altura livre por baixo do 2.º lanço da escada em L num ponto x (estrutura fina de ~0,20 m); depois do último degrau fica o pé-direito todo. */
export const underL = (s: LStairCalc, x: number) => {
  if (x >= s.xTop - 1e-6) return CEILING
  const k = Math.floor((x - s.w) / s.going + 1e-9) + 1
  return s.cornerTop + k * s.riser - 0.2
}

/** Escada em L: arranca na antiga despensa, patamar em frente à janela W1 e 2.º lanço a subir para nascente até à parede do corredor. */
export const LST = {
  w: 0.9,
  /** O patamar começa no aro norte da janela W1. */
  bandY: 2.84,
  /** Espelhos até ao patamar ou ao 1.º degrau do leque (fica a ~0,90 m, à altura do peitoril de W1). */
  risers1: 5,
  maxRiser: 0.19,
  /** Parede do corredor: o 2.º lanço não pode passar daqui. */
  xMax: 3.43,
}

/** Proposta E: o patamar fica logo a sul da janela W1 (aro sul a 4,01 + parede de 0,10). */
export const BAND_E = 4.11
/**
 * Proposta C: escada de 1,00 m com 3 degraus em leque no canto. A parede do Quarto 2 fica 10 cm a sul do aro
 * da W1 (4,01 + 0,10 + parede de 0,10). Com 4 espelhos até ao leque, o 1.º espelho fica a ~0,30 m da face
 * interior da parede sul; com 5, ficava encostado ao vão da cozinha.
 */
export const STAIR_C = { bandY: 4.21, w: 1.0, winders: 3, risers1: 4 }

export type LStairCalc = {
  floorToFloor: number
  bandY: number
  /** Largura livre dos lanços (e lado do canto da viragem). */
  w: number
  /** Espelhos do 1.º lanço, até ao patamar ou ao 1.º degrau do leque. */
  risers1: number
  risers: number
  riser: number
  going: number
  blondel: number
  treads1: number
  treads2: number
  /** Degraus em leque no canto; 0 quer dizer patamar. */
  winders: number
  /** Cobertor dos degraus do leque na linha de passo. */
  winderGoing: number
  /** Altura do patamar ou do 1.º degrau do leque. */
  landingH: number
  /** Altura do último degrau do canto (igual a `landingH` com patamar). */
  cornerTop: number
  yStart: number
  xTop: number
  /** Fim (lado sul) da abertura no teto por cima do 1.º lanço. */
  yOpen: number
  roofAtTop: number
  /** Altura do telhado à chegada, do lado norte do lanço. */
  roofAtTopNorth: number
  /** Altura ao centro que o telhado precisaria de ter para dar 2,00 m a meio da chegada. */
  ridgeNeeded: number
  minHeadroom: number
  ok: boolean
  warnings: string[]
}

export type LStairOpts = { bandY?: number; winders?: number; w?: number; risers1?: number }

export function calcL(floorToFloor: number, { bandY = LST.bandY, winders = 0, w = LST.w, risers1 = LST.risers1 }: LStairOpts = {}): LStairCalc {
  const risers = Math.ceil(floorToFloor / LST.maxRiser - 1e-9)
  const riser = floorToFloor / risers
  const turn = Math.max(1, winders)
  const treads1 = risers1 - 1
  const treads2 = risers - risers1 - turn
  const going = Math.min(0.28, Math.max(0.25, 0.63 - 2 * riser), (LST.xMax - w) / treads2)
  const xTop = w + treads2 * going
  const yStart = bandY + w + treads1 * going
  const yOpen = yStart - ((CEILING - HEADROOM) / riser) * going
  const yMid = bandY + w / 2
  const corner = { x: 0, y: bandY, w, h: w }
  const landingH = risers1 * riser
  const cornerTop = landingH + (turn - 1) * riser
  const roofAtTop = roofHeight(xTop, yMid)
  const roofAtTopNorth = roofHeight(xTop, bandY)
  const dTop = Math.max(0.01, Math.min(xTop, ROOF.W - xTop, yMid, ROOF.D - yMid))
  const ridgeNeeded = ROOF.knee + ((HEADROOM - ROOF.knee) * (ROOF.D / 2)) / dTop
  const cornerSteps = winders
    ? Array.from({ length: winders }, (_, j) => ({ ...winderWalk(corner, winders, j), z: landingH + j * riser }))
    : [{ x: w / 2, y: yMid, z: landingH }]
  let minHeadroom = Math.min(...cornerSteps.map((p) => floorToFloor + roofHeight(p.x, p.y) - p.z))
  for (let k = 1; k <= treads2; k++) {
    const x = w + (k - 1) * going
    minHeadroom = Math.min(minHeadroom, floorToFloor + roofHeight(x, yMid) - cornerTop - k * riser)
  }
  const blondel = 2 * riser + going

  const warnings: string[] = []
  if (going < 0.25 - 1e-3)
    warnings.push(
      `Com esta altura são precisos ${risers} degraus e o cobertor desce para ${(going * 100).toFixed(1).replace('.', ',')} cm. Numa escada de habitação é aceitável${winders ? '.' : ', mas um 2.º degrau no patamar (em leque) devolve os 25 cm.'}`,
    )
  const m = (v: number) => v.toFixed(2).replace('.', ',')
  if (roofAtTop < HEADROOM - 1e-3)
    warnings.push(
      `À chegada ao sótão o telhado fica a ${m(roofAtTop)} m a meio da escada (${m(roofAtTopNorth)} m do lado do quarto). Para ter 2,00 m, o telhado precisa de cerca de ${m(ridgeNeeded)} m ao centro: meçam antes de decidir.`,
    )
  if (minHeadroom < HEADROOM - 1e-3) warnings.push('Falta altura livre por baixo do telhado durante a subida.')
  if (blondel < 0.6 || blondel > 0.66) warnings.push('Fora da regra de Blondel (60–66 cm).')

  return {
    floorToFloor,
    bandY,
    w,
    risers1,
    risers,
    riser,
    going,
    blondel,
    treads1,
    treads2,
    winders,
    winderGoing: winders ? winderGoing(corner, winders) : 0,
    landingH,
    cornerTop,
    yStart,
    xTop,
    yOpen,
    roofAtTop,
    roofAtTopNorth,
    ridgeNeeded,
    minHeadroom,
    ok: warnings.length === 0,
    warnings,
  }
}

/** Escada da Proposta C: canto a sul da W1, com leque em vez de patamar. */
export const calcC = (floorToFloor: number) => calcL(floorToFloor, STAIR_C)
/** Escada da Proposta E (arquivada): patamar logo a sul da W1, com 0,90 m. */
export const calcE = (floorToFloor: number) => calcL(floorToFloor, { bandY: BAND_E })

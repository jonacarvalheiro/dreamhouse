import type { ReactNode } from 'react'
import { D } from '@/plan/common'
import { StairSection } from '@/components/StairSection'
import { StairSectionL } from '@/components/StairSectionL'
import { WC_C } from '@/plan/proposalC'
import { PASS_W, passClearance } from '@/plan/proposalE'
import { ROOF, STR, type LStairCalc, type StairCalc } from '@/plan/stair'
import type { Plan } from '@/plan/types'
import { winderRisers } from '@/plan/winders'

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',')

export type Variant = 'a' | 'c' | 'e'

export const variantLabels: Record<Variant, { short: string; long: string }> = {
  a: { short: 'Proposta A', long: 'Escada reta junto ao corredor' },
  c: { short: 'Proposta C', long: 'Escada em leque pela cozinha' },
  e: { short: 'Proposta E', long: 'WC a norte, closet sob a escada' },
}

/** PDFs das plantas da Proposta C, gerados com `npm run plantas` para a pasta `public/`. */
export const plantasPdf = [
  { file: 'plantas/plantas-proposta-c.pdf', label: 'Norte em cima', flip: false },
  { file: 'plantas/plantas-proposta-c-entrada-em-baixo.pdf', label: 'Entrada em baixo', flip: true },
]

/** Folha de cada ofício nos dois PDFs (o script das plantas confirma a ordem). */
export const tradePdfPage = { pedreiro: 6, canalizador: 7, eletricista: 8 }

export type Content = {
  /** Corte pela escada, com o telhado. */
  section: ReactNode
  sectionCaption: string
  specs: [string, string][]
  ok: boolean
  warnings: string[]
  /** Medidas de implantação da escada. */
  setout: [string, string][]
}

const stepsRow = (s: { risers: number; riser: number; going: number; floorToFloor: number }): [string, string][] => [
  ['Altura a vencer', `${fmt(s.floorToFloor)} m, do chão acabado do R/C ao chão acabado do sótão`],
  ['Degraus', `${s.risers} espelhos de ${fmt(s.riser * 100, 1)} cm · cobertor de ${fmt(s.going * 100, 1)} cm`],
]

const setoutStraight = (s: StairCalc): [string, string][] => [
  ['Lanço', `Reto, ${fmt(STR.w)} m livres entre x ${fmt(STR.x)} e ${fmt(STR.x + STR.w)}, a subir de sul para norte`],
  ['1.º espelho', `y ${fmt(STR.yStart)} (alinhado com o aro norte da porta do átrio)`],
  ['Último espelho', `y ${fmt(s.yTop)} (chegada ao sótão)`],
  ...stepsRow(s),
]

/** Onde vai cada espelho inclinado do leque, a partir do canto da parede do WC. */
const winderEnds = (s: LStairCalc) =>
  winderRisers({ x: 0, y: s.bandY, w: s.w, h: s.w }, s.winders)
    .map((e, j) => `o ${s.risers1 + 1 + j}.º vai até ${e.x < 1e-6 ? `à fachada em y ${fmt(e.y)}` : `à parede do quarto em x ${fmt(e.x)}`}`)
    .join(' e ')

const setoutL = (s: LStairCalc): [string, string][] => [
  s.winders
    ? ['1.º lanço', `x 0,00 a ${fmt(s.w)}, a subir para norte; 1.º espelho a y ${fmt(s.yStart)}; o ${s.risers1}.º, a y ${fmt(s.bandY + s.w)}, já é do leque`]
    : ['1.º lanço', `x 0,00 a ${fmt(s.w)}, a subir para norte; 1.º espelho a y ${fmt(s.yStart)}, ${s.risers1} espelhos até ao patamar`],
  s.winders
    ? [
        'Leque',
        `x 0,00 a ${fmt(s.w)}, y ${fmt(s.bandY)} a ${fmt(s.bandY + s.w)}, sem patamar: ${s.winders} degraus com os espelhos a partir do canto da parede do WC (x ${fmt(s.w)}, y ${fmt(s.bandY + s.w)}); ${winderEnds(s)}`,
      ]
    : ['Patamar', `x 0,00 a ${fmt(s.w)}, y ${fmt(s.bandY)} a ${fmt(s.bandY + s.w)}, a ${fmt(s.landingH)} m do chão`],
  ['2.º lanço', `y ${fmt(s.bandY)} a ${fmt(s.bandY + s.w)}, a subir para nascente; 1.º espelho a x ${fmt(s.w)}, último a x ${fmt(s.xTop)}`],
  ...stepsRow(s),
]

/** Legenda do corte poente–nascente: a escada fica debaixo da água sul, por isso o telhado por cima dela é plano no corte. */
const sectionCaptionL = (s: LStairCalc, corner: string) =>
  `Corte poente–nascente pelo ${corner} e pelo eixo do 2.º lanço, a ${fmt(D - s.bandY - s.w / 2)} m da parede sul. A cheio, a telha por cima da escada; a tracejado, a telha mais a norte, que sobe até à cumeeira, a ${fmt(ROOF.ridge)} m da laje.`

export function contentA(s: StairCalc): Content {
  return {
    section: <StairSection s={s} />,
    sectionCaption: 'Corte norte–sul pelo lanço.',
    specs: [
      ['Degraus', `${s.risers} × ${fmt(s.riser * 100, 1)} cm`],
      ['Cobertor', `${fmt(s.going * 100, 1)} cm`],
      ['Blondel (2e+c)', `${fmt(s.blondel * 100, 1)} cm`],
      ['Comprimento', `${fmt(s.run)} m`],
      ['Largura livre', `${fmt(STR.w)} m`],
      ['Abertura no teto', `${fmt(STR.w)} × ${fmt(s.openingEnd - s.yTop)} m`],
      ['Altura no sótão à chegada', `${fmt(s.roofAtTop)} m`],
    ],
    ok: s.ok,
    warnings: s.warnings,
    setout: setoutStraight(s),
  }
}

export function contentC(s: LStairCalc): Content {
  const openTail = s.yOpen - s.bandY - s.w
  return {
    section: <StairSectionL s={s} store={{ x1: WC_C.prewall.x, w: WC_C.prewall.w, h: WC_C.prewall.h }} />,
    sectionCaption: sectionCaptionL(s, 'leque'),
    specs: [
      ['Degraus', `${s.risers} × ${fmt(s.riser * 100, 1)} cm`],
      ['Cobertor', `${fmt(s.going * 100, 1)} cm`],
      ['Blondel (2e+c)', `${fmt(s.blondel * 100, 1)} cm`],
      ['1.º lanço', `${s.treads1} degraus · ${fmt(s.treads1 * s.going)} m`],
      ['Leque', `${s.winders} degraus · ${fmt(s.winderGoing * 100, 1)} cm a meio`],
      ['2.º lanço', `${s.treads2 + 1} degraus · ${fmt(s.treads2 * s.going)} m`],
      ['Largura livre', `${fmt(s.w)} m`],
      ['Abertura no teto', `${fmt(s.xTop)} × ${fmt(s.w)} + ${fmt(s.w)} × ${fmt(openTail)} m`],
      ['Altura livre mínima', `${fmt(s.minHeadroom)} m`],
      ['Altura no sótão à chegada', `${fmt(s.roofAtTop)} – ${fmt(s.roofAtTopNorth)} m`],
    ],
    ok: s.ok,
    warnings: s.warnings,
    setout: setoutL(s),
  }
}

export function contentE(s: LStairCalc, plan: Plan): Content {
  const closet = plan.rooms.find((r) => r.id === 'closet2')?.area ?? 0
  const pass = passClearance(s)
  return {
    section: <StairSectionL s={s} underLabel="armário" />,
    sectionCaption: sectionCaptionL(s, 'patamar'),
    specs: [
      ['Degraus', `${s.risers} × ${fmt(s.riser * 100, 1)} cm`],
      ['Cobertor', `${fmt(s.going * 100, 1)} cm`],
      ['Blondel (2e+c)', `${fmt(s.blondel * 100, 1)} cm`],
      ['1.º lanço', `${s.risers1} degraus · ${fmt(s.treads1 * s.going)} m`],
      ['Patamar', `${fmt(s.w)} × ${fmt(s.w)} a ${fmt(s.landingH)} m`],
      ['2.º lanço', `${s.treads2 + 1} degraus · ${fmt(s.treads2 * s.going)} m`],
      ['Largura livre', `${fmt(s.w)} m`],
      ['Passagem sob a escada', `${fmt(PASS_W)} m · ${fmt(pass[0])}–${fmt(pass[1])} m`],
      ['Closet', `${fmt(closet, 1)} m²`],
      ['Altura livre mínima', `${fmt(s.minHeadroom)} m`],
      ['Altura no sótão à chegada', `${fmt(s.roofAtTop)} – ${fmt(s.roofAtTopNorth)} m`],
    ],
    ok: s.ok,
    warnings: s.warnings,
    setout: setoutL(s),
  }
}

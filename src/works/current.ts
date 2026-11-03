import { buildProposalC } from '@/plan/proposalC'
import { FLOOR_TO_FLOOR, calcC } from '@/plan/stair'
import { electricianMaterials, masonMaterials, plumberMaterials, type TradeMaterials } from './materials'
import { electricianData, type Trade } from './trades'

/** A proposta escolhida (C): é dela que saem a página da obra e a lista de compras. */
const sC = calcC(FLOOR_TO_FLOOR)
export const plan = buildProposalC(sC)
export const stair = { kind: 'l', s: sC } as const
export const materials: Record<Trade, TradeMaterials> = {
  pedreiro: masonMaterials(plan),
  canalizador: plumberMaterials(plan),
  eletricista: electricianMaterials(plan, electricianData(plan, stair)),
}

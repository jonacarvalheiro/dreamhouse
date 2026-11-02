import { renderToStaticMarkup } from 'react-dom/server'
import { FloorPlan } from '@/components/FloorPlan'
import { contentC, tradePdfPage, variantLabels } from '@/content'
import { existingPlan } from '@/plan/existing'
import { buildProposalC } from '@/plan/proposalC'
import { FLOOR_TO_FLOOR, calcC } from '@/plan/stair'
import type { Plan } from '@/plan/types'
import { flipNote, tradeInfo, trades } from '@/works/trades'
import { electricianSheet, masonSheet, plumberSheet, stairSheet, tradeCss, type Body, type Proposal } from './plantas-obra'

export { plantasPdf } from '@/content'

const fmt = (v: number) => v.toFixed(2).replace('.', ',')

const sC = calcC(FLOOR_TO_FLOOR)
const planC = buildProposalC(sC)

type Page = { title: string; subtitle: string; kind: string; render: (n: number) => string }

const legend = (works: boolean) =>
  [
    ['#f5ecdc', 'Quartos'],
    ['#dcebf3', 'WC'],
    ['#ebe4f4', 'Closet'],
    ['#e3ecdf', 'Escada'],
    ...(works
      ? [
          ['#292524', 'Paredes a manter'],
          ['#ea580c', 'Paredes novas'],
          ['#fee2e2', 'A demolir'],
          ['#e0f2fe', 'Blocos de vidro'],
        ]
      : []),
  ]
    .map(([c, l]) => `<span class="sw"><i style="background:${c}"></i>${l}</span>`)
    .join('')

function planBody(plan: Plan, works: boolean, flip: boolean) {
  const svg = renderToStaticMarkup(
    <FloorPlan plan={plan} flip={flip} showFurniture={!works} showDims showWorks={works} hovered={null} onHover={() => {}} />,
  )
  const rows = plan.rooms
    .map((r) => `<tr><td>${r.name}</td><td>${r.dims ?? ''}</td><td class="n">${fmt(r.area)} m²</td></tr>`)
    .join('')
  const total = plan.rooms.reduce((a, r) => a + r.area, 0)
  return `<div class="body">
    <div class="plan">${svg}</div>
    <aside>
      <table><thead><tr><th>Divisão</th><th>Medidas</th><th class="n">Área</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>Total</td><td></td><td class="n">${fmt(total)} m²</td></tr></tfoot></table>
      <div class="legend">${legend(works)}</div>
      <p class="note">Medidas interiores em metros, a partir da face interior das paredes poente e norte.${flipNote(flip)} Piso a piso ${fmt(FLOOR_TO_FLOOR)} m; pé-direito final 2,45 m. Estudo prévio: não substitui o projeto de arquitetura e de estabilidade.</p>
    </aside>
  </div>`
}

const tradePage = (title: string, kind: string, body: () => Body, frame: (title: string, subtitle: string, n: number, body: string) => string): Page => {
  let cached: Body | undefined
  const get = () => (cached ??= body())
  return {
    title,
    get subtitle() {
      return get().subtitle
    },
    kind,
    render: (n) => frame(title, get().subtitle, n, get().html),
  }
}

function indexBody(pages: Page[], flip: boolean) {
  const groups = new Map<string, { kind: string; n: number }[]>()
  pages.forEach((pg, i) => {
    if (i === 0) return
    const list = groups.get(pg.title) ?? []
    list.push({ kind: pg.kind, n: i + 1 })
    groups.set(pg.title, list)
  })
  const what: Record<string, string> = {
    Planta: 'Como está hoje.',
    'Planta mobilada': 'Divisões, áreas e mobiliário.',
    'Planta de obra': 'Paredes a demolir, a construir e vãos a fechar.',
    Escada: 'Degraus, implantação, abertura na laje e corte.',
    ...Object.fromEntries(trades.map((t) => [tradeInfo[t].label, tradeInfo[t].scope])),
  }
  const cols = [...groups.entries()]
    .map(
      ([title, list]) => `<div class="idx"><h2>${title}</h2><table><tbody>${list
        .map((l) => `<tr><td class="n">${l.n}</td><td><b>${l.kind}</b></td><td>${what[l.kind] ?? ''}</td></tr>`)
        .join('')}</tbody></table></div>`,
    )
    .join('')
  return `<div class="index">${cols}</div>
  <div class="index-notes">
    ${flip ? '<p><b>Plantas rodadas 180°</b>: a entrada fica em baixo e o norte aponta para baixo. Não é um espelho: as portas, as escadas e os textos ficam como na obra.</p>' : ''}
    <p><b>Medidas</b> em metros, a partir da face interior da parede poente (x) e da parede norte (y), como nas plantas${flip ? ' (o canto interior noroeste fica em baixo à direita)' : ''}. Saem do levantamento: confirmem em obra antes de marcar, sobretudo as paredes existentes.</p>
    <p><b>Calculado a partir das plantas</b>: degraus, implantação da escada, aberturas na laje, paredes, vãos, blocos de vidro e posição dos pontos de água e de eletricidade.</p>
    <p><b>Valores de referência</b> (alturas de torneiras, sanitas, tomadas e interruptores, caudais): indicativos, a confirmar com o fabricante, com o canalizador e com o eletricista (RTIEBT).</p>
    <p>Piso a piso ${fmt(FLOOR_TO_FLOOR)} m; o pavimento sobe 10 cm e o pé-direito final fica com 2,45 m. Estudo prévio: não substitui o projeto de arquitetura, de estabilidade e de especialidades.</p>
  </div>`
}

/** Folhas em A3 da planta existente e da Proposta C; com `flip`, as plantas ficam com a entrada em baixo. */
export function render({ flip = false }: { flip?: boolean } = {}) {
  const p: Proposal = { label: 'Proposta C', long: variantLabels.c.long, plan: planC, content: contentC(sC), stair: { kind: 'l', s: sC }, flip }
  const pages: Page[] = []
  const frame = (title: string, subtitle: string, n: number, body: string) => `<section class="page">
  <header><div><h1>${title}</h1><p>${subtitle}${flip ? ' · entrada em baixo' : ''}</p></div><div class="meta">Remodelação · Casa principal (R/C)<br/>Folha ${n} de ${pages.length}</div></header>
  ${body}
</section>`
  const planPage = (title: string, subtitle: string, kind: string, plan: Plan, works: boolean): Page => ({
    title,
    subtitle,
    kind,
    render: (n) => frame(title, subtitle, n, planBody(plan, works, flip)),
  })

  const index: Page = { title: 'Plantas e medidas para a obra', subtitle: 'Existente e Proposta C', kind: 'Índice', render: (n) => frame(index.title, index.subtitle, n, indexBody(pages, flip)) }
  pages.push(index)
  pages.push(planPage('Existente', 'Levantamento do R/C', 'Planta', existingPlan, false))
  const works = pages.length + 2
  const plumber = pages.length + 5
  pages.push(planPage(p.label, `${p.long} · planta mobilada`, 'Planta mobilada', p.plan, false))
  pages.push(planPage(p.label, `${p.long} · planta de obra (demolir / construir)`, 'Planta de obra', p.plan, true))
  pages.push(tradePage(p.label, 'Escada', () => stairSheet(p, works), frame))
  pages.push(tradePage(p.label, tradeInfo.pedreiro.label, () => masonSheet(p, works, plumber), frame))
  pages.push(tradePage(p.label, tradeInfo.canalizador.label, () => plumberSheet(p), frame))
  pages.push(tradePage(p.label, tradeInfo.eletricista.label, () => electricianSheet(p), frame))
  for (const t of trades)
    if (pages[tradePdfPage[t] - 1]?.kind !== tradeInfo[t].label) throw new Error(`A folha do ${tradeInfo[t].label.toLowerCase()} já não é a ${tradePdfPage[t]}: corrigir tradePdfPage em src/content.tsx`)

  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"/><title>Plantas da Proposta C${flip ? ' (entrada em baixo)' : ''}</title><style>
@page { size: A3 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1c1917; }
.page { height: calc(297mm - 24mm); display: flex; flex-direction: column; page-break-after: always; break-after: page; overflow: hidden; }
.page:last-child { page-break-after: auto; break-after: auto; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #1c1917; padding-bottom: 4mm; margin-bottom: 5mm; }
h1 { margin: 0; font-size: 22pt; }
header p { margin: 1mm 0 0; color: #57534e; font-size: 11pt; }
.meta { text-align: right; font-size: 9pt; color: #78716c; }
.body { flex: 1; display: flex; gap: 8mm; min-height: 0; }
.plan { flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0; }
.plan svg { width: 100%; height: 100%; max-height: 100%; }
aside { width: 95mm; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 1.2mm 1mm; border-bottom: 0.5px solid #d6d3d1; }
th { font-size: 8pt; text-transform: uppercase; color: #78716c; }
.n { text-align: right; white-space: nowrap; }
tfoot td { font-weight: 600; border-bottom: none; }
.legend { margin-top: 6mm; display: flex; flex-wrap: wrap; gap: 2mm 4mm; }
.sw { display: inline-flex; align-items: center; gap: 1.5mm; }
.sw i { display: inline-block; width: 6mm; height: 3mm; border: 0.5px solid #a8a29e; }
.note { margin-top: 2mm; color: #78716c; font-size: 7.5pt; line-height: 1.4; }
aside .note { margin-top: 6mm; font-size: 8pt; }
.index { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8mm; font-size: 10pt; }
.index h2 { font-size: 13pt; margin: 0 0 2mm; }
.index td.n { width: 8mm; color: #78716c; }
.index-notes { margin-top: 12mm; max-width: 260mm; font-size: 10pt; line-height: 1.5; color: #44403c; }
.index-notes p { margin: 0 0 3mm; }
${tradeCss}
</style></head><body>${pages.map((pg, i) => pg.render(i + 1)).join('')}</body></html>`
}

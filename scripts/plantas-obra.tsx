import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TradePlan } from '@/components/TradePlan'
import type { Content } from '@/content'
import { CEILING, HEADROOM, STR, type LStairCalc, type StairCalc } from '@/plan/stair'
import type { Plan } from '@/plan/types'
import { winderRisers } from '@/plan/winders'
import { f, xy } from '@/works/geometry'
import { REF, electricianData, flipNote, legendEl, masonData, plumberData, type Block, type Row } from '@/works/trades'

export type Proposal = {
  label: string
  long: string
  plan: Plan
  content: Content
  stair: { kind: 'straight'; s: StairCalc } | { kind: 'l'; s: LStairCalc }
  /** Plantas rodadas 180°, com a entrada em baixo. */
  flip?: boolean
}

export type Body = { subtitle: string; html: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function table(title: string, head: string[], rows: Row[], opts: { cls?: string; raw?: boolean } = {}) {
  const cell = (v: string | number) => (opts.raw ? String(v) : esc(String(v)))
  const thead = head.some(Boolean) ? `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : ''
  return `<div class="block ${opts.cls ?? ''}"><h3>${esc(title)}</h3><table>${thead}<tbody>${rows
    .map((r) => (r.length === 1 ? `<tr class="grp"><td colspan="${head.length || 2}">${cell(r[0])}</td></tr>` : `<tr>${r.map((v) => `<td>${cell(v)}</td>`).join('')}</tr>`))
    .join('')}</tbody></table></div>`
}

const note = (html: string) => `<p class="note">${html}</p>`
const block = (b: Block | undefined) => (b ? table(b.title, b.head, b.rows) + (b.note ? note(esc(b.note)) : '') : '')

/* ---------- Escada ---------- */

function stairSteps(p: Proposal): Row[] {
  if (p.stair.kind === 'straight') {
    const s = p.stair.s
    return Array.from({ length: s.risers }, (_, i) => {
      const k = i + 1
      return [k, `y ${f(STR.yStart - i * s.going)}`, `${f(k * s.riser)} m`, k === s.risers ? 'chegada ao sótão' : k === 1 ? '1.º degrau' : '']
    })
  }
  const s = p.stair.s
  const rows: Row[] = []
  for (let k = 1; k <= s.risers1; k++)
    rows.push([k, `y ${f(s.yStart - (k - 1) * s.going)}`, `${f(k * s.riser)} m`, k === 1 ? '1.º lanço' : k === s.risers1 ? (s.winders ? 'leque' : 'patamar') : ''])
  if (s.winders)
    winderRisers({ x: 0, y: s.bandY, w: s.w, h: s.w }, s.winders).forEach((e, j) => {
      const k = s.risers1 + 1 + j
      rows.push([k, e.x < 1e-6 ? `canto → y ${f(e.y)}` : `canto → x ${f(e.x)}`, `${f(k * s.riser)} m`, ''])
    })
  const first2 = s.risers1 + Math.max(1, s.winders)
  for (let k = first2; k <= s.risers; k++)
    rows.push([k, `x ${f(s.w + (k - first2) * s.going)}`, `${f(k * s.riser)} m`, k === first2 ? '2.º lanço' : k === s.risers ? 'chegada ao sótão' : ''])
  return rows
}

export function stairSheet(p: Proposal, worksSheet: number): Body {
  const c = p.content
  const svg = renderToStaticMarkup(<>{c.section as ReactNode}</>)
  const s = p.stair.s
  const blondelOk = s.blondel >= 0.6 && s.blondel <= 0.66
  const st = p.stair
  const straight = st.kind === 'straight'
  const run = st.kind === 'straight' ? st.s.run : st.s.treads1 * s.going + st.s.w + st.s.treads2 * s.going
  const width = st.kind === 'straight' ? STR.w : st.s.w
  const corner = st.kind === 'l' && st.s.winders ? 'leque' : 'patamar'
  const fanNote =
    st.kind === 'l' && st.s.winders ? ` No leque, os espelhos saem do canto da parede do WC (${xy(st.s.w, st.s.bandY + st.s.w)}) até ao ponto indicado na parede.` : ''
  const facts: Row[] = [
    ['Altura piso a piso', `${f(s.floorToFloor)} m (chão acabado do R/C ao chão acabado do sótão)`],
    ['Espelhos', `${s.risers} × ${f(s.riser * 100, 1)} cm`],
    [
      'Cobertores',
      st.kind === 'straight'
        ? `${st.s.treads} × ${f(s.going * 100, 1)} cm`
        : `${st.s.treads1 + st.s.treads2} × ${f(s.going * 100, 1)} cm ${st.s.winders ? `(mais ${st.s.winders} em leque, com ${f(st.s.winderGoing * 100, 1)} cm a meio)` : '(mais o patamar)'}`,
    ],
    ['Regra de Blondel (2e + c)', `${f(s.blondel * 100, 1)} cm · ${blondelOk ? 'dentro dos 60–66 cm' : 'fora dos 60–66 cm'}`],
    ['Largura livre', `${f(width)} m`],
    ['Comprimento em planta', straight ? `${f(run)} m (lanço reto)` : `${f(run)} m (1.º lanço + ${corner} + 2.º lanço)`],
    st.kind === 'straight'
      ? ['Altura livre na subida', `${f(HEADROOM)} m na borda da abertura (critério do cálculo)`]
      : ['Altura livre mínima na subida', `${f(st.s.minHeadroom)} m`],
    [
      'Altura no sótão à chegada',
      st.kind === 'straight' ? `${f(st.s.roofAtTop)} m por baixo do telhado` : `${f(st.s.roofAtTop)} m a meio da escada, ${f(st.s.roofAtTopNorth)} m do lado norte`,
    ],
    ['Pé-direito final do R/C', `${f(CEILING)} m (o pavimento sobe 10 cm)`],
  ]
  const known = new Set(['Altura a vencer', 'Degraus'])
  const setout = c.setout.filter(([k]) => !known.has(k))
  const openings = (p.plan.ceilingOpenings ?? []).map((o, i, all) => [
    `Abertura na laje${all.length > 1 ? ` (${i + 1})` : ''}`,
    `${f(o.w)} × ${f(o.h)} m: x ${f(o.x)} a ${f(o.x + o.w)}, y ${f(o.y)} a ${f(o.y + o.h)}`,
  ])
  const steps = stairSteps(p)
  const half = Math.ceil(steps.length / 2)
  const warn = c.warnings.length ? `<div class="warn">${c.warnings.map(esc).join('<br/>')}</div>` : ''

  return {
    subtitle: `${p.long} · escada`,
    html: `<div class="cols stair">
  <div class="col wide">
    <div class="figure">${svg}</div>
    <p class="caption">${esc(c.sectionCaption)} ${straight ? 'Norte à esquerda' : 'Poente à esquerda'}; a altura da telha está medida a partir da laje e a linha azul marca a altura livre de ${f(HEADROOM)} m.</p>
    ${warn}
    ${table('Guardas e corrimão (referência)', ['', ''], [
      ['Corrimão', 'a ~0,90 m da aresta dos degraus, pelo menos de um lado'],
      ['Guarda na abertura do sótão', 'pelo menos 0,90 m (1,00–1,10 m recomendado), sem elementos que se escalem, com vãos de 10 cm no máximo'],
      ['Degraus abertos', 'se os espelhos forem vazados, o vão não deve deixar passar uma esfera de 10 cm'],
    ])}
    ${note(`${REF} Confirmar com o projeto e a regulamentação aplicável.`)}
  </div>
  <div class="col">
    ${table('Dados da escada', ['', ''], facts)}
    ${table('Implantação (a partir do canto interior noroeste)', ['', ''], [...setout, ...openings])}
    ${note(`x medido a partir da face interior da parede poente, y a partir da face interior da parede norte.${flipNote(p.flip)} A abertura na laje está desenhada a tracejado verde na planta de obra (folha ${worksSheet}). Um engenheiro deve dimensionar as vigas de bordadura antes de cortar.`)}
  </div>
  <div class="col">
    <div class="block"><h3>Marcação dos espelhos</h3><div class="pair">${table('', ['N.º', 'Onde', 'Altura', ''], steps.slice(0, half))}${table('', ['N.º', 'Onde', 'Altura', ''], steps.slice(half))}</div></div>
    ${note(
      straight
        ? 'Posição de cada espelho (y) e altura do cobertor acima do chão acabado do R/C. O lanço sobe de sul para norte.'
        : `Posição de cada espelho (y no 1.º lanço, x no 2.º) e altura acima do chão acabado do R/C. O 1.º lanço sobe para norte; o 2.º, para nascente.${fanNote}`,
    )}
  </div>
</div>`,
  }
}

/* ---------- Pedreiro ---------- */

export function masonSheet(p: Proposal, worksSheet: number, plumberSheet: number): Body {
  const m = masonData(p.plan, { works: `a planta de obra (folha ${worksSheet})`, trades: `pontos na folha ${plumberSheet} e seguinte` })
  return {
    subtitle: `${p.long} · pedreiro`,
    html: `<div class="cols">
  <div class="col">
    ${block(m.walls)}
  </div>
  <div class="col">
    ${block(m.doors)}
    ${block(m.slab)}
  </div>
  <div class="col">
    ${block(m.floor)}
    ${block(m.glass)}
    ${block(m.showers)}
    ${block(m.others)}
  </div>
</div>`,
  }
}

/* ---------- Canalizador ---------- */

export function plumberSheet(p: Proposal): Body {
  const d = plumberData(p.plan, p.flip)
  const svg = renderToStaticMarkup(<TradePlan plan={p.plan} flip={p.flip} marks={d.marks} lines={d.lines} />)
  return {
    subtitle: `${p.long} · canalizador`,
    html: `<div class="cols plan-left">
  <div class="planbox">${svg}</div>
  <div class="col">
    ${block(d.points)}
    ${block(d.general)}
    ${note(esc(d.note))}
  </div>
</div>`,
  }
}

/* ---------- Eletricista ---------- */

export function electricianSheet(p: Proposal): Body {
  const d = electricianData(p.plan, p.stair, p.flip)
  const svg = renderToStaticMarkup(<TradePlan plan={p.plan} flip={p.flip} marks={d.marks} zones={d.zones} />)
  const { title, head } = d.points
  const [left, right] = splitGroups(d.points.rows)

  return {
    subtitle: `${p.long} · eletricista`,
    html: `<div class="cols plan-el">
  <div class="planbox">${svg}<div class="legend">${legendEl.map(([k, c, l]) => `<span class="sym"><b style="background:${c}">${k}</b>${l}</span>`).join('')}<span class="sym"><i class="zone"></i>Zona 2 do duche</span></div>
    ${block(d.rules)}
    ${block(d.supplies)}
    ${note(esc(d.note))}
  </div>
  <div class="col">${table(title, head, left)}</div>
  <div class="col">${table(right[0]?.length === 1 ? '' : title, head, right)}
  </div>
</div>`,
  }
}

/** Divide as linhas em duas colunas, sem partir divisões (cada uma começa numa linha de grupo). */
function splitGroups(rows: Row[]): [Row[], Row[]] {
  const groups: Row[][] = []
  for (const r of rows) {
    if (r.length === 1 || !groups.length) groups.push([])
    groups[groups.length - 1].push(r)
  }
  const weight = (g: Row[]) => g.reduce((s, r) => s + 1 + r.join(' ').length / 90, 0)
  const total = groups.reduce((s, g) => s + weight(g), 0)
  let acc = 0
  let i = 0
  while (i < groups.length && acc + weight(groups[i]) / 2 < total / 2) acc += weight(groups[i++])
  return [groups.slice(0, i).flat(), groups.slice(i).flat()]
}

export const tradeCss = `
.cols { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7mm; min-height: 0; font-size: 8pt; }
.cols.stair { grid-template-columns: 1.35fr 1fr 0.9fr; }
.cols.plan-left { grid-template-columns: 205mm 1fr; }
.cols.plan-el { grid-template-columns: 150mm 1fr 1fr; gap: 6mm; }
.col { min-width: 0; }
.planbox { min-width: 0; display: flex; flex-direction: column; }
.planbox svg { width: 100%; height: auto; }
.figure svg { width: 100%; height: auto; max-height: 165mm; }
.caption { margin: 1mm 0 3mm; color: #78716c; font-size: 7.5pt; }
.block { margin-bottom: 4mm; }
.block h3 { margin: 0 0 1.5mm; font-size: 9.5pt; }
.block h3:empty { display: none; }
.block table td, .block table th { padding: 0.9mm 1mm; vertical-align: top; }
.block table td:first-child { font-weight: 600; white-space: nowrap; }
.block tr.grp td { background: #f5f5f4; font-weight: 700; padding-top: 1.4mm; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.pair .block { margin: 0; }
.warn { border: 0.5px solid #f59e0b; background: #fffbeb; color: #92400e; padding: 2mm; margin-bottom: 3mm; font-size: 8pt; }
.legend .sym { display: inline-flex; align-items: center; gap: 1.2mm; font-size: 7.5pt; }
.legend .sym b { display: inline-flex; width: 4mm; height: 4mm; border-radius: 50%; color: white; font-size: 6.5pt; align-items: center; justify-content: center; }
.legend .sym i.zone { display: inline-block; width: 6mm; height: 3mm; border: 0.8px dashed #dc2626; background: #fef2f2; }
`

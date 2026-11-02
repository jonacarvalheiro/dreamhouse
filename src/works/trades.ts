import { bonina } from './bonina'
import { WASTE } from '@/decor/data'
import { D, GLASS_BLOCK } from '@/plan/common'
import { glassBlockCount, horizontalWall, wallAction, whereDoor, whereWall, workWalls } from '@/plan/setout'
import { CEILING, STR, type LStairCalc, type StairCalc } from '@/plan/stair'
import type { Door, Plan, Rect, Room } from '@/plan/types'
import { baths } from './baths'
import { at, center, centroid, clearOfDoors, distToRect, doorSpan, edge, f, furnitureIn, inRoom, outward, roomAt, sideInfo, sideName, wallLabel, xy, type Side } from './geometry'

export type Row = (string | number)[]
export type Block = { title: string; head: string[]; rows: Row[]; note?: string }
export type Mark = { x: number; y: number; code: string; color: string; ghost?: boolean }
export type Line = { x1: number; y1: number; x2: number; y2: number; color: string }
export type Zone = Rect & { color: string }
export type StairRef = { kind: 'straight'; s: StairCalc } | { kind: 'l'; s: LStairCalc }

export type Trade = 'pedreiro' | 'canalizador' | 'eletricista'
export const trades: Trade[] = ['pedreiro', 'canalizador', 'eletricista']
export const tradeInfo: Record<Trade, { label: string; scope: string }> = {
  pedreiro: { label: 'Pedreiro', scope: 'Paredes, vãos, abertura na laje, pavimento e duches.' },
  canalizador: { label: 'Canalizador', scope: 'Pontos de água, esgoto e extração em cada WC.' },
  eletricista: { label: 'Eletricista', scope: 'Luz, interruptores, tomadas e zonas dos WC.' },
}
/** Endereço do separador de um ofício no site (com a planta rodada, se for o caso). */
export const tradeHref = (t: Trade, flip: boolean) => `${import.meta.env.BASE_URL}?obra=${t}${flip ? '&flip=1' : ''}`

export const REF = 'Valores de referência: confirmar com o fabricante e em obra.'
/** Lembrete nas folhas com a planta rodada: as coordenadas não mudam, mas a origem passa para o canto inferior direito. */
export const flipNote = (flip?: boolean) => (flip ? ' A planta está rodada 180° (entrada em baixo): o canto interior noroeste, de onde se medem x e y, fica em baixo à direita.' : '')

/* ---------- Pedreiro ---------- */

/** refs: como cada saída aponta para a planta de obra e para as folhas dos outros ofícios. */
export function masonData(plan: Plan, refs: { works: string; trades: string }) {
  const walls: Row[] = workWalls(plan).map((w) => {
    const horiz = horizontalWall(w)
    const len = w.glassBlock ? Math.max(w.w, w.h) : horiz ? w.w : w.h
    const t = w.glassBlock ? GLASS_BLOCK.t : horiz ? w.h : w.w
    const extra = w.overhead ? ' · só acima dos degraus' : w.glassBlock ? ` · até ${f(GLASS_BLOCK.h)} m` : w.low ? ` · baixa, até ${f(w.low)} m` : ''
    return [wallAction[w.kind] + extra, `${f(len)}\u00a0m`, `${Math.round(t * 100)}\u00a0cm`, whereWall(w)]
  })
  const doors: Row[] = plan.doors.map((d) => {
    const w = whereDoor(plan, d)
    return [w.kind, w.size, w.where]
  })
  const newWindows: Row[] = plan.windows
    .filter((w) => w.kind === 'new')
    .map((w) => [w.label ?? 'Janela nova', `${f(w.w)} × ${f(w.head ?? 0)} m`, `Parede sul, de x ${f(w.x)} a ${f(w.x + w.w)}, do chão acabado até ${f(w.head ?? 0)} m. Guarda com pelo menos 1,10 m. Alteração de fachada: confirmar o licenciamento.`])
  const gbs = plan.walls
    .filter((w) => w.glassBlock)
    .map((w) => {
      const room = roomAt(plan, w.x + w.w / 2, w.y + w.h / 2 + 0.1) ?? roomAt(plan, w.x + w.w / 2, w.y - 0.1)
      const n = glassBlockCount(w)
      return { room: room?.name ?? '', ...n, len: Math.max(w.w, w.h) }
    })
  const gbTotal = gbs.reduce((s, g) => s + g.total, 0)
  const gbOrder = Math.ceil(gbTotal * (1 + WASTE.blocks))

  const floorArea = plan.rooms.reduce((s, r) => s + r.area, 0)
  const bs = baths(plan)
  const walkIn = bs.some((b) => b.shower?.walkIn)
  const showerRows: Row[] = bs
    .filter((b) => b.shower)
    .map((b) => {
      const sh = b.shower!
      const dims = `${f(sh.f.w)} × ${f(sh.f.h)} m`
      const thin = sh.mixThickness !== undefined && sh.mixThickness < 0.12
      const niche = `Nicho de 0,30 × 0,60 m na ${sh.mixWall}${thin ? ` (parede de ${Math.round(sh.mixThickness! * 100)} cm: o nicho só tem uns 6–7 cm de fundo; para ser mais fundo, engrossar a parede neste troço)` : sh.mixExterior ? ' (parede exterior: não cortar o isolamento)' : ''}.`
      if (!sh.walkIn) return [b.room.name, `Duche de ${dims} com base: tela de impermeabilização no chão do WC e nas paredes do duche, por baixo do revestimento. ${niche}`]
      const d = sh.drain as { fallCm: number }
      return [
        b.room.name,
        `Duche de nível de ${dims}, sem base: tela de impermeabilização em todo o chão do WC e nas paredes do duche, pendente de 1,5 % para o ralo linear de 70 cm (cerca de ${f(d.fallCm, 1)} cm de queda). ${niche}`,
      ]
    })
  const trade = bonina.exclusions.filter((e) => e.startsWith('Pedreiro:')).map((e) => e.replace('Pedreiro: ', ''))
  const ceiling = plan.ceiling ?? CEILING

  return {
    walls: {
      title: 'Paredes: demolir, fechar vãos e construir',
      head: ['Ação', 'Comp.', 'Esp.', 'Onde'],
      rows: walls,
      note: `Ordem: primeiro demolir, depois fechar vãos e por fim construir. Ver ${refs.works}. Confirmar em obra as paredes existentes antes de marcar.`,
    } satisfies Block,
    doors: {
      title: 'Portas e vãos',
      head: ['Tipo', 'Vão', 'Onde'],
      rows: [...doors, ...newWindows],
      note: 'Vão livre = abertura sem porta. Vãos novos ou alargados em paredes de alvenaria levam padieira (lintel); se a parede for estrutural, confirmar com o engenheiro.',
    } satisfies Block,
    slab: {
      title: 'Abertura na laje para a escada',
      head: ['', ''],
      rows: (plan.ceilingOpenings ?? []).map((o, i, all) => [`Abertura${all.length > 1 ? ` ${i + 1}` : ''}`, `${f(o.w)} × ${f(o.h)} m: x ${f(o.x)} a ${f(o.x + o.w)}, y ${f(o.y)} a ${f(o.y + o.h)}`]),
    } satisfies Block,
    floor: {
      title: 'Pavimento e teto',
      head: ['', ''],
      rows: [
        ['Pavimento', `Sobe ${f((plan.floorRaise ?? 0) * 100, 0)} cm (betonilha e acabamento) em cerca de ${f(floorArea, 1)} m² (divisões desta planta, com o corredor). Dá altura para os sifões ${walkIn ? 'dos duches de nível' : 'das bases de duche'}.`],
        ['Pé-direito final', `${f(ceiling)} m (era ${f(ceiling + (plan.floorRaise ?? 0))} m)`],
        ['Soleiras e peitoris', 'Com o chão 10 cm mais alto, as soleiras das portas sobem e os peitoris ficam 10 cm mais baixos em relação ao chão.'],
      ],
    } satisfies Block,
    glass: gbs.length
      ? ({
          title: 'Blocos de vidro 19×19×8 cm',
          head: ['Onde', 'Comp.', 'Blocos'],
          rows: [...gbs.map((g) => [g.room, `${f(g.len)} m`, `${g.n} × ${g.rows} fiadas = ${g.total}`]), ['Total', '', `${gbTotal} (+${Math.round(WASTE.blocks * 100)} % de quebras: ${gbOrder})`]],
          note: `Assentes num murete baixo, com argamassa própria e varão de inox nas juntas, até ${f(GLASS_BLOCK.h)} m: não tocam no teto.`,
        } satisfies Block)
      : undefined,
    showers: showerRows.length ? ({ title: 'Duches', head: ['', ''], rows: showerRows } satisfies Block) : undefined,
    others: {
      title: 'Para os outros ofícios',
      head: ['', ''],
      rows: [['Roços', `Abrir e tapar os roços do canalizador e do eletricista (${refs.trades}).`], ...trade.map((t) => ['Bonina', t])],
    } satisfies Block,
  }
}

/* ---------- Canalizador ---------- */

export const PLUMBER_COLOR = '#0369a1'

export function plumberData(plan: Plan, flip?: boolean) {
  const marks: Mark[] = []
  const lines: Line[] = []
  const rows: Row[] = []
  let n = 0
  const add = (x: number, y: number, what: string, where: string, ref: string, ghost = false) => {
    n++
    marks.push({ x, y, code: String(n), color: PLUMBER_COLOR, ghost })
    rows.push([n, what, where, ref])
  }
  const bs = baths(plan)
  for (const b of bs) {
    rows.push([`${b.room.name}${b.hasWindow ? ' · com janela' : ' · sem janela'}`])
    const sh = b.shower
    if (sh) {
      add(sh.mixer.x, sh.mixer.y, 'Duche: misturadora encastrada (água quente e fria)', `${sh.mixWall}, em ${xy(sh.mixer.x, sh.mixer.y)}`, 'corpo a 1,00–1,10 m')
      add(sh.head.x, sh.head.y, 'Duche: chuveiro de braço', `mesma parede, em ${xy(sh.head.x, sh.head.y)}`, 'saída a ~2,10 m (teto a 2,45)')
      const nc = { x: (sh.niche.x0 + sh.niche.x1) / 2, y: (sh.niche.y0 + sh.niche.y1) / 2 }
      add(nc.x, nc.y, 'Duche: nicho 0,30 × 0,60 m', `mesma parede, ${sh.mixSide === 'e' || sh.mixSide === 'w' ? `de y ${f(sh.niche.y0)} a ${f(sh.niche.y1)}` : `de x ${f(sh.niche.x0)} a ${f(sh.niche.x1)}`}`, 'base a ~1,10 m; sem tubos por trás')
      if ('x1' in sh.drain) {
        const d = sh.drain
        lines.push({ ...d, color: PLUMBER_COLOR })
        add((d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2 + (d.y1 === d.y2 ? 0.2 : 0), 'Duche: ralo linear de 70 cm', `${d.y1 === d.y2 ? `y ${f(d.y1)}, de x ${f(d.x1)} a ${f(d.x2)}` : `x ${f(d.x1)}, de y ${f(d.y1)} a ${f(d.y2)}`}; esgoto Ø50`, `pendente 1,5 % (~${f(d.fallCm, 1)} cm)`)
      } else {
        add(sh.drain.x, sh.drain.y, 'Duche: válvula da base', `${xy(sh.drain.x, sh.drain.y)} (centro da base desenhada); esgoto Ø50`, 'conforme a base escolhida')
      }
    }
    const tl = b.toilet
    if (tl) {
      const [ox, oy] = outward[tl.side]
      add(tl.axis.x - ox * 0.18, tl.axis.y - oy * 0.18, 'Sanita suspensa: autoclismo embutido + esgoto Ø110', `${tl.wall}, eixo em ${tl.side === 'n' || tl.side === 's' ? `x ${f(tl.axis.x)}` : `y ${f(tl.axis.y)}`}`, 'esgoto a ~0,23 m; aro a 0,40–0,42 m; água fria no topo da estrutura (~1,00 m)')
    }
    const sk = b.sink
    if (sk) {
      if (sk.axis) {
        const [ox, oy] = outward[sk.side]
        add(sk.axis.x - ox * 0.15, sk.axis.y - oy * 0.15, 'Lavatório de pousar: torneira de parede (corpo encastrado, quente e fria) e esgoto Ø40', `${sk.wall}, eixo em ${sk.side === 'n' || sk.side === 's' ? `x ${f(sk.axis.x)}` : `y ${f(sk.axis.y)}`}${sk.window ? ` (ao lado da janela ${sk.window})` : ''}`, 'bancada a 0,75–0,80 m; bica ~10 cm acima da taça; esgoto a ~0,50 m')
      } else {
        const c = center(sk.f)
        add(c.x, c.y, 'Lavatório: torneira de bancada (por cima fica a janela) e esgoto Ø40', `${sk.wall}, por baixo da janela ${sk.window ?? ''}; centro da bancada em ${xy(c.x, c.y)}`, 'bancada a 0,75–0,80 m; esgoto a ~0,50 m')
      }
    }
    add(
      b.extractor.x,
      b.extractor.y,
      b.hasWindow ? 'Extração mecânica (recomendada)' : 'Extração mecânica (obrigatória: WC sem janela)',
      `${b.extractor.where}, em ${xy(b.extractor.x, b.extractor.y)}; conduta Ø100–125 para o exterior`,
      'caudal ~45–60 m³/h; ou boca de extração da VMC',
    )
  }

  const trade = bonina.exclusions.filter((e) => e.startsWith('Canalizador:') || e.startsWith('Recomendado:'))
  const heat = bonina.rooms.find(([k]) => k.startsWith('Lavandaria'))
  const vmc = bonina.rooms.find(([k]) => k.startsWith('Sótão'))
  const walkIn = bs.some((b) => b.shower?.walkIn)

  return {
    marks,
    lines,
    points: { title: 'Pontos de água e esgoto', head: ['N.º', 'Ponto', 'Onde', 'Referência'], rows } satisfies Block,
    general: {
      title: 'Notas gerais',
      head: ['', ''],
      rows: [
        ['Ramais', 'Cada aparelho com o seu ramal e válvula de corte acessível; água quente com isolamento.'],
        walkIn
          ? ['Duches de nível', 'O pavimento sobe 10 cm: usar ralo e sifão de baixa altura. Tela de impermeabilização antes do acabamento.']
          : ['Duches', 'Bases extraplanas: o pavimento sobe 10 cm, o que dá altura para o sifão da base. Tela de impermeabilização antes do acabamento.'],
        ['Sanitas suspensas', 'Estrutura metálica para autoclismo embutido (~1,12 m de altura, 0,50 m de largura), em pré-parede ou roço. Placa de descarga acessível.'],
        ...(heat ? [['Água quente', `${heat[1]} (${heat[0].toLowerCase()}).`]] : []),
        ['VMC', vmc ? `${vmc[1]} no ${vmc[0].toLowerCase()}. Se servir os WC, as bocas de extração substituem os extratores: confirmar com a Bonina.` : ''],
        ...trade.map((t) => ['Bonina', t.replace(/^(Canalizador|Recomendado): /, '')]),
      ],
    } satisfies Block,
    note: `Coordenadas em metros a partir das faces interiores das paredes poente (x) e norte (y), tiradas da planta mobilada.${flipNote(flip)} Posição dos pontos ao longo da parede e alturas: proposta indicativa. ${REF}`,
  }
}

/* ---------- Eletricista ---------- */

export const EL = { light: '#ca8a04', switch: '#b91c1c', socket: '#1d4ed8', other: '#7c3aed' }
export const legendEl: [string, string, string][] = [
  ['L', EL.light, 'Ponto de luz no teto'],
  ['A', EL.light, 'Aplique de parede'],
  ['I', EL.switch, 'Interruptor'],
  ['C', EL.switch, 'Comutador (liga e desliga em dois sítios)'],
  ['T', EL.socket, 'Tomada (2 = dupla)'],
  ['D', EL.socket, 'Tomada de dados (RJ45)'],
  ['E', EL.other, 'Extrator'],
]
/** O que cada ponto leva, para contar a aparelhagem e as luminárias. */
export type Part =
  | 'switch'
  | 'doubleSwitch'
  | 'twoWay'
  | 'intermediate'
  | 'socket'
  | 'data'
  | 'ceilingLight'
  | 'bathLight'
  | 'mirrorLight'
  | 'stairLight'
  | 'extractor'
  | 'towelRail'
  | 'presence'
  | 'acBox'
export type Parts = Partial<Record<Part, number>>
export type Placed = { group: string; part: Part; n: number; optional: boolean; x: number; y: number }
/** Peças que vão numa caixa de aparelhagem (cada uma ocupa um módulo). */
const MECHANISMS: Part[] = ['switch', 'doubleSwitch', 'twoWay', 'intermediate', 'socket', 'data']

export function electricianData(plan: Plan, stair: StairRef, flip?: boolean) {
  const marks: Mark[] = []
  const zones: Zone[] = []
  const rows: Row[] = []
  const parts: Parts = {}
  const optional: Parts = {}
  /** Módulos de cada caixa de aparelhagem. */
  const boxes: number[] = []
  const optionalBoxes: number[] = []
  /** Onde fica cada peça (divisão e ponto na planta), para a lista de materiais. */
  const placed: Placed[] = []
  let group = ''
  const heading = (name: string) => {
    rows.push([name])
    group = name
  }
  const tally = (p: Parts, at: { x: number; y: number }, opt = false) => {
    const into = opt ? optional : parts
    for (const [k, v] of Object.entries(p) as [Part, number][]) {
      into[k] = (into[k] ?? 0) + v
      placed.push({ group, part: k, n: v, optional: opt, ...at })
    }
    const modules = MECHANISMS.reduce((s, k) => s + (p[k] ?? 0), 0)
    if (modules) (opt ? optionalBoxes : boxes).push(modules)
  }
  const add = (code: string, color: string, x: number, y: number, what: string, where: string, ref: string, p: Parts, ghost = false) => {
    marks.push({ x, y, code, color, ghost })
    rows.push([code, what, where, ref])
    tally(p, { x, y })
  }
  const text = (row: Row, at: { x: number; y: number }, p: Parts = {}, opt: Parts = {}) => {
    rows.push(row)
    tally(p, at)
    tally(opt, at, true)
  }
  const bathInfo = new Map(baths(plan).map((b) => [b.room.id, b]))
  const circ = (r?: Room) => !r || r.tone === 'circ' || r.tone === 'stair'

  /** Interruptores: junto às portas que dão para a circulação (ou, se não houver, para fora do WC), do lado do fecho. */
  function switches(room: Room) {
    const found: { x: number; y: number; d: Door; other?: Room }[] = []
    for (const d of plan.doors) {
      const sp = doorSpan(d)
      const mid = (sp.a + sp.b) / 2
      // na porta embutida, a parede do lado da dobradiça tem a caixa da folha: não leva caixas elétricas
      const pocket = d.type === 'sliding' && d.pocket
      for (const sgn of [-1, 1]) {
        const p0 = sp.vertical ? { x: sp.c + sgn * 0.25, y: mid } : { x: mid, y: sp.c + sgn * 0.25 }
        if (!inRoom(room, p0.x, p0.y)) continue
        const q = sp.vertical ? { x: sp.c - sgn * 0.25, y: mid } : { x: mid, y: sp.c - sgn * 0.25 }
        const fwd = sp.latch >= sp.hinge ? 1 : -1
        const ptAt = (t: number, n: number) => (sp.vertical ? { x: sp.c + sgn * n, y: t } : { x: t, y: sp.c + sgn * n })
        const cands = [
          ptAt(sp.latch + fwd * 0.15, 0.12),
          ...(pocket ? [] : [ptAt(sp.hinge - fwd * 0.15, 0.12)]),
          ptAt(sp.latch - fwd * 0.05, 0.35),
          ...(pocket ? [] : [ptAt(sp.hinge + fwd * 0.05, 0.35)]),
        ]
        const pt = cands.find((c) => inRoom(room, c.x, c.y) && inRoom(room, c.x + (sp.vertical ? sgn * 0.05 : 0), c.y + (sp.vertical ? 0 : sgn * 0.05))) ?? cands[0]
        found.push({ ...pt, d, other: roomAt(plan, q.x, q.y) })
      }
    }
    const fromCirc = found.filter((s) => circ(s.other))
    if (fromCirc.length) return fromCirc
    const notToBath = found.filter((s) => s.other?.tone !== 'bath')
    return notToBath.length ? notToBath : found
  }

  for (const room of plan.rooms) {
    if (room.id === 'hall') {
      heading(room.name)
      text(['–', 'Mantém-se a instalação existente', 'Rever a comutação nas duas pontas e acrescentar uma tomada junto à porta de entrada, se não houver.', ''], centroid(room), {}, { socket: 1 })
      continue
    }
    if (room.tone === 'stair' || room.tone === 'service') continue
    heading(room.name)
    const items = furnitureIn(plan, room)
    const c = centroid(room)
    const bath = bathInfo.get(room.id)
    add('L', EL.light, c.x, c.y, bath ? 'Luz de teto (IP44)' : 'Ponto de luz no teto', xy(c.x, c.y), '', bath ? { bathLight: 1 } : { ceilingLight: 1 })

    const bed = items.find((i) => i.kind === 'bed')
    const bedPts: { x: number; y: number; head: Side }[] = []
    if (bed) {
      const longY = bed.h > bed.w
      const head: Side = longY ? (bed.headSouth ? 's' : 'n') : bed.headEast ? 'e' : 'w'
      const e = edge(bed, head)
      const [ox, oy] = outward[head]
      for (const t of [e.a - 0.15, e.b + 0.15]) {
        const pt = at(head, e.c + (ox + oy) * -0.1, t)
        if (inRoom(room, pt.x, pt.y)) bedPts.push({ ...pt, head })
      }
    }

    if (room.tone === 'circ') rows.push(['', 'Interruptor', 'Liga no comutador do arranque da escada (ver Escada).', ''])
    else {
      const sw = switches(room)
      // a luz do quarto também se liga nas cabeceiras: dois comutadores e, a partir do terceiro ponto, inversores
      const points = sw.length + bedPts.length
      sw.forEach((s, i) => {
        const w = whereDoor(plan, s.d)
        const by = s.d.type === 'opening' ? `junto ao vão livre de ${w.size}` : `junto à porta (${w.kind.toLowerCase()} de ${w.size}), do lado do fecho`
        const k = bedPts.length + i
        const [what, p]: [string, Parts] =
          bath?.sink && points === 1
            ? ['Interruptor duplo: luz do teto e luz do espelho', { doubleSwitch: 1 }]
            : points === 1
              ? ['Interruptor', { switch: 1 }]
              : k < 2
                ? [bedPts.length ? 'Comutador (a luz também se liga na cabeceira)' : 'Comutador (a luz liga e desliga nas duas portas)', { twoWay: 1 }]
                : [bedPts.length === 2 ? 'Inversor (a luz também se liga nas duas cabeceiras)' : 'Inversor (a luz liga e desliga em mais de dois sítios)', { intermediate: 1 }]
        add('I', EL.switch, s.x, s.y, what, `${by}, em ${xy(s.x, s.y)}`, '1,10 m', p)
      })
    }

    for (const pt of bedPts)
      add('T', EL.socket, pt.x, pt.y, 'Cabeceira: tomada dupla + comutador da luz do quarto', `parede da cabeceira (${sideName[pt.head]}), ao lado da cama, em ${xy(pt.x, pt.y)}`, 'tomada 0,30–0,70 m; comutador 0,80 m', { socket: 2, twoWay: 1 })
    for (const it of items.filter((i) => i.kind === 'desk' || (i.kind === 'generic' && i.label === 'Cómoda'))) {
      const s = (['n', 's', 'w', 'e'] as Side[]).map((sd) => sideInfo(plan, room, it, sd)).find((sd) => sd.wall)
      if (!s) continue
      const [ox, oy] = outward[s.side]
      const pt = at(s.side, s.c - (ox + oy) * 0.1, (s.a + s.b) / 2)
      if (it.kind === 'desk') add('D', EL.socket, pt.x, pt.y, 'Secretária: 2 tomadas duplas + dados (RJ45)', `${wallLabel(s)}, ao centro da secretária, em ${xy(pt.x, pt.y)}`, '0,30 m ou 0,90 m (acima do tampo)', { socket: 4, data: 1 })
      else add('T', EL.socket, pt.x, pt.y, `${it.label}: tomada dupla`, `${wallLabel(s)}, em ${xy(pt.x, pt.y)}`, '0,30 m', { socket: 2 })
    }
    if (room.tone === 'closet') text(['', 'Luz com sensor de presença ou interruptor de porta; 1 tomada junto à entrada', '', ''], c, { socket: 1 }, { presence: 1 })

    if (bath) {
      const sh = bath.shower
      const sk = bath.sink
      if (sk) {
        const [ox, oy] = outward[sk.side]
        const ax = sk.axis ?? center(sk.f)
        const mirror = sk.axis ? { x: ax.x - ox * 0.08, y: ax.y - oy * 0.08 } : center(sk.f)
        add('A', EL.light, mirror.x, mirror.y, sk.axis ? 'Luz do espelho (IP44)' : 'Luz do espelho (IP44), na parede ao lado da janela', `${sk.wall}, por cima do lavatório`, '~1,90–2,00 m', { mirrorLight: 1 })
        const ends = sk.ends.map((pt) => ({ x: pt.x - ox * 0.1, y: pt.y - oy * 0.1 }))
        const far = sh ? ends.sort((a, b) => distToRect(sh.f, b.x, b.y) - distToRect(sh.f, a.x, a.y))[0] : ends[0]
        const dist = sh ? distToRect(sh.f, far.x, far.y) : 9
        add(
          'T',
          EL.socket,
          far.x,
          far.y,
          'Tomada junto ao espelho (secador, escova)',
          `ao lado do lavatório, do lado mais longe do duche, em ${xy(far.x, far.y)}${dist < 0.6 ? ` · fica a ${f(dist)} m do duche: tem de ficar a 0,60 m ou mais` : ` · a ${f(dist)} m do duche`}`,
          '1,10–1,20 m; diferencial 30 mA',
          { socket: 1 },
        )
      }
      add('E', EL.other, bath.extractor.x, bath.extractor.y, `Extrator${bath.hasWindow ? ' (recomendado)' : ' (WC sem janela)'}: liga com a luz e fica a trabalhar 3–5 min com temporizador`, xy(bath.extractor.x, bath.extractor.y), 'teto ou parede alta', { extractor: 1 })
      if (sh) {
        zones.push({ ...sh.zone2, color: '#dc2626' })
        rows.push(['', 'Zona 2 do duche', `x ${f(sh.zone2.x)} a ${f(sh.zone2.x + sh.zone2.w)}, y ${f(sh.zone2.y)} a ${f(sh.zone2.y + sh.zone2.h)}: sem tomadas nem interruptores`, ''])
      }
      text(['', 'Toalheiro elétrico (opcional)', 'Caixa de ligação com interruptor, fora das zonas 1 e 2', '~0,20 m acima'], c, {}, { towelRail: 1 })
    }
  }

  heading('Escada')
  const sTop = stair.kind === 'straight' ? { x: STR.x + STR.w - 0.12, y: stair.s.yTop - 0.3 } : { x: stair.s.xTop + 0.3, y: stair.s.bandY + 0.12 }
  let sBot: { x: number; y: number }
  if (stair.kind === 'straight') {
    const x = STR.x + STR.w - 0.12
    sBot = { x, y: clearOfDoors(plan, true, STR.x + STR.w + 0.05, STR.yStart + 0.3, 1) }
  } else {
    sBot = { x: stair.s.w - 0.12, y: Math.min(stair.s.yStart + 0.13, D - 0.1) }
  }
  add('C', EL.switch, sBot.x, sBot.y, 'Comutador no arranque', `junto ao 1.º degrau, em ${xy(sBot.x, sBot.y)}`, '1,10 m', { twoWay: 1 })
  add('C', EL.switch, sTop.x, sTop.y, 'Comutador à chegada (no sótão)', `junto ao último degrau, em ${xy(sTop.x, sTop.y)} (círculo a tracejado)`, '1,10 m', { twoWay: 1 }, true)
  const mid = stair.kind === 'straight' ? { x: STR.x + STR.w - 0.12, y: (STR.yStart + stair.s.yTop) / 2 } : { x: stair.s.w / 2, y: stair.s.bandY + stair.s.w / 2 }
  add('A', EL.light, mid.x, mid.y, 'Luz da escada: aplique ou LED nos degraus', stair.kind === 'straight' ? 'na parede do corredor, a meio do lanço; o primeiro e o último degrau bem iluminados' : `no ${stair.s.winders ? 'leque' : 'patamar'} e ao longo do 2.º lanço; o primeiro e o último degrau bem iluminados`, 'apliques a ~2,0 m da linha dos degraus', { stairLight: 1 })
  group = 'Sótão'
  text(['', 'Sótão', 'Pelo menos um ponto de luz e uma tomada junto à chegada.', ''], sTop, { ceilingLight: 1, socket: 1 })

  const trade = bonina.exclusions.filter((e) => e.startsWith('Eletricista:')).map((e) => e.replace('Eletricista: ', ''))
  const ac = bonina.rooms.filter(([k]) => k.startsWith('Quarto')).length
  const vmc = bonina.rooms.find(([k]) => k.startsWith('Sótão'))
  parts.acBox = ac

  return {
    marks,
    zones,
    points: { title: 'Pontos por divisão', head: ['', 'Ponto', 'Onde', 'Ref.'], rows } satisfies Block,
    rules: {
      title: 'Regras nos WC (RTIEBT)',
      head: ['', ''],
      rows: [
        ['Zona 1', 'O duche, até 2,25 m de altura. Só equipamento próprio (IPX5 por cima do duche); sem tomadas nem interruptores.'],
        ['Zona 2', '0,60 m à volta do duche (a tracejado vermelho). Só luminárias IP44; sem tomadas nem interruptores.'],
        ['Duche sem base', 'A zona 1 pode estender-se 1,20 m a partir do chuveiro: confirmar com o eletricista.'],
        ['Proteção', 'Circuito próprio para os WC, com diferencial de 30 mA.'],
        ['Equipotencial', 'Ligar à terra as partes metálicas: tubos, ralo e estrutura do autoclismo.'],
      ],
    } satisfies Block,
    supplies: {
      title: 'Alimentações (orçamento da Bonina)',
      head: ['', ''],
      rows: [
        ...trade.map((t) => ['Circuito', t]),
        ['Ar condicionado', `${ac} unidades interiores de parede nos quartos: caixa de ligação junto a cada uma.`],
        ...(vmc ? [['VMC', `${vmc[1]} (${vmc[0].toLowerCase()}): alimentação e comando.`]] : []),
      ],
    } satisfies Block,
    note: `Proposta indicativa, para validar com o eletricista e segundo as RTIEBT: circuitos separados para iluminação, tomadas e WC, todos com diferencial de 30 mA. Posições tiradas das portas e dos móveis da planta; alturas são valores de referência.${flipNote(flip)}`,
    parts,
    optional,
    boxes,
    optionalBoxes,
    placed,
  }
}

export type ElectricianData = ReturnType<typeof electricianData>

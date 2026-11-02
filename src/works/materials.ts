import { bonina } from './bonina'
import { DOOR_H, roomQuantities } from '@/decor/quantities'
import { D, W } from '@/plan/common'
import { existingPlan } from '@/plan/existing'
import { doorHost, horizontalWall, pocketWallOf, wallThickness, workWalls } from '@/plan/setout'
import { CEILING, SOFFIT } from '@/plan/stair'
import type { Door, Plan, Wall } from '@/plan/types'
import { baths } from './baths'
import { centroid, doorRooms, doorSpan, f, sideInfo, sideName, type Side } from './geometry'
import type { ElectricianData, Part } from './trades'

export type Material = {
  item: string
  /** Número calculado da planta, ou texto quando só se sabe em obra. */
  qty: number | string
  unit?: string
  approx?: boolean
  detail?: string
  /** Pesquisa na Leroy Merlin. */
  search?: string
  optional?: boolean
}
export type MaterialGroup = { title: string; note: string; items: Material[] }
/** Material de cada ofício (o que se escolhe e o material de obra) e a ferramenta. */
export type TradeMaterials = { groups: MaterialGroup[]; tools: MaterialGroup }

export const lmSearch = (q: string) => `https://www.leroymerlin.pt/search?q=${encodeURIComponent(q)}`
export const qtyText = (m: Material) => (typeof m.qty === 'string' ? m.qty : `${m.approx ? '≈ ' : ''}${f(m.qty, Number.isInteger(m.qty) ? 0 : 1)}${m.unit ? `\u00a0${m.unit}` : ''}`)
export const materialsNote =
  'Quantidades tiradas da planta, com a margem indicada em cada linha: confirmar em obra antes de encomendar. Quem compra o quê combina-se com cada um. As pesquisas na Leroy Merlin servem para ver opções e preços.'

const BUY = { title: 'Para escolher e comprar', note: 'Fica à vista ou tem de ser escolhido: normalmente compra o dono da obra.' }
const SITE = { title: 'Material de obra', note: 'Normalmente trazido pelo profissional e incluído no orçamento dele: confirmar.' }
const TOOLS = {
  title: 'Ferramentas e equipamento',
  note: 'Cada profissional costuma trazer a sua: comprar só o que faltar, por exemplo se parte da obra for feita por vocês ou à jorna. As máquinas maiores também se alugam.',
}
const tool = (item: string, qty: number, search: string, detail?: string, extra: Partial<Material> = {}): Material => ({ item, qty, unit: 'un', search, detail, ...extra })

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0)
const up = (v: number, step = 1) => Math.ceil(v / step - 1e-9) * step
const r1 = (v: number) => Math.round(v * 10) / 10
const cm = (v: number) => Math.round(v * 100)
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)
const tally = <T>(xs: T[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>())]
const exterior = (w: Wall) => w.y >= D - 0.01 || w.y + w.h <= 0.01 || w.x + w.w <= 0.01 || w.x >= W - 0.01
/** Texto de uma exclusão do orçamento da Bonina, sem o ofício à frente. */
const boninaNote = (prefix: string) => bonina.exclusions.find((e) => e.startsWith(prefix))?.slice(prefix.length).trim()
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/* ---------- Pedreiro ---------- */

/** 30×20 cm com juntas de 1 cm. */
const BRICKS_M2 = 1 / (0.31 * 0.21)
/** Tijolo para uma parede acabada com espessura t (reboco de ~1 cm de cada lado); as de fachada levam dois panos. */
function brickFor(t: number) {
  const core = Math.round((t - 0.02) * 100)
  return core >= 30 ? { cm: 15, leaves: 2 } : { cm: [15, 11, 7].find((b) => b <= core) ?? 7, leaves: 1 }
}
/** A tela sobe nas paredes do duche até esta altura. */
const WATERPROOF_H = 2.0
/** Argamassa para assentar o tijolo, por m² de parede (m³). */
const LAYING: Record<number, number> = { 7: 0.01, 11: 0.015, 15: 0.02 }
/** Reboco de ~1,5 cm por face, com o salpico e as perdas (m³ por m²). */
const RENDER = 0.02
/** Cimento (kg) e areia (m³) por m³: argamassa ao traço 1:4 e betonilha tradicional. */
const MORTAR = { cement: 350, sand: 1.1 }
const SCREED = { cement: 300, sand: 1.2 }
const BAG = 25

export function masonMaterials(plan: Plan): TradeMaterials {
  const ceiling = plan.ceiling ?? CEILING
  // as paredes assentam na laje, antes de subir o pavimento
  const H0 = ceiling + (plan.floorRaise ?? 0)
  const bs = baths(plan)
  const bq = bs.map((b) => roomQuantities(plan, b.room))
  const walkIn = bs.some((b) => b.shower?.walkIn)
  const bathFloor = sum(bs.map((b) => b.room.area))
  const showerWalls = sum(bq.map((q) => q.shower?.walls ?? 0))
  const showerRun = sum(bq.map((q) => sum(q.shower?.sides ?? [])))
  const bathWalls = sum(bq.map((q) => q.wallsNet))
  const bathLambrim = sum(bq.map((q) => q.lambrim))
  const dry = plan.rooms.filter((r) => r.tone === 'bed' || r.tone === 'closet' || r.tone === 'circ' || r.tone === 'living')
  const dryFloor = sum(dry.map((r) => r.area))
  const width = (d: Door) => doorSpan(d).b - doorSpan(d).a
  const skirting = sum(dry.map((r) => roomQuantities(plan, r).perimeter - sum(plan.doors.filter((d) => doorRooms(plan, d).includes(r)).map(width))))
  const pockets = plan.doors.filter((d) => d.type === 'sliding' && d.pocket)

  const buy: Material[] = [
    ...pockets.map((d): Material => {
      const wall = pocketWallOf(plan, d)
      const rooms = doorRooms(plan, d)
      const room = rooms.find((r) => r.tone === 'bath') ?? rooms[0]
      return {
        item: `Kit de porta de correr embutida, folha de ${f(width(d))} × ${f(DOOR_H)} m`,
        qty: 1,
        unit: 'un',
        detail: `${room?.name}: na parede ${wall?.kind === 'new' ? 'nova' : 'existente'} de ${cm(wall ? wallThickness(wall) : 0.1)} cm. Escolher o kit para a espessura da parede; se não trouxer a folha, compra-se à parte. Tem de estar em obra quando se faz a parede.`,
        search: 'kit porta de correr embutida',
      }
    }),
    ...plan.windows
      .filter((w) => w.kind === 'new')
      .map((w): Material => {
        const door = (w.sill ?? 1) < 0.05
        return {
          item: `${w.label ?? 'Janela nova'}: caixilharia de ${f(w.orientation === 'h' ? w.w : w.h)} × ${f((w.head ?? 0) - (w.sill ?? 0))} m`,
          qty: 1,
          unit: 'un',
          detail: `${door ? 'Com guarda de pelo menos 1,10 m. ' : ''}Encomendar à medida depois de aberto o vão; é alteração de fachada: confirmar o licenciamento.`,
          search: door ? 'porta janela pvc' : 'janela pvc',
        }
      }),
    {
      item: 'Pavimento cerâmico dos WC',
      qty: r1(bathFloor * 1.1),
      unit: 'm²',
      detail: `${bs.map((b) => `${b.room.name} ${f(b.room.area)}`).join(' + ')} = ${f(bathFloor)} m², e 10 % para cortes.${walkIn ? ' Antiderrapante nos duches de nível.' : ''}`,
      search: 'pavimento cerâmico',
    },
    {
      item: 'Revestimento cerâmico das paredes dos duches',
      qty: r1(showerWalls * 1.1),
      unit: 'm²',
      detail: `Até ao teto: ${f(showerRun)} m de parede × ${f(ceiling)} m = ${f(showerWalls, 1)} m², e 10 % para cortes.`,
      search: 'revestimento cerâmico',
    },
    {
      item: 'Revestimento do resto das paredes dos WC',
      qty: r1(bathWalls * 1.1),
      unit: 'm²',
      detail: `Até ao teto, sem portas nem janelas: ${f(bathWalls, 1)} m² e 10 %. Só até 1,20 m (lambrim) são ${f(r1(bathLambrim * 1.1), 1)} m², e o resto pinta-se com tinta para casas de banho.`,
      search: 'revestimento cerâmico',
    },
    {
      item: 'Pavimento fora dos WC',
      qty: r1(dryFloor * 1.1),
      unit: 'm²',
      detail: `${listJoin(dry.map((r) => r.name))}: ${f(dryFloor, 1)} m² e 10 % para cortes. Vinílico, flutuante ou cerâmico, sobre a betonilha nova.`,
      search: 'pavimento vinílico',
    },
    { item: 'Rodapé', qty: up(skirting * 1.05), unit: 'm', approx: true, detail: `Perímetro dessas divisões sem as portas (${f(skirting, 1)} m) e 5 %.`, search: 'rodapé' },
  ]

  const bricks = new Map<number, { area: number; what: Set<string>; double: boolean }>()
  const addBricks = (t: number, area: number, what: string) => {
    const b = brickFor(t)
    const e = bricks.get(b.cm) ?? { area: 0, what: new Set<string>(), double: false }
    e.area += area * b.leaves
    e.what.add(what)
    e.double ||= b.leaves > 1
    bricks.set(b.cm, e)
  }
  let render = 0
  for (const w of workWalls(plan)) {
    if (w.kind === 'demolish' || w.glassBlock) continue
    const len = horizontalWall(w) ? w.w : w.h
    const area = len * (w.kind === 'infill' ? DOOR_H : (w.low ?? (w.overhead ? H0 - DOOR_H : H0)))
    const kit = sum(pockets.filter((d) => pocketWallOf(plan, d) === w).map((d) => width(d) * (DOOR_H + 0.05)))
    addBricks(wallThickness(w), area - kit, w.kind === 'infill' ? 'vãos a fechar' : w.low ? 'pré-parede da sanita' : 'paredes novas')
    render += area * 2
  }
  // por cima das portas e dos vãos das paredes novas, a parede continua até ao teto
  for (const d of plan.doors) {
    const host = doorHost(plan, d)
    if (host?.kind !== 'new') continue
    const area = width(d) * (H0 - DOOR_H - 0.05)
    addBricks(wallThickness(host), area, 'paredes novas')
    render += area * 2
  }

  const covered = (d: Door) => {
    const s = doorSpan(d)
    return existingPlan.doors.some((e) => {
      const x = doorSpan(e)
      return x.vertical === s.vertical && Math.abs(x.c - s.c) < 0.2 && x.a <= s.a + 0.02 && x.b >= s.b - 0.02
    })
  }
  const lintels: { span: number; t: number; isNew: boolean; where: string }[] = []
  for (const d of plan.doors) {
    const host = doorHost(plan, d)
    if (!host) continue
    const pocket = d.type === 'sliding' && !!d.pocket
    const isNew = host.kind === 'new'
    if (!pocket && !isNew && covered(d)) continue
    const rooms = doorRooms(plan, d)
    const bath = rooms.find((r) => r.tone === 'bath')
    lintels.push({ span: pocket ? 2 * width(d) : width(d), t: wallThickness(host), isNew, where: pocket ? `kit do ${bath?.name ?? rooms[0]?.name}` : rooms.map((r) => r.name).join(' – ') })
  }
  for (const w of plan.windows.filter((w) => w.kind === 'new'))
    lintels.push({ span: w.orientation === 'h' ? w.w : w.h, t: w.orientation === 'h' ? w.h : w.w, isNew: false, where: (w.label ?? 'janela').toLowerCase() })

  const floorArea = sum(plan.rooms.map((r) => r.area))
  const screed = (plan.floorRaise ?? 0) - 0.01
  const screedVol = Math.max(0, floorArea * screed)
  // os remates das demolições e dos roços: mais 10 % de reboco
  const renderArea = render * 1.1
  const laying = sum([...bricks].map(([c, e]) => e.area * (LAYING[c] ?? LAYING[11])))
  const mortar = laying + renderArea * RENDER
  const cementMortar = up((mortar * MORTAR.cement) / BAG)
  const cementScreed = up((screedVol * SCREED.cement) / BAG)
  const sand = { mortar: mortar * MORTAR.sand, screed: screedVol * SCREED.sand }
  const waterproof = bathFloor + showerRun * WATERPROOF_H
  const corners = sum(bq.map((q) => Math.max(0, (q.shower?.sides.length ?? 0) - 1))) * WATERPROOF_H
  const bathPerimeter = sum(bq.map((q) => q.perimeter))
  const tiled = bathFloor + showerWalls + bathWalls
  let debris = 0
  let demolished = 0
  for (const w of workWalls(plan)) {
    if (w.kind !== 'demolish') continue
    const len = horizontalWall(w) ? w.w : w.h
    demolished += len
    debris += len * wallThickness(w) * (exterior(w) ? DOOR_H : H0)
  }
  const openings = plan.ceilingOpenings ?? []
  const slab = sum(openings.map((o) => o.w * o.h)) * SOFFIT
  const loose = (debris + slab) * 1.4

  const site: Material[] = [
    ...[...bricks]
      .sort((a, b) => a[0] - b[0])
      .map(([c, e]): Material => ({
        item: `Tijolo furado 30×20×${c}`,
        qty: up(e.area * BRICKS_M2 * 1.05, 10),
        unit: 'un',
        approx: true,
        detail: `${f(e.area, 1)} m² de ${listJoin([...e.what])}${e.double ? ' (na fachada, dois panos)' : ''}: ${Math.round(BRICKS_M2 * 1.05)} por m², já com 5 % de quebras.`,
        search: `tijolo 30x20x${c}`,
      })),
    {
      item: 'Cimento cinzento, sacos de 25 kg',
      qty: cementMortar + cementScreed,
      unit: 'sacos',
      approx: true,
      detail: `${cementMortar} para assentar o tijolo e rebocar (${f(mortar, 1)} m³ de argamassa ao traço 1:4; ${f(renderArea, 0)} m² de reboco nas duas faces das paredes novas e dos vãos fechados, já com 10 % para os remates)${cementScreed ? ` e ${cementScreed} para a betonilha` : ''}. Se as paredes secas levarem estuque projetado em vez de reboco, gasta-se menos.`,
      search: 'cimento 25kg',
    },
    {
      item: 'Areia',
      qty: r1(sand.mortar + sand.screed),
      unit: 'm³',
      approx: true,
      detail: `${f(sand.mortar, 1)} m³ de areia fina para as argamassas${sand.screed ? ` e ${f(sand.screed, 1)} m³ para a betonilha` : ''} (≈ ${f((sand.mortar + sand.screed) * 1.5, 0)} t). Nesta quantidade pede-se a granel a um armazém de materiais de construção; em sacos de 25 kg seriam uns ${up(((sand.mortar + sand.screed) * 1500) / BAG, 10)}.`,
      search: 'areia',
    },
    {
      item: 'Rede de fibra de vidro para reboco',
      qty: 1,
      unit: 'rolo',
      detail: 'Nas juntas das paredes novas com as existentes, por cima das padieiras e das caixas das portas embutidas, para o reboco não abrir fissuras.',
      search: 'rede fibra de vidro reboco',
    },
    {
      item: 'Padieiras',
      qty: lintels.length,
      unit: 'un',
      detail: `${lintels.map((l) => `${f(l.span)} m (${l.where}, parede ${l.isNew ? 'nova' : 'existente'} de ${cm(l.t)} cm)`).join('; ')}. Comprimento = vão + 20 cm de apoio de cada lado; nas paredes existentes, confirmar com o engenheiro. Em armazém de materiais de construção.`,
    },
    ...(screedVol > 0
      ? [
          {
            item: 'Betonilha, feita em obra (o cimento e a areia estão acima)',
            qty: r1(screedVol),
            unit: 'm³',
            approx: true,
            detail: `${f(floorArea, 1)} m² × ${f(screed * 100, 0)} cm (o outro centímetro é o acabamento). Pesa cerca de ${f(screed * 2000, 0)} kg/m²: um enchimento leve por baixo (argila expandida) reduz o peso, o cimento e a areia.`,
          },
        ]
      : []),
    {
      item: 'Impermeabilização (argamassa flexível ou membrana líquida)',
      qty: up(waterproof * 3, 5),
      unit: 'kg',
      approx: true,
      detail: `${f(waterproof, 1)} m²: chão dos WC (${f(bathFloor)} m²) e paredes dos duches até ${f(WATERPROOF_H, 1)} m (${f(showerRun * WATERPROOF_H)} m²), em duas demãos antes do cerâmico. Contado a ~3 kg/m², o da argamassa; a membrana gasta menos (ver o rendimento da marca).`,
      search: 'impermeabilizante casa de banho',
    },
    {
      item: 'Banda de reforço para cantos e juntas',
      qty: up(bathPerimeter + corners),
      unit: 'm',
      approx: true,
      detail: `À volta do chão dos WC (${f(bathPerimeter, 1)} m) e nos cantos dos duches (${f(corners, 1)} m).`,
      search: 'banda impermeabilização',
    },
    {
      item: 'Cimento-cola flexível (C2)',
      qty: up((tiled * 5) / 25),
      unit: 'sacos de 25 kg',
      approx: true,
      detail: `Para ${f(tiled, 1)} m² de cerâmico nos WC (chão e paredes até ao teto), a ~5 kg/m².`,
      search: 'cimento cola flexível',
    },
    { item: 'Betume de juntas', qty: up(tiled * 0.4, 5), unit: 'kg', approx: true, detail: 'Depende do tamanho da peça e da junta (~0,4 kg/m² com juntas de 2 mm).', search: 'betume juntas' },
    {
      item: 'Saída de telhado para a extração dos WC',
      qty: bs.length,
      unit: 'un',
      optional: true,
      detail: 'Só se a VMC não servir os WC: a conduta de cada extrator sai pelo telhado (ou por uma grelha na parede).',
      search: 'saída de telhado',
    },
    {
      item: 'Big bags para entulho (1 m³)',
      qty: up(loose),
      unit: 'un',
      approx: true,
      detail: `${f(debris, 1)} m³ de paredes e ${f(slab, 1)} m³ de laje, que soltos dão ≈ ${f(loose, 1)} m³. Em alternativa, um contentor.`,
      search: 'big bag',
    },
    ...(openings.length
      ? [
          {
            item: 'Escoramento e vigas de bordadura da abertura na laje',
            qty: 'a definir',
            detail: `Abertura de ${openings.map((o) => `${f(o.w)} × ${f(o.h)} m`).join(' + ')}: o engenheiro define as vigas e o escoramento antes de cortar.`,
          },
        ]
      : []),
  ]

  const tools: Material[] = [
    tool('Carro de mão', 1, 'carro de mão', 'Para o entulho, a areia e a massa.'),
    tool('Betoneira de 130 a 160 L', 1, 'betoneira', `Para a betonilha (≈ ${f(screedVol, 1)} m³) e as argamassas; também se aluga.`),
    tool('Masseira ou gamela para a massa', 2, 'gamela'),
    tool('Baldes de obra', 4, 'balde de obra'),
    tool('Pá quadrada', 2, 'pá quadrada'),
    tool('Enxada', 1, 'enxada', 'Para mexer a massa à mão.'),
    tool('Colher de pedreiro', 2, 'colher de pedreiro'),
    tool('Talocha de plástico ou de madeira', 2, 'talocha', 'Para o reboco.'),
    tool('Talocha de esponja', 1, 'talocha esponja', 'Para o acabamento do reboco.'),
    tool('Talocha dentada de 8 a 10 mm', 1, 'talocha dentada', 'Para espalhar o cimento-cola.'),
    tool('Talocha de borracha', 1, 'talocha de borracha para juntas', 'Para o betume das juntas.'),
    tool('Régua de alumínio de 2 e de 3 m', 2, 'régua de alumínio', 'Para puxar o reboco e a betonilha.'),
    tool('Nível de bolha de 1,20 m', 1, 'nível de bolha'),
    tool('Nível laser de linhas', 1, 'nível laser', 'Para marcar as paredes e a cota do pavimento.', { optional: true }),
    tool('Fio de prumo', 1, 'fio de prumo'),
    tool('Fita métrica de 5 m', 2, 'fita métrica'),
    tool('Esquadro de pedreiro', 1, 'esquadro'),
    tool('Fio de marcar, com pó', 1, 'fio de marcar'),
    tool('Martelo demolidor', 1, 'martelo demolidor sds max', `Para ${f(demolished, 1)} m de paredes a demolir; também se aluga.`),
    tool('Marreta, ponteiro e escopro', 1, 'marreta', undefined, { unit: 'conjunto' }),
    tool('Rebarbadora de 230 mm, com discos de corte de pedra', 1, 'rebarbadora 230', 'Para cortar tijolo e abrir vãos.'),
    tool('Máquina de abrir roços', 1, 'abre roços', 'Abre os roços do canalizador e do eletricista com menos pó; também se aluga.', { optional: true }),
    tool('Cortador de cerâmica manual', 1, 'cortador manual cerâmica'),
    tool('Misturador elétrico, ou berbequim com vareta', 1, 'misturador elétrico', 'Para o cimento-cola, a impermeabilização e o betume.'),
    tool('Escadote', 1, 'escadote'),
    tool('Aspirador de obra (pó e água)', 1, 'aspirador sólidos e líquidos'),
    tool('Plástico e fita de proteção', 1, 'plástico de proteção', 'Para o chão, as portas e as janelas que ficam.', { unit: 'conjunto' }),
    tool('Luvas, óculos, máscaras FFP2 e proteção auditiva', 1, 'máscara ffp2', undefined, { unit: 'conjunto' }),
  ]
  return {
    groups: [
      { ...BUY, items: buy },
      { ...SITE, items: site },
    ],
    tools: { ...TOOLS, items: tools },
  }
}

/* ---------- Canalizador ---------- */

/** Comprimento médio de um ramal, do coletor ao aparelho. */
const BRANCH = 3

export function plumberMaterials(plan: Plan): TradeMaterials {
  const bs = baths(plan)
  const showers = bs.filter((b) => b.shower)
  const toilets = bs.filter((b) => b.toilet)
  const sinks = bs.filter((b) => b.sink)
  const wallTaps = sinks.filter((b) => b.sink!.axis)
  const deckTaps = sinks.filter((b) => !b.sink!.axis)
  const each = (xs: typeof bs, text: (b: (typeof bs)[number]) => string) => `${xs.map((b) => `${b.room.name}: ${text(b)}`).join('; ')}.`

  const buy: Material[] = []
  for (const b of showers) {
    const sh = b.shower!
    const [w, h] = [sh.f.w, sh.f.h].map((v) => Math.floor((v + 0.02) * 10) * 10)
    buy.push(
      sh.walkIn
        ? { item: 'Ralo linear de 70 cm', qty: 1, unit: 'un', detail: `${b.room.name}: duche de nível de ${f(sh.f.w)} × ${f(sh.f.h)} m.`, search: 'ralo linear' }
        : { item: `Base de duche extraplana de ~${w} × ${h} cm`, qty: 1, unit: 'un', detail: `${b.room.name}: duche de ${f(sh.f.w)} × ${f(sh.f.h)} m. As de resina cortam-se à medida.`, search: `base de duche ${w}x${h}` },
    )
    for (const s of (['n', 's', 'w', 'e'] as Side[]).map((side) => sideInfo(plan, b.room, sh.f, side)).filter((s) => !s.wall)) {
      const c = Math.round(s.len * 10) * 10
      buy.push({ item: `Resguardo de duche de ~${c} cm`, qty: 1, unit: 'un', detail: `${b.room.name}: entra-se pelo lado ${sideName[s.side]}, com ${f(s.len)} m.`, search: `${c >= 120 ? 'porta de duche' : 'resguardo de duche'} ${c}` })
    }
  }
  if (showers.length)
    buy.push({ item: 'Conjunto de duche encastrado termostático', qty: showers.length, unit: 'un', detail: 'Misturadora encastrada e chuveiro de braço, um por duche.', search: 'conjunto duche termostático encastrado' })
  if (toilets.length)
    buy.push(
      { item: 'Sanita suspensa', qty: toilets.length, unit: 'un', search: 'sanita suspensa' },
      {
        item: 'Estrutura para sanita suspensa, com autoclismo embutido',
        qty: toilets.length,
        unit: 'un',
        detail: each(toilets, (b) => (b.toilet!.prewall ? 'fica dentro da pré-parede nova' : `${b.toilet!.wall}, ${b.toilet!.exterior ? 'em pré-parede, sem cortar a fachada' : 'em pré-parede ou roço'}`)),
        search: 'estrutura sanita suspensa',
      },
      { item: 'Placa de descarga', qty: toilets.length, unit: 'un', detail: 'Compatível com a estrutura escolhida.', search: 'placa de descarga' },
    )
  if (sinks.length) {
    buy.push({ item: 'Lavatório de pousar', qty: sinks.length, unit: 'un', detail: each(sinks, (b) => `bancada de ${f(b.sink!.f.w)} × ${f(b.sink!.f.h)} m`), search: 'lavatório de apoio' })
    if (wallTaps.length) buy.push({ item: 'Torneira de parede para lavatório, com corpo de encastrar', qty: wallTaps.length, unit: 'un', detail: 'O corpo fica dentro da parede, antes do revestimento.', search: 'torneira lavatório encastrar' })
    if (deckTaps.length) buy.push({ item: 'Torneira de bancada para lavatório', qty: deckTaps.length, unit: 'un', detail: each(deckTaps, (b) => `por baixo da janela ${b.sink!.window ?? ''}`), search: 'torneira lavatório' })
    buy.push(
      { item: 'Válvula de lavatório sem ladrão (clic-clac)', qty: sinks.length, unit: 'un', search: 'válvula clic clac' },
      { item: 'Sifão de lavatório', qty: sinks.length, unit: 'un', detail: 'Fica à vista por baixo da bancada: escolher um de garrafa com bom acabamento.', search: 'sifão garrafa' },
    )
  }

  const branches = sum(bs.map((b) => (b.shower ? 2 : 0) + (b.sink ? 2 : 0) + (b.toilet ? 1 : 0)))
  const hot = sum(bs.map((b) => (b.shower ? 1 : 0) + (b.sink ? 1 : 0)))
  const heat = boninaNote('Canalizador:')
  const reducer = boninaNote('Recomendado:')
  const site: Material[] = [
    { item: 'Coletor de água quente e fria', qty: bs.length, unit: 'conjuntos', detail: 'Um por WC, com válvula de corte em cada ramal, num sítio acessível.', search: 'coletor água sanitária' },
    { item: 'Tubo multicamada Ø16', qty: branches * BRANCH, unit: 'm', approx: true, detail: `${branches} ramais de ~${BRANCH} m: quente e fria no duche e no lavatório, fria na sanita.`, search: 'tubo multicamada 16' },
    { item: 'Acessórios de multicamada Ø16', qty: branches * 2, unit: 'un', approx: true, detail: 'Dois por ramal: a ligação ao coletor e o cotovelo de parede (ou a ligação ao corpo de encastrar).', search: 'acessórios multicamada 16' },
    { item: 'Isolamento do tubo de água quente', qty: hot * BRANCH, unit: 'm', approx: true, detail: `${hot} ramais de água quente, mais a alimentação desde a bomba de calor.`, search: 'isolamento tubo' },
    { item: 'Abraçadeiras para tubo', qty: up((branches * BRANCH) / 0.5, 10), unit: 'un', approx: true, detail: 'Uma a cada 50 cm, para prender os tubos antes da betonilha e do reboco.', search: 'abraçadeira tubo' },
    { item: 'Alimentação até aos coletores', qty: 'a medir', detail: 'Água fria desde a entrada da casa e quente desde a bomba de calor; o canalizador define o diâmetro.', search: 'tubo multicamada' },
    ...(toilets.length ? [{ item: 'Tubo de PVC Ø110, barras de 3 m', qty: toilets.length, unit: 'barras', approx: true, detail: 'Uma por sanita, até à saída do WC; o troço até ao tubo de queda ou à caixa mede-se em obra.', search: 'tubo pvc 110' }] : []),
    ...(showers.length ? [{ item: 'Tubo de PVC Ø50, barras de 3 m', qty: showers.length, unit: 'barras', approx: true, detail: 'Uma por duche, até ao esgoto da sanita (ou à caixa).', search: 'tubo pvc 50' }] : []),
    ...(sinks.length ? [{ item: 'Tubo de PVC Ø40, barras de 3 m', qty: sinks.length, unit: 'barras', approx: true, detail: 'Uma por lavatório, até ao esgoto da sanita (ou à caixa).', search: 'tubo pvc 40' }] : []),
    { item: 'Acessórios de PVC: curvas, forquilhas e uniões', qty: bs.length * 6, unit: 'un', approx: true, detail: 'Uns 6 por WC: curvas de 45° e de 87° e uma forquilha para cada esgoto que liga ao da sanita.', search: 'curva pvc' },
    { item: 'Cola para PVC e líquido de limpeza', qty: 1, unit: 'conjunto', search: 'cola pvc' },
    { item: 'Fita de teflon ou linho e pasta de vedar', qty: 2, unit: 'un', search: 'fita teflon' },
    { item: 'Silicone sanitário (antifungos)', qty: bs.length + 1, unit: 'cartuchos', detail: 'À volta das bases de duche, dos lavatórios e das sanitas.', search: 'silicone antifungos' },
    { item: 'Conduta de extração Ø100–125', qty: bs.length, unit: 'un', optional: true, detail: 'Do extrator de cada WC até à saída de telhado; só se a VMC não servir os WC.', search: 'tubo alumínio extensível 125' },
    ...(heat ? [{ item: capital(heat.replace(/\.$/, '')), qty: 1, unit: 'conjunto', detail: 'Fica fora do orçamento da Bonina.' }] : []),
    ...(reducer
      ? [{ item: 'Redutor de pressão', qty: 1, unit: 'un', optional: true, detail: `${capital(reducer.replace(/^redutor de pressão /i, ''))} Recomendação da Bonina.`, search: 'redutor de pressão' }]
      : []),
  ]
  const tools: Material[] = [
    tool('Tesoura corta-tubo para multicamada', 1, 'tesoura corta tubo multicamada'),
    tool('Calibrador para multicamada Ø16 e Ø20', 1, 'calibrador multicamada', 'Abre e escareia o tubo antes do acessório.'),
    tool('Alicate de prensar para multicamada', 1, 'alicate prensar multicamada', 'Só para acessórios de prensar; também se aluga. Os de aperto dispensam-no.', { optional: true }),
    tool('Mola para curvar o tubo', 1, 'mola curvar tubo multicamada'),
    tool('Arco de serra', 1, 'arco de serra', 'Para cortar o tubo de PVC do esgoto.'),
    tool('Chave de grifos', 2, 'chave de grifos'),
    tool('Chave inglesa', 1, 'chave inglesa'),
    tool('Berbequim percutor, com brocas de betão e de cerâmica', 1, 'berbequim percutor'),
    tool('Bomba de prova (teste de pressão)', 1, 'bomba de teste de pressão', 'Para testar a instalação antes de fechar paredes e pavimento; também se aluga.'),
    tool('Pistola de silicone', 1, 'pistola de silicone'),
    tool('Nível de bolha de 60 cm', 1, 'nível de bolha'),
    tool('Fita métrica de 5 m', 1, 'fita métrica'),
  ]
  return {
    groups: [
      { ...BUY, note: `${BUY.note} Os corpos de encastrar e as estruturas das sanitas têm de estar em obra antes de se fecharem as paredes.`, items: buy },
      { ...SITE, items: site },
    ],
    tools: { ...TOOLS, items: tools },
  }
}

/* ---------- Eletricista ---------- */

/** Circuito de cada peça: iluminação (1,5 mm²), tomadas (2,5 mm²) ou dados. */
const CIRCUIT: Partial<Record<Part, 'light' | 'power' | 'data'>> = {
  switch: 'light',
  doubleSwitch: 'light',
  twoWay: 'light',
  intermediate: 'light',
  ceilingLight: 'light',
  bathLight: 'light',
  mirrorLight: 'light',
  stairLight: 'light',
  extractor: 'light',
  presence: 'light',
  socket: 'power',
  towelRail: 'power',
  data: 'data',
}
const SWITCHES: Part[] = ['switch', 'doubleSwitch', 'twoWay', 'intermediate']
/** Do teto (onde passa o tubo) até ao ponto, com a folga nas caixas (m). */
const DROP: Partial<Record<Part, number>> = { switch: 1.6, doubleSwitch: 1.6, twoWay: 1.6, intermediate: 1.6, socket: 2.4, towelRail: 2.0, data: 2.4, mirrorLight: 0.8, stairLight: 0.8 }
const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/** Tubo e fio por circuito: um tubo da caixa de derivação da divisão a cada ponto, e da caixa ao quadro. */
function wiring(plan: Plan, el: ElectricianData) {
  const placed = el.placed.filter((p) => !p.optional && CIRCUIT[p.part])
  const groups = [...new Set(placed.map((p) => p.group))]
  const hub = new Map(groups.map((g) => [g, placed.find((p) => p.group === g && SWITCHES.includes(p.part)) ?? placed.find((p) => p.group === g)!]))
  const circ = plan.rooms.find((r) => r.tone === 'circ')
  const board = circ ? centroid(circ) : { x: W / 2, y: D / 2 }
  const w = { points: 0, tube20: 0, tube25: 0, light: 0, power: 0, data: 0, joints: 0, board: circ?.name.toLowerCase() ?? 'centro' }
  for (const p of placed) {
    const kind = CIRCUIT[p.part]!
    if (kind === 'data') {
      const len = manhattan(p, board) + 2 * (DROP.data ?? 0)
      w.data += len
      w.tube20 += len
      continue
    }
    const len = manhattan(p, hub.get(p.group)!) + (DROP[p.part] ?? 0.5)
    w.points++
    w.tube20 += len
    w[kind] += len * (p.part === 'intermediate' ? 4 : 3)
    // o retorno de cada luz junta-se ao do interruptor na caixa
    if (kind === 'light' && !SWITCHES.includes(p.part) && p.part !== 'presence') w.joints++
  }
  for (const g of groups) {
    const home = manhattan(hub.get(g)!, board) + 1.5
    for (const kind of ['light', 'power'] as const)
      if (placed.some((p) => p.group === g && CIRCUIT[p.part] === kind)) {
        w.tube25 += home
        w[kind] += home * 3
        w.joints += 3
      }
  }
  return w
}

export function electricianMaterials(plan: Plan, el: ElectricianData): TradeMaterials {
  const where = (part: Part, optional: boolean) => {
    const by = new Map<string, number>()
    for (const p of el.placed) if (p.part === part && p.optional === optional) by.set(p.group, (by.get(p.group) ?? 0) + p.n)
    return listJoin([...by].map(([g, n]) => (n > 1 ? `${g} (${n})` : g)))
  }
  const part = (k: Part, item: string, search: string | undefined, extra = '', opts: Partial<Material> = {}): Material[] => {
    const n = el.parts[k] ?? 0
    const o = el.optional[k] ?? 0
    if (!n && !o) return []
    const more = n && o ? ` Mais ${o} se houver: ${where(k, true)}.` : ''
    return [{ item, qty: n || o, unit: 'un', optional: !n, detail: `${where(k, !n)}.${more}${extra ? ` ${extra}` : ''}`, search, ...opts }]
  }
  const modules = (boxes: number[]) =>
    listJoin(
      tally(boxes)
        .sort((a, b) => a[0] - b[0])
        .map(([m, n], i) => `${n} de ${m}${i === 0 ? (m === 1 ? ' elemento' : ' elementos') : ''}`),
    )
  const supplies = [...(boninaNote('Eletricista:') ?? '').matchAll(/do quadro até (à|ao) ([^,]+), cabo (.+?) com disjuntor de (\d+) A/g)].map(([, prep, to, cable, amps]) => ({ prep, to, cable, amps }))
  const vmc = bonina.rooms.find(([k]) => k.startsWith('Sótão'))
  const optionalBoxes = el.optionalBoxes.length ? ` Mais ${el.optionalBoxes.length} se houver a tomada opcional.` : ''
  const rooms = new Set(el.placed.filter((p) => !p.optional).map((p) => p.group))

  const buy: Material[] = [
    ...part('switch', 'Interruptor simples', 'interruptor simples'),
    ...part('doubleSwitch', 'Interruptor duplo (comutador de lustre)', 'comutador de lustre', 'Na porta dos WC: luz do teto e luz do espelho.'),
    ...part('twoWay', 'Comutador de escada', 'comutador de escada', 'Nos quartos, com o inversor, a luz liga-se na porta e nas duas cabeceiras.'),
    ...part('intermediate', 'Inversor', 'interruptor inversor', 'Na porta dos quartos, ligado aos comutadores das cabeceiras.'),
    ...part('socket', 'Tomada schuko', 'tomada schuko'),
    ...part('data', 'Tomada de dados RJ45 (cat6)', 'tomada rj45 cat6'),
    { item: 'Espelhos da aparelhagem', qty: el.boxes.length, unit: 'un', detail: `${capital(modules(el.boxes))}, da mesma série da aparelhagem.${optionalBoxes}`, search: 'espelho interruptor' },
    ...part('ceilingLight', 'Candeeiro ou plafon de teto', 'candeeiro de teto'),
    ...part('bathLight', 'Plafon de teto IP44', 'plafon casa de banho', 'Fora das zonas 1 e 2 do duche.'),
    ...part('mirrorLight', 'Luz de espelho IP44', 'aplique espelho casa de banho'),
    ...part('stairLight', 'Luz da escada (LED nos degraus ou apliques)', 'luz de degrau embutida', '', { unit: 'conjunto' }),
    ...part('extractor', 'Extrator de casa de banho, com temporizador', 'extrator casa de banho', 'Só se a VMC não servir os WC; no WC sem janela a extração é obrigatória (extrator ou boca da VMC).', { optional: true }),
    ...part('towelRail', 'Toalheiro elétrico', 'toalheiro elétrico'),
    ...part('presence', 'Sensor de presença', 'sensor de presença', 'Para a luz do closet, em vez do interruptor.'),
  ]

  const w = wiring(plan, el)
  const margin = (v: number) => up(v * 1.1, 10)
  /** Rolos de 100 m, o mesmo número em cada cor. */
  const rolls = (m: number, colours: string[]) => {
    const each = up(m / colours.length / 100)
    return `${each * colours.length} rolos de 100 m: ${each > 1 ? `${each} de cada cor` : 'um de cada cor'} (${listJoin(colours)})`
  }
  const site: Material[] = [
    { item: 'Caixas de aparelhagem', qty: el.boxes.length, unit: 'un', detail: `Uma por posição: ${modules(el.boxes)}.${optionalBoxes}`, search: 'caixa de aparelhagem' },
    { item: 'Caixas de derivação', qty: rooms.size, unit: 'un', approx: true, detail: `Uma por divisão com instalação nova (${listJoin([...rooms])}).`, search: 'caixa derivação' },
    {
      item: 'Tubo anelado Ø20, com guia',
      qty: margin(w.tube20),
      unit: 'm',
      approx: true,
      detail: `Um tubo da caixa de derivação da divisão a cada um dos ${w.points} pontos${w.data ? ' e outro para a tomada de dados' : ''}, a direito pelo teto e a descer na parede, com 10 % de folga: ${up(margin(w.tube20) / 100)} rolos de 100 m.`,
      search: 'tubo anelado 20',
    },
    {
      item: 'Tubo anelado Ø25, com guia',
      qty: margin(w.tube25),
      unit: 'm',
      approx: true,
      detail: `Das caixas de derivação ao quadro, um por circuito (contado até ao ${w.board}, onde se assume o quadro): ${up(margin(w.tube25) / 50)} rolos de 50 m.`,
      search: 'tubo anelado 25',
    },
    {
      item: 'Fio H07V-U 1,5 mm² (iluminação)',
      qty: margin(w.light),
      unit: 'm',
      approx: true,
      detail: `Três condutores por tubo (quatro no inversor). ${capital(rolls(margin(w.light), ['castanho', 'azul', 'verde-amarelo', 'preto para os retornos']))}.`,
      search: 'cabo h07v-u 1,5',
    },
    {
      item: 'Fio H07V-U 2,5 mm² (tomadas)',
      qty: margin(w.power),
      unit: 'm',
      approx: true,
      detail: `Fase, neutro e terra. ${capital(rolls(margin(w.power), ['castanho', 'azul', 'verde-amarelo']))}.`,
      search: 'cabo h07v-u 2,5',
    },
    ...(w.data > 0 ? [{ item: 'Cabo UTP cat6', qty: margin(w.data), unit: 'm', approx: true, detail: `Da tomada de dados até ao router (contado até ao ${w.board}).`, search: 'cabo utp cat6' }] : []),
    {
      item: 'Ligadores rápidos (tipo Wago), de 3 e de 5 entradas',
      qty: up(w.joints * 1.2, 10),
      unit: 'un',
      approx: true,
      detail: 'Nas caixas de derivação: um para a fase, um para o neutro e um para a terra de cada circuito, mais um por cada luz, e 20 % de reserva.',
      search: 'ligador rápido',
    },
    { item: 'Fita isoladora', qty: 2, unit: 'rolos', search: 'fita isoladora' },
    ...supplies.flatMap((s): Material[] => [
      { item: `Cabo ${s.cable}`, qty: 'a medir', detail: `Do quadro até ${s.prep} ${s.to} (fica fora do orçamento da Bonina). Em armazém de material elétrico.` },
      { item: `Disjuntor de ${s.amps} A`, qty: 1, unit: 'un', detail: `Circuito da ${s.to}.`, search: `disjuntor 1p+n ${s.amps}a` },
    ]),
    { item: 'Diferencial de 30 mA e disjuntores dos circuitos novos', qty: 'conforme o quadro', detail: 'Circuitos separados para iluminação, tomadas e WC (RTIEBT).', search: 'diferencial 30ma' },
    ...((el.parts.acBox ?? 0) > 0 ? [{ item: 'Caixa de ligação do ar condicionado', qty: el.parts.acBox!, unit: 'un', detail: 'Junto a cada unidade interior, nos quartos.', search: 'caixa derivação' }] : []),
    ...(vmc ? [{ item: 'Alimentação e comando da VMC', qty: 1, unit: 'conjunto', detail: `${vmc[1]}, no ${vmc[0].toLowerCase()}.` }] : []),
  ]

  const tools: Material[] = [
    tool('Berbequim percutor, com coroa de 68 mm', 1, 'coroa 68 mm', 'A coroa abre os furos das caixas de aparelhagem.'),
    tool('Guia passa-cabos de 15 a 30 m', 1, 'guia passa cabos', 'Para puxar o fio nos tubos sem guia ou quando a guia parte.'),
    tool('Alicate universal, alicate de corte e descarnador', 1, 'alicate descarnador', undefined, { unit: 'conjunto' }),
    tool('Chaves de fendas isoladas (1000\u00a0V)', 1, 'chaves isoladas', undefined, { unit: 'conjunto' }),
    tool('Detetor de tensão', 1, 'detetor de tensão'),
    tool('Multímetro', 1, 'multímetro'),
    ...(w.data > 0 ? [tool('Ferramenta de cravar RJ45', 1, 'alicate cravar rj45', 'Para a tomada de dados.')] : []),
    tool('Nível de bolha', 1, 'nível de bolha', 'Para alinhar as caixas.'),
    tool('Escadote', 1, 'escadote'),
    tool('Máquina de abrir roços', 1, 'abre roços', 'Se for o eletricista a abrir os roços; também se aluga.', { optional: true }),
  ]
  return {
    groups: [
      { ...BUY, items: buy },
      { ...SITE, items: site },
    ],
    tools: { ...TOOLS, items: tools },
  }
}

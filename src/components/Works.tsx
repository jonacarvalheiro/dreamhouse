import { Check, Copy, Droplets, ExternalLink, FileText, Hammer, Share2, Zap, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { FloorPlan } from '@/components/FloorPlan'
import { PlanLegend } from '@/components/Legend'
import { Toggle } from '@/components/Toggle'
import { TradePlan } from '@/components/TradePlan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { plantasPdf, tradePdfPage } from '@/content'
import { buildProposalC } from '@/plan/proposalC'
import { FLOOR_TO_FLOOR, calcC } from '@/plan/stair'
import { electricianMaterials, lmSearch, masonMaterials, materialsNote, plumberMaterials, qtyText, type Material, type MaterialGroup, type TradeMaterials } from '@/works/materials'
import { PLUMBER_COLOR, electricianData, flipNote, legendEl, masonData, plumberData, tradeHref, tradeInfo, trades, type Block, type Trade } from '@/works/trades'

const sC = calcC(FLOOR_TO_FLOOR)
const plan = buildProposalC(sC)
const stair = { kind: 'l', s: sC } as const
const mason = masonData(plan, { works: 'a planta de obra', trades: 'pontos nos separadores Canalizador e Eletricista' })
const materials: Record<Trade, TradeMaterials> = {
  pedreiro: masonMaterials(plan),
  canalizador: plumberMaterials(plan),
  eletricista: electricianMaterials(plan, electricianData(plan, stair)),
}
const icons: Record<Trade, LucideIcon> = { pedreiro: Hammer, canalizador: Droplets, eletricista: Zap }
const coords = (flip: boolean) => `Medidas em metros a partir das faces interiores das paredes poente (x) e norte (y).${flipNote(flip)}`

type Props = { trade: Trade; onTrade: (t: Trade) => void; flip: boolean; onFlip: (v: boolean) => void }

/** Página da obra: um separador por ofício, com a planta, o que há a fazer e os materiais. */
export function Works({ trade, onTrade, flip, onFlip }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const plumber = useMemo(() => plumberData(plan, flip), [flip])
  const electrician = useMemo(() => electricianData(plan, stair, flip), [flip])

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <Tabs value={trade} onValueChange={(v) => onTrade(v as Trade)} className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9! w-full sm:w-fit">
            {trades.map((t) => {
              const Icon = icons[t]
              return (
                <TabsTrigger key={t} value={t} className="px-3">
                  <Icon aria-hidden />
                  {tradeInfo[t].label}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <Toggle label="Entrada em baixo" checked={flip} onChange={onFlip} />
        </div>

        <TabsContent value="pedreiro" className="space-y-6">
          <Intro trade="pedreiro" flip={flip} />
          <Split
            plan={
              <>
                <div className="px-2 pt-2 sm:px-4">
                  <FloorPlan plan={plan} flip={flip} showFurniture={false} showDims showWorks hovered={hovered} onHover={setHovered} />
                </div>
                <PlanLegend works />
              </>
            }
          >
            {[mason.walls, mason.doors, mason.slab, mason.floor, mason.glass, mason.showers, mason.others].map((b) => b && <BlockCard key={b.title} block={b} />)}
          </Split>
          <Materials groups={materials.pedreiro.groups} />
          <Tools group={materials.pedreiro.tools} />
        </TabsContent>

        <TabsContent value="canalizador" className="space-y-6">
          <Intro trade="canalizador" flip={flip} />
          <Split
            plan={
              <>
                <div className="px-2 pt-2 sm:px-4">
                  <TradePlan plan={plan} flip={flip} marks={plumber.marks} lines={plumber.lines} />
                </div>
                <Separator />
                <p className="px-4 py-3 text-xs text-stone-600">Cada número é um ponto da lista. {coords(flip)}</p>
              </>
            }
          >
            <Points block={plumber.points} color={() => PLUMBER_COLOR} />
            <BlockCard block={plumber.general} />
            <p className="px-1 text-xs leading-relaxed text-stone-500">{plumber.note}</p>
          </Split>
          <Materials groups={materials.canalizador.groups} />
          <Tools group={materials.canalizador.tools} />
        </TabsContent>

        <TabsContent value="eletricista" className="space-y-6">
          <Intro trade="eletricista" flip={flip} />
          <Split
            plan={
              <>
                <div className="px-2 pt-2 sm:px-4">
                  <TradePlan plan={plan} flip={flip} marks={electrician.marks} zones={electrician.zones} />
                </div>
                <Separator />
                <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 text-xs text-stone-600">
                  {legendEl.map(([k, c, l]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <Code code={k} color={c} small />
                      {l}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5">
                    <span className="block h-3 w-5 border border-dashed border-red-600 bg-red-50" />
                    Zona 2 do duche
                  </span>
                </div>
                <p className="px-4 pb-3 text-xs text-stone-600">{coords(flip)}</p>
              </>
            }
          >
            <Points block={electrician.points} color={(code) => legendEl.find(([k]) => k === code)?.[1]} />
            <BlockCard block={electrician.rules} />
            <BlockCard block={electrician.supplies} />
            <p className="px-1 text-xs leading-relaxed text-stone-500">{electrician.note}</p>
          </Split>
          <Materials groups={materials.eletricista.groups} />
          <Tools group={materials.eletricista.tools} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

/** Planta à esquerda (fixa ao descer, em ecrãs largos) e o resto à direita. */
function Split({ plan, children }: { plan: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="gap-0 py-0 lg:sticky lg:top-4">{plan}</Card>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  )
}

function Intro({ trade, flip }: { trade: Trade; flip: boolean }) {
  const [copied, setCopied] = useState(false)
  const info = tradeInfo[trade]
  const Icon = icons[trade]
  const link = new URL(tradeHref(trade, flip), window.location.origin).href
  const pdf = plantasPdf.find((p) => p.flip === flip) ?? plantasPdf[0]
  const page = tradePdfPage[trade]
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const input = document.getElementById(`link-${trade}`) as HTMLInputElement | null
      input?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="size-5 text-stone-500" aria-hidden />
          {info.label}
        </CardTitle>
        <CardDescription>
          {info.scope} Tudo o que está aqui sai da planta da Proposta C: a planta com os pontos, o que há a fazer e os materiais previstos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={`link-${trade}`} className="text-xs font-medium text-stone-500">
            Link direto para mandar ao {info.label.toLowerCase()}
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            <input
              id={`link-${trade}`}
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="h-8 min-w-0 flex-1 basis-56 rounded-lg bg-stone-50 px-3 font-mono text-xs text-stone-700 ring-1 ring-stone-200 outline-none focus:ring-stone-400"
            />
            <Button onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            {canShare && (
              <Button variant="outline" onClick={() => navigator.share({ title: `Obra · ${info.label}`, url: link }).catch(() => {})}>
                <Share2 aria-hidden />
                Partilhar
              </Button>
            )}
          </div>
        </div>
        <a
          href={`${import.meta.env.BASE_URL}${pdf.file}#page=${page}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-lg px-2.5 text-sm font-medium text-stone-900 ring-1 ring-stone-300 hover:bg-stone-100 lg:self-auto"
        >
          <FileText className="size-4" aria-hidden />
          Folha {page} do PDF
          <span className="font-normal text-stone-500">· {pdf.label.toLowerCase()}</span>
        </a>
      </CardContent>
    </Card>
  )
}

function Code({ code, color, small }: { code: string; color?: string; small?: boolean }) {
  const size = small ? 'size-4 text-[9px]' : 'size-6 text-[11px]'
  if (!color || !code.trim() || code === '–') return <span className={`${size} shrink-0`} aria-hidden />
  return (
    <span className={`${size} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white tabular-nums`} style={{ background: color }}>
      {code}
    </span>
  )
}

function CardHead({ title }: { title: string }) {
  return (
    <CardHeader className="border-b border-stone-100 py-3">
      <CardTitle className="font-semibold">{title}</CardTitle>
    </CardHeader>
  )
}

/** Pontos numerados (canalizador) ou por símbolo (eletricista), agrupados por divisão. */
function Points({ block, color }: { block: Block; color: (code: string) => string | undefined }) {
  return (
    <Card className="gap-0 py-0">
      <CardHead title={block.title} />
      <ul className="divide-y divide-stone-100">
        {block.rows.map((r, i) =>
          r.length === 1 ? (
            <li key={i} className="bg-stone-50 px-4 py-2 text-xs font-semibold tracking-wide text-stone-600 uppercase">
              {r[0]}
            </li>
          ) : (
            <li key={i} className="flex gap-3 px-4 py-2.5">
              <Code code={String(r[0])} color={color(String(r[0]))} />
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium text-stone-900">{r[1]}</p>
                {r[2] !== '' && <p className="text-stone-600">{r[2]}</p>}
                {r[3] !== '' && <p className="text-xs text-stone-500">{r[3]}</p>}
              </div>
            </li>
          ),
        )}
      </ul>
    </Card>
  )
}

/** Tabela de uma folha: com duas colunas sem cabeçalho fica em lista (nome e texto). */
function BlockCard({ block }: { block: Block }) {
  const pairs = block.head.length === 2 && !block.head.some(Boolean)
  return (
    <Card className="gap-0 py-0">
      <CardHead title={block.title} />
      {pairs ? (
        <dl className="divide-y divide-stone-100">
          {block.rows.map((r, i) => (
            <div key={i} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-medium text-stone-900">{r[0]}</dt>
              <dd className="text-stone-600">{r[1]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-stone-500 uppercase">
                {block.head.map((h, j) => (
                  <th key={j} className={`py-2 font-medium ${j === 0 ? 'pl-4' : 'pl-3'} ${j === block.head.length - 1 ? 'pr-4' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {block.rows.map((r, i) => (
                <tr key={i} className="align-top">
                  {r.map((c, j) => {
                    const last = j === r.length - 1
                    return (
                      <td
                        key={j}
                        className={`py-2 ${j === 0 ? 'pl-4 font-medium text-stone-900' : 'pl-3'} ${last ? 'pr-4 text-stone-600' : 'whitespace-nowrap tabular-nums'} ${j === 0 && !last ? 'sm:whitespace-nowrap' : ''}`}
                      >
                        {c}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {block.note && <p className="border-t border-stone-100 px-4 py-3 text-xs leading-relaxed text-stone-500">{block.note}</p>}
    </Card>
  )
}

function Materials({ groups }: { groups: MaterialGroup[] }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-stone-100 py-4">
        <CardTitle className="text-base font-semibold">Materiais previstos</CardTitle>
        <CardDescription>{materialsNote}</CardDescription>
      </CardHeader>
      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-stone-100">
        {groups.map((g) => (
          <section key={g.title} className="min-w-0 max-lg:not-first:border-t max-lg:not-first:border-stone-100">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-semibold text-stone-900">{g.title}</h3>
              <p className="text-xs text-stone-500">{g.note}</p>
            </div>
            <ul className="divide-y divide-stone-100">
              {g.items.map((m, i) => (
                <MaterialRow key={i} m={m} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  )
}

/** Ferramenta em colunas: a lista é longa e cada linha é curta. */
function Tools({ group }: { group: MaterialGroup }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-stone-100 py-4">
        <CardTitle className="text-base font-semibold">{group.title}</CardTitle>
        <CardDescription>{group.note}</CardDescription>
      </CardHeader>
      <ul className="-mt-px grid sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map((m, i) => (
          <MaterialRow key={i} m={m} className="border-t border-stone-100" />
        ))}
      </ul>
    </Card>
  )
}

function MaterialRow({ m, className = '' }: { m: Material; className?: string }) {
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-2.5 ${className}`}>
      <div className="min-w-0">
        <p className="font-medium text-stone-900">
          {m.item}
          {m.optional && (
            <Badge variant="secondary" className="ml-2 align-middle text-[10px]">
              opcional
            </Badge>
          )}
        </p>
        {m.detail && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{m.detail}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="font-medium whitespace-nowrap text-stone-900 tabular-nums">{qtyText(m)}</span>
        {m.search && (
          <a href={lmSearch(m.search)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-emerald-700 hover:text-emerald-900 hover:underline">
            Leroy Merlin
            <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
    </li>
  )
}

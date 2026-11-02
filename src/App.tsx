import { Download } from 'lucide-react'
import { Fragment, Suspense, lazy, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { cameraPresets, type CameraPreset } from '@/components/cameraPresets'
import { FloorPlan } from '@/components/FloorPlan'
import { PlanLegend } from '@/components/Legend'
import { Toggle } from '@/components/Toggle'
import { Works } from '@/components/Works'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { existingPlan } from '@/plan/existing'
import { contentA, contentC, contentE, plantasPdf, variantLabels, type Variant } from '@/content'
import { buildProposal } from '@/plan/proposal'
import { buildProposalC } from '@/plan/proposalC'
import { buildProposalE } from '@/plan/proposalE'
import { CEILING, FLOOR_TO_FLOOR, HEADROOM, SOFFIT, calcC, calcE, calcStair } from '@/plan/stair'
import type { Plan } from '@/plan/types'
import { tradeHref, trades, type Trade } from '@/works/trades'

const House3D = lazy(() => import('@/components/House3D'))
const params = new URLSearchParams(window.location.search)
const setParam = (key: string, value: string | null) => {
  const url = new URL(window.location.href)
  if (value === null) url.searchParams.delete(key)
  else url.searchParams.set(key, value)
  window.history.replaceState(null, '', url)
}
/** Página da obra: `?obra=pedreiro|canalizador|eletricista`; sem o parâmetro, a planta e o 3D. */
const tradeInUrl = () => trades.find((t) => t === new URLSearchParams(window.location.search).get('obra')) ?? null

/** Propostas postas de parte: continuam acessíveis, com o aviso de arquivada. */
const archived = ['a', 'e'] as const

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',')

export default function App() {
  const [showFurniture, setShowFurniture] = useState(params.get('mob') === '1')
  const [showDims, setShowDims] = useState(true)
  const [showWorks, setShowWorks] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tab, setTab] = useState<string>(params.get('tab') ?? '3d')
  const [preset, setPreset] = useState<CameraPreset>((params.get('cam') as CameraPreset) ?? 'geral')
  const [walk, setWalk] = useState(params.get('walk') === '1')
  const [cutWalls, setCutWalls] = useState(params.get('cut') === '1')
  const [showLabels, setShowLabels] = useState(params.get('labels') !== '0')
  const [plan3d, setPlan3d] = useState<'proposta' | 'existente'>(params.get('plan') === 'existente' ? 'existente' : 'proposta')
  const [flip, setFlipState] = useState(params.get('flip') === '1')
  const setFlip = (v: boolean) => {
    setFlipState(v)
    setParam('flip', v ? '1' : null)
  }

  const [trade, setTradeState] = useState<Trade | null>(tradeInUrl)
  const [lastTrade, setLastTrade] = useState<Trade>(trade ?? 'pedreiro')
  const setTrade = (t: Trade) => {
    setTradeState(t)
    setLastTrade(t)
    setParam('obra', t)
  }
  /** Muda de página como um link normal (fica no histórico), sem recarregar. */
  const goTo = (t: Trade | null) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (t === trade) return
    const url = new URL(window.location.href)
    if (t) url.searchParams.set('obra', t)
    else url.searchParams.delete('obra')
    window.history.pushState(null, '', url)
    setTradeState(t)
    if (t) setLastTrade(t)
    window.scrollTo(0, 0)
  }
  useEffect(() => {
    const onPop = () => {
      const t = tradeInUrl()
      setTradeState(t)
      if (t) setLastTrade(t)
      setFlipState(new URLSearchParams(window.location.search).get('flip') === '1')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const [variant, setVariantState] = useState<Variant>((['a', 'c', 'e'] as const).find((v) => v === params.get('v')) ?? 'c')
  const setVariant = (v: Variant) => {
    setVariantState(v)
    setHovered(null)
    setParam('v', v === 'c' ? null : v)
  }

  const { proposal, content } = useMemo(() => {
    if (variant === 'a') {
      const s = calcStair(FLOOR_TO_FLOOR)
      return { proposal: buildProposal(s), content: contentA(s) }
    }
    if (variant === 'e') {
      const s = calcE(FLOOR_TO_FLOOR)
      const plan = buildProposalE(s)
      return { proposal: plan, content: contentE(s, plan) }
    }
    const s = calcC(FLOOR_TO_FLOOR)
    return { proposal: buildProposalC(s), content: contentC(s) }
  }, [variant])

  const activePlan = tab === 'existente' ? existingPlan : proposal
  const hoveredRoom = hovered ? activePlan.rooms.find((r) => r.id === hovered) ?? existingPlan.rooms.find((r) => r.id === hovered) : null

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900">
      <header className="border-b border-stone-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Remodelação · Casa principal · R/C</p>
            <div className="flex flex-col gap-1.5 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-stone-500">Plantas da Proposta C em PDF</span>
                {plantasPdf.map((p) => (
                  <a
                    key={p.file}
                    href={`${import.meta.env.BASE_URL}${p.file}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-900 ring-1 ring-stone-300 hover:bg-stone-100"
                  >
                    <Download className="size-3.5" aria-hidden />
                    {p.label}
                  </a>
                ))}
              </div>
              {!trade && (
                <p className="text-xs text-stone-500">
                  Arquivadas:{' '}
                  {archived.map((v, i) => (
                    <Fragment key={v}>
                      {i > 0 && ' · '}
                      <button onClick={() => setVariant(v)} className={`underline-offset-2 hover:text-stone-900 hover:underline ${variant === v ? 'font-medium text-stone-900' : ''}`}>
                        {variantLabels[v].short}
                      </button>
                    </Fragment>
                  ))}
                </p>
              )}
            </div>
          </div>
          {trade || variant === 'c' ? (
            <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {variantLabels.c.short} <span className="font-normal text-stone-500">· {variantLabels.c.long}</span>
            </h1>
          ) : (
            <div className="mt-3 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              <span>
                <b>{variantLabels[variant].short} · arquivada.</b> {variantLabels[variant].long}. Fica aqui só para consulta; a proposta escolhida é a C.
              </span>
              <button onClick={() => setVariant('c')} className="font-medium underline underline-offset-2 hover:text-amber-950">
                Voltar à Proposta C
              </button>
            </div>
          )}
          <nav aria-label="Páginas" className="mt-4 -mb-5 flex gap-6 text-sm lg:-mb-6">
            <PageLink href={`${import.meta.env.BASE_URL}${flip ? '?flip=1' : ''}`} active={!trade} onClick={goTo(null)}>
              Planta e 3D
            </PageLink>
            <PageLink href={tradeHref(trade ?? lastTrade, flip)} active={!!trade} onClick={goTo(trade ?? lastTrade)}>
              Obra: ofícios e materiais
            </PageLink>
          </nav>
        </div>
      </header>

      {trade ? (
        <Works trade={trade} onTrade={setTrade} flip={flip} onFlip={setFlip} />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-8">
          <section className="min-w-0">
            <Card className="overflow-hidden">
              <Tabs value={tab} onValueChange={(v) => { setTab(v as string); setHovered(null) }}>
                <div className="flex flex-col gap-3 border-b border-stone-100 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList>
                    <TabsTrigger value="3d">3D</TabsTrigger>
                    <TabsTrigger value="proposta">Proposta</TabsTrigger>
                    <TabsTrigger value="existente">Existente</TabsTrigger>
                    <TabsTrigger value="comparar">Comparar</TabsTrigger>
                  </TabsList>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <Toggle label="Mobiliário" checked={showFurniture} onChange={setShowFurniture} disabled={tab === 'existente'} />
                    {tab === '3d' ? (
                      <>
                        <Toggle label="Passear" checked={walk} onChange={setWalk} />
                        <Toggle label="Nomes" checked={showLabels} onChange={setShowLabels} />
                        <Toggle label="Cortar paredes" checked={cutWalls} onChange={setCutWalls} disabled={walk} />
                      </>
                    ) : (
                      <>
                        <Toggle label="Cotas" checked={showDims} onChange={setShowDims} />
                        <Toggle label="Entrada em baixo" checked={flip} onChange={setFlip} />
                      </>
                    )}
                    <Toggle label="Demolir / construir" checked={showWorks} onChange={setShowWorks} disabled={tab === 'existente'} />
                  </div>
                </div>

                {tab !== '3d' && <RoomInfo room={hoveredRoom ?? null} />}

                <TabsContent value="3d" className="pb-3">
                  <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-4 py-2.5">
                    <div className="flex rounded-lg bg-white p-0.5 ring-1 ring-stone-200">
                      {(['proposta', 'existente'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPlan3d(p)}
                          className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition ${plan3d === p ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}
                        >
                          {p === 'proposta' ? 'Proposta' : 'Hoje'}
                        </button>
                      ))}
                    </div>
                    <span className="mx-1 hidden h-5 w-px bg-stone-200 sm:block" />
                    {(Object.keys(cameraPresets) as CameraPreset[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setPreset(k)}
                        className={`rounded-full px-3 py-1 text-sm transition ${preset === k ? 'bg-stone-200 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-100'}`}
                      >
                        {cameraPresets[k].label}
                      </button>
                    ))}
                  </div>
                  <div className="relative h-[62vh] min-h-[380px] w-full">
                    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-stone-500">A carregar o modelo 3D…</div>}>
                      <House3D
                        plan={plan3d === 'proposta' ? proposal : existingPlan}
                        floorToFloor={FLOOR_TO_FLOOR}
                        preset={preset}
                        showFurniture={showFurniture && plan3d === 'proposta'}
                        showLabels={showLabels}
                        showWorks={showWorks && plan3d === 'proposta'}
                        cutWalls={walk ? false : cutWalls}
                        walk={walk}
                      />
                    </Suspense>
                    <p className="pointer-events-none absolute bottom-2 left-3 z-20 rounded bg-white/85 px-2 py-1 text-xs text-stone-600">
                      {walk
                        ? 'Clique para entrar · W A S D para andar · rato para olhar · Esc para soltar o rato · Shift para acelerar'
                        : 'Arrastar para rodar · roda do rato para aproximar · botão direito para deslocar · «Passear» para andar lá dentro'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="proposta" className="px-2 pb-3 sm:px-4">
                  <FloorPlan plan={proposal} flip={flip} showFurniture={showFurniture} showDims={showDims} showWorks={showWorks} hovered={hovered} onHover={setHovered} />
                </TabsContent>
                <TabsContent value="existente" className="px-2 pb-3 sm:px-4">
                  <FloorPlan plan={existingPlan} flip={flip} showFurniture={false} showDims={showDims} showWorks={false} hovered={hovered} onHover={setHovered} />
                </TabsContent>
                <TabsContent value="comparar" className="px-2 pb-3 sm:px-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <figure>
                      <figcaption className="mb-1 px-2 text-xs font-medium tracking-wide text-stone-500 uppercase">Existente</figcaption>
                      <FloorPlan plan={existingPlan} flip={flip} showFurniture={false} showDims={false} showWorks={false} hovered={hovered} onHover={setHovered} showContext={false} compact />
                    </figure>
                    <figure>
                      <figcaption className="mb-1 px-2 text-xs font-medium tracking-wide text-stone-500 uppercase">Proposta</figcaption>
                      <FloorPlan plan={proposal} flip={flip} showFurniture={showFurniture} showDims={false} showWorks={showWorks} hovered={hovered} onHover={setHovered} showContext={false} compact />
                    </figure>
                  </div>
                </TabsContent>
              </Tabs>
              <PlanLegend works={showWorks && tab !== 'existente'} />
            </Card>
          </section>

          <aside>
            <Card>
              <CardHeader>
                <CardTitle>Escada</CardTitle>
                <CardDescription>
                  Piso a piso de {fmt(FLOOR_TO_FLOOR)} m, confirmado em obra: {fmt(CEILING)} m de pé-direito final (o pavimento do R/C sobe 10 cm) mais {fmt(SOFFIT * 100, 1)} cm de laje.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <figure className="rounded-lg border border-stone-200 bg-stone-50/60 p-2">
                  {content.section}
                  <figcaption className="px-1 pt-1 text-[11px] leading-snug text-stone-500">{content.sectionCaption}</figcaption>
                </figure>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {content.specs.map(([k, v]) => (
                    <Spec key={k} k={k} v={v} />
                  ))}
                </dl>

                {content.ok ? (
                  <p className="rounded-md bg-lime-50 px-3 py-2 text-sm text-lime-900">
                    Dentro das regras e com {fmt(HEADROOM)} m livres em toda a subida, incluindo por baixo do telhado.
                  </p>
                ) : (
                  <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {content.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </aside>
        </main>
      )}

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-stone-500 sm:px-6">
        Medidas interiores retiradas do levantamento (planta do R/C). Este estudo prévio não substitui o projeto de arquitetura e de estabilidade.
      </footer>
    </div>
  )
}

function PageLink({ href, active, onClick, children }: { href: string; active: boolean; onClick: (e: MouseEvent<HTMLAnchorElement>) => void; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`border-b-2 pb-3 transition-colors ${active ? 'border-stone-900 font-medium text-stone-900' : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-900'}`}
    >
      {children}
    </a>
  )
}

function RoomInfo({ room }: { room: Plan['rooms'][number] | null }) {
  return (
    <div className="min-h-[68px] border-b border-stone-100 bg-stone-50/60 px-4 py-3 text-sm">
      {room ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{room.name}</span>
            <Badge variant="secondary" className="tabular-nums">
              {fmt(room.area)} m²
            </Badge>
            {room.dims && <span className="text-xs text-stone-500">{room.dims} m</span>}
          </div>
          {room.note && <p className="mt-1 text-stone-600">{room.note}</p>}
        </div>
      ) : (
        <p className="text-stone-500">Passe o rato (ou toque) numa divisão para ver a área, as medidas e o raciocínio.</p>
      )}
    </div>
  )
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-stone-500">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  )
}

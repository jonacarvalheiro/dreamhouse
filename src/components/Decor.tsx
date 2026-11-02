import { useMemo, useState } from 'react'
import { Check, ExternalLink, ImageOff, Ruler, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WASTE, bathInspiration, decorRooms, paintLitres, type Ambiente, type DecorRoom, type Finish, type FinishKind, type HeadWallOption } from '@/decor/data'
import { roomQuantities, type RoomQuantities } from '@/decor/quantities'
import type { Plan } from '@/plan/types'

const m2 = (v: number) => `${v.toFixed(1).replace('.', ',')} m²`
const STORAGE = 'casa-decoracao-v2'

function loadChoice(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) ?? '{}')
  } catch {
    return {}
  }
}

export function Decor({ plan, proposalLabel }: { plan: Plan; proposalLabel: string }) {
  const [room, setRoom] = useState<DecorRoom['id']>('wc')
  const [choice, setChoice] = useState<Record<string, string>>(loadChoice)

  const pick = (roomId: string, ambienteId: string) => {
    const next = { ...choice, [roomId]: ambienteId }
    setChoice(next)
    localStorage.setItem(STORAGE, JSON.stringify(next))
  }

  const quantities = useMemo(() => {
    const out: Partial<Record<DecorRoom['id'], RoomQuantities>> = {}
    for (const r of decorRooms) {
      const pr = plan.rooms.find((p) => p.id === r.id)
      if (pr) out[r.id] = roomQuantities(plan, pr)
    }
    return out
  }, [plan])

  return (
    <section id="decoracao" className="mx-auto max-w-7xl scroll-mt-4 px-4 pb-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Decoração: casas de banho, quartos e corredor</CardTitle>
          <CardDescription className="max-w-3xl">
            Feita sobre a disposição da {proposalLabel}, com as medidas, janelas e portas dessa planta. Os tetos de pinho ficam em todas as divisões, por isso as paletas partem
            dele: terracota, verde-salva, azul, amarelos e creme. Os duches são de nível, sem base, fechados com blocos de vidro. Escolham um ambiente por divisão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <References />
          <MoreReferences />
          <Tabs value={room} onValueChange={(v) => setRoom(v as DecorRoom['id'])}>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList>
                {decorRooms.map((r) => (
                  <TabsTrigger key={r.id} value={r.id} className="px-3">
                    {r.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {decorRooms.map((r) => {
              const active = r.ambientes.find((a) => a.id === choice[r.id]) ?? r.ambientes[0]
              return (
                <TabsContent key={r.id} value={r.id} className="pt-3">
                  <RoomPanel
                    room={r}
                    active={active}
                    q={quantities[r.id]}
                    onPick={(id) => pick(r.id, id)}
                    wallId={choice[`${r.id}/${active.id}/parede`]}
                    onWall={(id) => pick(`${r.id}/${active.id}/parede`, id)}
                    proposalLabel={proposalLabel}
                  />
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}

function References() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Reference src="/decor/teto-existente.png" title="Teto existente" text="Forro de pinho macheado com sanca escura. Mantém-se: só se limpa, lixa à mão e enverniza-se a mate." />
      <Reference src="/decor/referencia-wc.jpg" title="Casas de banho (Pinterest)" text="Hidráulico com rosetas terracota e verde, paredes cor de cal, chão de barro e torneiras em bronze." />
      <Reference src="/decor/ref-madeira-hidraulico.png" title="Madeira e hidráulico azul" text="Tampo flutuante de madeira, lavatório de pedra, hidráulico azul e creme, espelho em arco e lanternas." />
      <Reference src="/decor/ref-chao-corredor.png" title="Chão do corredor" text="Réguas de madeira a 45° em treliça, com quadrados de hidráulico creme e floral no meio." />
      <Reference src="/decor/ref-terrazzo-blocos.png" title="Terrazzo e blocos de vidro" text="Duche sem base, fechado com blocos de vidro; terrazzo nas paredes e seixo terracota no chão." />
    </div>
  )
}

function MoreReferences() {
  return (
    <details className="group rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium select-none">Mais exemplos de casas de banho neste estilo ({bathInspiration.length})</summary>
      <ul className="mt-2 grid gap-2 pb-1 sm:grid-cols-2">
        {bathInspiration.map((i) => (
          <li key={i.url}>
            <a
              href={i.url}
              target="_blank"
              rel="noreferrer"
              className="group/link flex h-full flex-col rounded-md border border-stone-200 bg-white p-2.5 transition hover:border-stone-400"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {i.title}
                <ExternalLink className="size-3.5 text-stone-400 group-hover/link:text-stone-700" aria-hidden />
              </span>
              <span className="text-[11px] tracking-wide text-stone-400 uppercase">{i.source}</span>
              <span className="mt-1 text-xs leading-relaxed text-stone-600">{i.why}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

function Reference({ src, title, text }: { src: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-stone-200 bg-stone-50/60 p-2">
      <img src={src} alt={title} className="size-20 shrink-0 rounded-md object-cover sm:size-24" loading="lazy" />
      <div className="min-w-0 py-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{text}</p>
      </div>
    </div>
  )
}

function RoomPanel({
  room,
  active,
  q,
  onPick,
  wallId,
  onWall,
  proposalLabel,
}: {
  room: DecorRoom
  active: Ambiente
  q?: RoomQuantities
  onPick: (id: string) => void
  wallId?: string
  onWall: (id: string) => void
  proposalLabel: string
}) {
  const wall = active.headWalls ? (active.headWalls.find((w) => w.id === wallId) ?? active.headWalls[0]) : undefined
  const finishes = wall ? active.finishes.flatMap((f) => (f.zone === 'Parede da cabeceira' ? wall.finishes : [f])) : active.finishes
  return (
    <div className="space-y-5">
      <PlanFacts room={room} q={q} />
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Ambiente para ${room.name}`}>
        {room.ambientes.map((a) => {
          const on = a.id === active.id
          return (
            <button
              key={a.id}
              role="radio"
              aria-checked={on}
              onClick={() => onPick(a.id)}
              className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${on ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900' : 'border-stone-200 bg-stone-50/60 hover:border-stone-400'}`}
            >
              <img src={a.image} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.name}</p>
                <div className="mt-1 flex gap-1">
                  {a.palette.map((s) => (
                    <span key={s.name} className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: s.hex }} title={s.name} />
                  ))}
                </div>
              </div>
              {on && <Check className="size-4 shrink-0" aria-hidden />}
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Scene key={active.id} room={room} active={active} image={wall?.image} />
          {active.headWalls && wall && <HeadWallPicker options={active.headWalls} value={wall.id} onChange={onWall} />}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Paleta</h3>
            <ul className="mt-2 space-y-1.5">
              {active.palette.map((s) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="h-8 w-12 shrink-0 rounded-md ring-1 ring-black/10" style={{ background: s.hex }} />
                  <div className="min-w-0 text-sm leading-tight">
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-stone-400 uppercase">{s.hex}</span>
                    <p className="text-xs text-stone-500">{s.where}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Peças e acessórios</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-stone-600 marker:text-stone-300">
              {active.fixtures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Finishes finishes={finishes} q={q} proposalLabel={proposalLabel} />

      {active.tips.length > 0 && (
        <ul className="space-y-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {active.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Scene({ room, active, image }: { room: DecorRoom; active: Ambiente; image?: string }) {
  const extras = active.extra ?? []
  const [shot, setShot] = useState('main')
  const [extraI, setExtraI] = useState(0)
  const tabs = [
    { id: 'main', label: active.alt?.mainLabel ?? 'Vista' },
    ...(active.alt ? [{ id: 'alt', label: active.alt.label }] : []),
    ...(extras.length ? [{ id: 'blender', label: 'Render Blender, a partir da planta' }] : []),
  ]
  const extra = extras[extraI] ?? extras[0]
  const current =
    shot === 'blender' && extra ? extra : shot === 'alt' && active.alt ? active.alt : { image: image ?? active.image, view: active.view }
  return (
    <figure>
      {tabs.length > 1 && (
        <div className="mb-2 inline-flex flex-wrap rounded-lg bg-stone-100 p-0.5 text-sm" role="tablist" aria-label="Vista">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={shot === t.id}
              onClick={() => setShot(t.id)}
              className={`rounded-md px-3 py-1 transition ${shot === t.id ? 'bg-white font-medium shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {shot === 'blender' && extras.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Render Blender">
          {extras.map((e, i) => (
            <button
              key={e.image}
              role="tab"
              aria-selected={extraI === i}
              onClick={() => setExtraI(i)}
              className={`rounded-md px-2.5 py-1 text-xs transition ${extraI === i ? 'bg-stone-900 font-medium text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}
      <SceneImage key={current.image} src={current.image} alt={`${room.name}: ${active.name}`} />
      <figcaption className="mt-2 text-sm leading-relaxed text-stone-600">{active.mood}</figcaption>
      <p className="mt-1 text-xs text-stone-500">
        <span className="font-medium">Ponto de vista:</span> {current.view}
      </p>
      <p className="mt-1 text-xs text-stone-400">
        {shot === 'blender'
          ? 'Render Blender, a partir da planta.'
          : 'Imagem ilustrativa gerada a partir das referências; as medidas que contam são as da planta e da tabela abaixo.'}
      </p>
    </figure>
  )
}

function SceneImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-stone-200/70" />}
      {state === 'error' ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-stone-500">
          <ImageOff className="size-6" aria-hidden />
          Não foi possível carregar a imagem.
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`size-full object-cover transition-opacity duration-300 ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}

function HeadWallPicker({ options, value, onChange }: { options: HeadWallOption[]; value: string; onChange: (id: string) => void }) {
  const current = options.find((o) => o.id === value) ?? options[0]
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <h3 className="text-sm font-semibold">Parede da cabeceira</h3>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Parede da cabeceira">
        {options.map((o) => {
          const on = o.id === current.id
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className={`w-28 shrink-0 rounded-lg border p-1 text-left transition ${on ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200 hover:border-stone-400'}`}
            >
              <img src={o.image} alt="" className="aspect-video w-full rounded-md object-cover" loading="lazy" />
              <span className="mt-1 block px-0.5 text-xs leading-tight font-medium">{o.name}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{current.note}</p>
    </div>
  )
}

function Finishes({ finishes, q, proposalLabel }: { finishes: Finish[]; q?: RoomQuantities; proposalLabel: string }) {
  if (!q) return <p className="text-sm text-stone-500">Esta divisão não existe na {proposalLabel}.</p>
  const rows = finishes.map((f) => {
    const a = f.area(q)
    const order = a === null ? null : a * (1 + WASTE[f.kind])
    return { ...f, a, order }
  })
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Acabamentos e quantidades</h3>
        <Badge variant="secondary">
          {proposalLabel} · chão {m2(q.floor)} · pé-direito {q.height.toFixed(2).replace('.', ',')} m
        </Badge>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500">
              <th className="py-1.5 pr-3 font-medium">Onde</th>
              <th className="py-1.5 pr-3 font-medium">Material</th>
              <th className="py-1.5 pr-3 text-right font-medium">Medido</th>
              <th className="py-1.5 text-right font-medium">A encomendar</th>
            </tr>
          </thead>
          <tbody className="[&_tr]:border-t [&_tr]:border-stone-100 [&_td]:py-2 [&_td]:align-top">
            {rows.map((r) => (
              <tr key={r.zone}>
                <td className="pr-3 font-medium whitespace-nowrap">{r.zone}</td>
                <td className="pr-3 text-stone-600">{r.material}</td>
                <td className="pr-3 text-right whitespace-nowrap tabular-nums">{r.a === null ? '—' : r.kind === 'blocks' ? `${r.a} blocos` : r.kind === 'length' ? dim(r.a) : m2(r.a)}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{orderText(r.kind, r.order, r.piece)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Áreas tiradas da planta da Proposta A: paredes até ao teto, sem os vãos de portas (2,00 m de altura) e janelas. Azulejo e chão com {pct(WASTE.tile)} para cortes, assentamento
        a 45° com {pct(WASTE.diagonal)}, blocos de vidro com {pct(WASTE.blocks)} de reserva, papel de parede com {pct(WASTE.wallpaper)} e rolos contados a 3 tiras cada; tinta para 2 demãos a cerca de 10 m² por litro. Confirmem em obra antes de encomendar.
      </p>
    </div>
  )
}

const pct = (v: number) => `${Math.round(v * 100)} %`

function orderText(kind: FinishKind, order: number | null, piece?: number) {
  if (order === null) return '—'
  if (kind === 'paint') return `≈ ${Math.ceil(paintLitres(order))} L`
  if (kind === 'wood') return m2(order)
  if (kind === 'blocks') return `${Math.ceil(order)} blocos (+${pct(WASTE.blocks)})`
  if (kind === 'length') return dim(order)
  const pieces = piece ? ` · ≈ ${Math.ceil(order / piece)} ${kind === 'wallpaper' ? 'rolos' : 'peças'}` : ''
  return `${m2(order)} (+${pct(WASTE[kind])})${pieces}`
}

function PlanFacts({ room, q }: { room: DecorRoom; q?: RoomQuantities }) {
  return (
    <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Ruler className="size-4 text-stone-400" aria-hidden />O que a planta obriga
        </h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-stone-600 marker:text-stone-300">
          {room.layout.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sun className="size-4 text-amber-500" aria-hidden />
          Entradas de luz
        </h3>
        {!q || q.windows.length === 0 ? (
          <p className="mt-1.5 text-sm text-stone-600">Sem janela própria (ver ao lado).</p>
        ) : (
          <ul className="mt-1.5 space-y-1 text-sm text-stone-600">
            {q.windows.map((w, i) => (
              <li key={`${w.label}-${i}`}>
                <span className="font-medium text-stone-800">{w.label}</span> · {dim(w.width)} de largura, {w.sill > 0 ? `peitoril a ${dim(w.sill)}` : 'desde o chão'}, topo a {dim(w.head)}
              </li>
            ))}
          </ul>
        )}
        {q && (
          <p className="mt-2 text-xs text-stone-500">
            Chão {m2(q.floor)} · perímetro {dim(q.perimeter)} · pé-direito {dim(q.height)}
          </p>
        )}
      </div>
    </div>
  )
}

const dim = (v: number) => `${v.toFixed(2).replace('.', ',')} m`

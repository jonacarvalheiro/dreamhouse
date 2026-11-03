import { ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { PRICES_DATE, lmProduct, prices, unpriced, type Price } from '@/budget/prices'
import { saveText, useStored } from '@/budget/store'
import { materials } from '@/works/current'
import { f } from '@/works/geometry'
import { lmSearch, qtyText, type Material } from '@/works/materials'
import { tradeInfo, trades, type Trade } from '@/works/trades'

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const r2 = (v: number) => Math.round(v * 100) / 100

/** O que se marcou numa linha, pela chave `<lista>/<nome>`. `item` e `lista` só servem para o ficheiro se ler bem. */
type Entry = { item: string; lista: string; comprado?: boolean; pago?: number | null; conta?: boolean }
type Extra = { id: string; item: string; comprado: boolean; pago: number | null }
type Saved = { itens: Record<string, Entry>; outras: Extra[] }
const initial: Saved = { itens: {}, outras: [] }

type Line = { key: string; list: string; m: Material; uses?: string; price?: Price; units: number | null; estimate: number | null; why?: string }
type Group = { title: string; note: string; lines: Line[] }
type Section = { id: string; title: string; note?: string; groups: Group[] }

const sentence = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`
const listPt = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`)

function line(key: string, list: string, m: Material, uses?: string): Line {
  const price = prices[m.item]
  const units = price && typeof m.qty === 'number' ? (price.pack ? Math.ceil(m.qty / price.pack - 1e-9) : m.qty) : null
  return {
    key,
    list,
    m,
    uses,
    price,
    units,
    estimate: price && units !== null ? r2(units * price.price) : null,
    why: price ? undefined : typeof m.qty === 'string' ? sentence(m.qty) : (unpriced[m.item] ?? 'Sem preço de referência.'),
  }
}

/** A ferramenta compra-se uma vez para a obra toda: junta as dos três ofícios, com a maior quantidade. */
function toolLines(): Line[] {
  const byName = new Map<string, { m: Material; uses: Trade[] }>()
  for (const t of trades) {
    for (const m of materials[t].tools.items) {
      const seen = byName.get(m.item)
      if (!seen) byName.set(m.item, { m, uses: [t] })
      else {
        seen.uses.push(t)
        seen.m = { ...seen.m, qty: Math.max(Number(seen.m.qty), Number(m.qty)), optional: seen.m.optional && m.optional }
      }
    }
  }
  return [...byName.values()].map(({ m, uses }) =>
    line(
      `ferramentas/${m.item}`,
      'Ferramentas',
      m,
      listPt(uses.map((t) => tradeInfo[t].label)),
    ),
  )
}

const tools = materials.pedreiro.tools
const sections: Section[] = [
  ...trades.map((t) => ({
    id: t,
    title: tradeInfo[t].label,
    groups: materials[t].groups.map((g) => ({
      title: g.title,
      note: g.note,
      lines: g.items.map((m) => line(`${t}/${m.item}`, `${tradeInfo[t].label} · ${g.title}`, m)),
    })),
  })),
  {
    id: 'ferramentas',
    title: tools.title,
    note: `${tools.note} A que serve a mais do que um ofício aparece uma só vez.`,
    groups: [{ title: tools.title, note: tools.note, lines: toolLines() }],
  },
]
const allLines = sections.flatMap((s) => s.groups.flatMap((g) => g.lines))
const listed = new Set(allLines.map((l) => l.key))

/** Lista de compras: materiais e ferramentas da obra, quanto devem custar e quanto já se pagou. */
export default function Purchases() {
  const [s, setS, status, place] = useStored('compras', initial)
  const [hideBought, setHideBought] = useState(false)

  if (status === 'loading') return <main className="mx-auto max-w-7xl px-4 py-6 text-sm text-stone-500 sm:px-6 lg:py-8">A ler…</main>

  const counts = (l: Line) => s.itens[l.key]?.conta ?? !l.m.optional
  const bought = (l: Line) => !!s.itens[l.key]?.comprado
  const entryOf = (l: Line, prev: Saved): Entry => ({ ...prev.itens[l.key], item: l.m.item, lista: l.list })
  const patch = (l: Line, p: Partial<Entry>) => setS((prev) => ({ ...prev, itens: { ...prev.itens, [l.key]: { ...entryOf(l, prev), ...p } } }))
  const setCounts = (ls: Line[], conta: boolean) =>
    setS((prev) => ({ ...prev, itens: { ...prev.itens, ...Object.fromEntries(ls.map((l) => [l.key, { ...entryOf(l, prev), conta }])) } }))
  const setOutras = (outras: Extra[]) => setS((prev) => ({ ...prev, outras }))

  const sum = (ls: Line[]) => {
    const t = { planned: 0, open: 0, paid: 0, done: 0, counted: 0, unpriced: 0, paidPlanned: 0, paidOfPlanned: 0 }
    for (const l of ls) {
      const e = s.itens[l.key]
      t.paid += e?.pago ?? 0
      if (!counts(l)) continue
      t.counted++
      if (e?.comprado) t.done++
      if (l.estimate === null) {
        if (!e?.comprado) t.unpriced++
        continue
      }
      t.planned += l.estimate
      if (!e?.comprado) t.open += l.estimate
      if (e?.comprado && e.pago != null) {
        t.paidPlanned += l.estimate
        t.paidOfPlanned += e.pago
      }
    }
    return t
  }
  const totals = Object.fromEntries(sections.map((sec) => [sec.id, sum(sec.groups.flatMap((g) => g.lines))]))
  const all = sum(allLines)
  const orphans = Object.entries(s.itens).filter(([k, e]) => !listed.has(k) && (e.comprado || e.pago != null))
  const otherPaid = s.outras.reduce((a, x) => a + (x.pago ?? 0), 0) + orphans.reduce((a, [, e]) => a + (e.pago ?? 0), 0)
  const paid = all.paid + otherPaid
  const diff = all.paidOfPlanned - all.paidPlanned

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Lista de compras</p>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Materiais e ferramentas</h2>
        <p className="max-w-3xl text-sm text-stone-600">
          Tudo o que está nas listas da obra, com um preço de referência da Leroy Merlin. Marquem o que já compraram e escrevam quanto pagaram: fica guardado
          neste computador se o site estiver a correr da pasta do projeto, ou neste navegador no site publicado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {sections.map((sec) => (
            <Card key={sec.id} className="gap-0 py-0">
              <CardHeader className="border-b border-stone-100 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">{sec.title}</CardTitle>
                    {sec.note && <CardDescription>{sec.note}</CardDescription>}
                  </div>
                  <SubTotal planned={totals[sec.id].planned} paid={totals[sec.id].paid} done={totals[sec.id].done} counted={totals[sec.id].counted} />
                </div>
              </CardHeader>
              {sec.groups.map((g) => {
                const shown = g.lines.filter((l) => !(hideBought && bought(l)))
                const anyCounts = g.lines.some(counts)
                return (
                  <section key={g.title} className="not-first:border-t not-first:border-stone-100">
                    <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
                      {sec.groups.length > 1 ? (
                        <div>
                          <h3 className="font-semibold text-stone-900">{g.title}</h3>
                          <p className="text-xs text-stone-500">{g.note}</p>
                        </div>
                      ) : (
                        <span />
                      )}
                      <button type="button" onClick={() => setCounts(g.lines, !anyCounts)} className="shrink-0 text-xs text-stone-500 hover:text-stone-900 hover:underline">
                        {anyCounts ? 'Tirar tudo da conta' : 'Pôr tudo na conta'}
                      </button>
                    </div>
                    {shown.length === 0 ? (
                      <p className="px-4 pb-3 text-sm text-stone-500">Já está tudo comprado.</p>
                    ) : (
                      <ul className="divide-y divide-stone-100 border-t border-stone-100">
                        {shown.map((l) => (
                          <Row key={l.key} l={l} e={s.itens[l.key]} counts={counts(l)} onPatch={(p) => patch(l, p)} />
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </Card>
          ))}

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-stone-100 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Outras compras</CardTitle>
                  <CardDescription>O que comprarem e não estiver nas listas. Entra no que já foi pago.</CardDescription>
                </div>
                <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{eur.format(otherPaid)}</span>
              </div>
            </CardHeader>
            {(s.outras.length > 0 || orphans.length > 0) && (
              <ul className="divide-y divide-stone-100">
                {s.outras.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Checkbox
                      checked={x.comprado}
                      onCheckedChange={(v) => setOutras(s.outras.map((o) => (o.id === x.id ? { ...o, comprado: Boolean(v) } : o)))}
                      aria-label={`Comprado: ${x.item}`}
                    />
                    <span className={`min-w-0 flex-1 font-medium ${x.comprado ? 'text-stone-500 line-through decoration-stone-400' : 'text-stone-900'}`}>{x.item}</span>
                    <PaidInput
                      value={x.pago}
                      label={`Pago por ${x.item}`}
                      onChange={(pago) => setOutras(s.outras.map((o) => (o.id === x.id ? { ...o, pago, comprado: o.comprado || !!pago } : o)))}
                    />
                    <RemoveButton label={x.item} onClick={() => setOutras(s.outras.filter((o) => o.id !== x.id))} />
                  </li>
                ))}
                {orphans.map(([k, e]) => (
                  <li key={k} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">{e.item}</p>
                      <p className="text-xs text-stone-500">Já não está na lista ({e.lista}): a planta mudou.</p>
                    </div>
                    <span className="text-sm tabular-nums">{e.pago != null ? eur.format(e.pago) : 'comprado'}</span>
                    <RemoveButton
                      label={e.item}
                      onClick={() =>
                        setS((prev) => ({ ...prev, itens: Object.fromEntries(Object.entries(prev.itens).filter(([key]) => key !== k)) }))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            <AddExtra onAdd={(x) => setOutras([...s.outras, x])} />
          </Card>
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Contas</CardTitle>
              <CardDescription>Só somam as linhas que estão na conta. Os opcionais começam fora.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-2">
                <Stat k="Previsto" v={all.planned} />
                <Stat k="Já pago" v={paid} />
                <Stat k="Falta comprar" v={all.open} className="col-span-2 bg-stone-900 text-white" sub={all.unpriced > 0 ? `mais ${all.unpriced} linhas sem preço` : undefined} />
              </dl>

              <div>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Linhas compradas</span>
                  <span className="tabular-nums">
                    {all.done} de {all.counted}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${all.counted ? (all.done / all.counted) * 100 : 0}%` }} />
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="text-xs text-stone-500">
                  <tr>
                    <th className="pb-1 text-left font-normal" />
                    <th className="pb-1 text-right font-normal">Previsto</th>
                    <th className="pb-1 text-right font-normal">Pago</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-1 [&_tr]:border-t [&_tr]:border-stone-100">
                  {sections.map((sec) => (
                    <tr key={sec.id}>
                      <td>{sec.id === 'ferramentas' ? 'Ferramentas' : sec.title}</td>
                      <td className="text-right tabular-nums">{eur.format(totals[sec.id].planned)}</td>
                      <td className="text-right text-stone-600 tabular-nums">{eur.format(totals[sec.id].paid)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Outras compras</td>
                    <td className="text-right text-stone-400">—</td>
                    <td className="text-right text-stone-600 tabular-nums">{eur.format(otherPaid)}</td>
                  </tr>
                </tbody>
              </table>

              {all.paidPlanned > 0 && (
                <p className={`rounded-md px-2 py-1.5 text-xs ${diff > 0 ? 'bg-amber-50 text-amber-900' : 'bg-lime-50 text-lime-900'}`}>
                  No que já compraram e tem preço pago, previam {eur.format(all.paidPlanned)} e pagaram {eur.format(all.paidOfPlanned)}:{' '}
                  {diff > 0 ? `mais ${eur.format(diff)}` : diff < 0 ? `menos ${eur.format(-diff)}` : 'o mesmo'}.
                </p>
              )}

              <label className="flex items-center gap-2 text-sm">
                <Switch checked={hideBought} onCheckedChange={(v) => setHideBought(v)} />
                Esconder o que já está comprado
              </label>

              <div className="space-y-1.5 text-xs leading-relaxed text-stone-500">
                <p>
                  Preços da Leroy Merlin, com IVA, vistos a {PRICES_DATE}. Mudam com o tempo e com as promoções: servem para ter uma ideia. «≈» é a média de
                  várias peças ou um conjunto juntado aqui; «parceiro» é vendido por outra loja no site da Leroy Merlin.
                </p>
                <p>As quantidades vêm da planta e já têm margem: confirmem em obra antes de encomendar.</p>
              </div>
              <p className={`text-xs ${status === 'error' ? 'text-red-700' : 'text-stone-500'}`}>{saveText(status, place)}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function Row({ l, e, counts, onPatch }: { l: Line; e?: Entry; counts: boolean; onPatch: (p: Partial<Entry>) => void }) {
  const bought = !!e?.comprado
  const p = l.price
  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${counts ? '' : 'bg-stone-50/80'}`}>
      <Checkbox checked={bought} onCheckedChange={(v) => onPatch({ comprado: Boolean(v) })} aria-label={`Comprado: ${l.m.item}`} className="mt-0.5" />
      <div className={`min-w-0 ${counts ? '' : 'opacity-60'}`}>
        <p className={`font-medium ${bought ? 'text-stone-500 line-through decoration-stone-400' : 'text-stone-900'}`}>
          {l.m.item}
          {l.m.optional && (
            <Badge variant="secondary" className="ml-2 align-middle text-[10px]">
              opcional
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">
          <span className="font-medium text-stone-700 tabular-nums">{qtyText(l.m)}</span>
          {l.uses && <> · {l.uses}</>}
          {p && l.units !== null && (
            <span className="tabular-nums">
              {' '}
              · {f(l.units, Number.isInteger(l.units) ? 0 : 1)} × {p.approx && '≈ '}
              {eur.format(p.price)}
              {p.packLabel && ` (${p.packLabel})`}
            </span>
          )}
        </p>
        {p ? (
          <a
            href={lmProduct(p.path)}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-baseline gap-1 text-xs text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            <span>
              {p.product}
              {p.partner && ' · parceiro'}
            </span>
            <ExternalLink className="size-3 shrink-0 self-center" aria-hidden />
          </a>
        ) : (
          <p className="mt-0.5 text-xs text-stone-500">
            {l.why}{' '}
            {l.m.search && (
              <a href={lmSearch(l.m.search)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 hover:underline">
                Ver opções na Leroy Merlin
              </a>
            )}
          </p>
        )}
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:col-start-auto sm:flex-col sm:items-end">
        <div className="flex items-baseline gap-3">
          <button type="button" onClick={() => onPatch({ conta: !counts })} className="text-[11px] whitespace-nowrap text-stone-500 hover:text-stone-900 hover:underline">
            {counts ? 'Tirar da conta' : 'Pôr na conta'}
          </button>
          <span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${counts ? 'text-stone-900' : 'text-stone-400 line-through'}`}>
            {l.estimate !== null ? `${p?.approx ? '≈ ' : ''}${eur.format(l.estimate)}` : 'sem preço'}
          </span>
        </div>
        <PaidInput
          value={e?.pago ?? null}
          label={`Pago por ${l.m.item}`}
          onChange={(pago) => onPatch(pago && !bought ? { pago, comprado: true } : { pago })}
        />
      </div>
    </li>
  )
}

/** Aceita "12,5", "12.5" e "1.234,50"; `undefined` quando o texto ainda não é um valor. */
function parseEuros(text: string): number | null | undefined {
  const t = text.replace(/[\s€]/g, '')
  if (!t) return null
  const v = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(v) && v >= 0 ? r2(v) : undefined
}
const euros = (v: number | null) => (v == null ? '' : v.toFixed(2).replace('.', ','))

function PaidInput({ value, label, onChange }: { value: number | null; label: string; onChange: (v: number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="flex items-center gap-1.5 text-xs text-stone-500">
      Pago
      <Input
        inputMode="decimal"
        aria-label={label}
        placeholder="—"
        value={draft ?? euros(value)}
        onFocus={() => setDraft(euros(value))}
        onBlur={() => setDraft(null)}
        onChange={(ev) => {
          setDraft(ev.target.value)
          const v = parseEuros(ev.target.value)
          if (v !== undefined && v !== value) onChange(v)
        }}
        className="h-7 w-20 text-right tabular-nums sm:w-24"
      />
      €
    </label>
  )
}

function SubTotal({ planned, paid, done, counted }: { planned: number; paid: number; done: number; counted: number }) {
  return (
    <div className="shrink-0 text-right text-xs text-stone-500">
      <p className="text-sm font-semibold text-stone-900 tabular-nums">{eur.format(planned)}</p>
      <p className="tabular-nums">pago {eur.format(paid)}</p>
      <p className="tabular-nums">
        {done} de {counted} comprados
      </p>
    </div>
  )
}

function Stat({ k, v, sub, className = 'bg-stone-50' }: { k: string; v: number; sub?: string; className?: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${className}`}>
      <dt className="text-xs opacity-70">{k}</dt>
      <dd className="text-lg font-semibold tabular-nums">{eur.format(v)}</dd>
      {sub && <dd className="text-[11px] opacity-70">{sub}</dd>}
    </div>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label={`Apagar ${label}`}>
      <Trash2 className="size-4" />
    </button>
  )
}

function AddExtra({ onAdd }: { onAdd: (x: Extra) => void }) {
  const [item, setItem] = useState('')
  const [value, setValue] = useState('')
  const pago = parseEuros(value)
  const valid = item.trim().length > 0 && pago !== undefined

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!valid) return
    onAdd({ id: `outra-${Date.now()}`, item: item.trim(), comprado: pago != null, pago })
    setItem('')
    setValue('')
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-3">
      <Input placeholder="Ex.: lâmpadas" aria-label="O que compraram" value={item} onChange={(ev) => setItem(ev.target.value)} className="h-8 min-w-40 flex-1" />
      <Input
        inputMode="decimal"
        placeholder="Pago (€)"
        aria-label="Quanto pagaram"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        className="h-8 w-28 text-right tabular-nums"
      />
      <Button type="submit" size="sm" disabled={!valid}>
        Acrescentar
      </Button>
    </form>
  )
}

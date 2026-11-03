import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  BUDGET,
  IVA,
  SACADA_OPENING,
  ivaRates,
  bonina,
  doors,
  painting,
  pending,
  scenarioFactor,
  scenarioLabel,
  windowPrices,
  windows,
  type IvaRate,
  type Scenario,
  type WindowOption,
} from '@/budget/data'
import { saveText, useStored } from '@/budget/store'

const eur = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const eur2 = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})
const r2 = (v: number) => Math.round(v * 100) / 100

type Group = 'escolhido' | 'estimativa' | 'falta' | 'meu'

type CustomQuote = {
  id: string
  title: string
  supplier: string
  value: number
  plusIva: boolean
}

type Line = {
  id: string
  group: Group
  title: string
  supplier?: string
  note?: string
  /** Valor com IVA que entra na soma. */
  value: number
  badge?: string
  range?: [number, number]
  custom?: boolean
}

type Saved = {
  budget: number
  checked: Record<string, boolean>
  custom: CustomQuote[]
  recirc: boolean
  win: WindowOption
  ivaUnknown: boolean
  ivaRate: IvaRate
  scenario: Scenario
}

/** Onde o estado estava antes de passar para `dados/orcamento.json`. */
const LEGACY_STORAGE = 'casa-orcamento-v1'

const initial: Saved = {
  budget: BUDGET,
  checked: {},
  custom: [],
  recirc: false,
  win: 'pvc',
  ivaUnknown: true,
  ivaRate: 'aru',
  scenario: 'baixo',
}

const groupInfo: Record<Group, { title: string; description: string }> = {
  escolhido: {
    title: 'Orçamentos escolhidos',
    description: 'Propostas recebidas e aceites (ou quase).',
  },
  estimativa: {
    title: 'Estimativas',
    description: 'Ainda sem orçamento: valores de referência para comparar quando chegarem as propostas.',
  },
  falta: {
    title: 'Ainda sem orçamento',
    description: 'O resto da obra. Valores indicativos com IVA à taxa escolhida, conforme o cenário.',
  },
  meu: {
    title: 'Orçamentos adicionados',
    description: 'Os que acrescentarem aqui ficam no mesmo sítio que o resto desta página.',
  },
}

function buildLines(s: Saved, rate: number): Line[] {
  const boninaBase = bonina.items.reduce((sum, i) => sum + i.value, 0) + (s.recirc ? bonina.recirculation.value : 0)
  const winPrice = windowPrices[s.win]
  const windowsTotal = windows.reduce((sum, w) => sum + (w.kind === 'sacada' ? winPrice.sacada : winPrice.janela), 0)
  const unknownIva = (v: number) => (s.ivaUnknown ? v * (1 + rate) : v)
  const f = scenarioFactor[s.scenario]
  /** As estimativas estão com IVA a 23%; converte para a taxa escolhida. */
  const gross = (v: number) => (v / (1 + IVA)) * (1 + rate)

  return [
    {
      id: 'bonina',
      group: 'escolhido',
      title: 'Climatização, águas quentes e ventilação',
      supplier: `${bonina.supplier} · válida até ${bonina.validUntil}`,
      note: `${bonina.option}${s.recirc ? ', com recirculação de água quente' : ''}. IVA a ${Math.round(rate * 100)}%; sem IVA: ${eur2.format(boninaBase)}.`,
      value: r2(boninaBase * (1 + rate)),
    },
    {
      id: painting.id,
      group: 'escolhido',
      title: painting.title,
      supplier: painting.supplier,
      note: painting.note,
      value: r2(unknownIva(painting.base)),
      badge: s.ivaUnknown ? 'IVA somado' : 'IVA a confirmar',
    },
    {
      id: doors.id,
      group: 'escolhido',
      title: doors.title,
      supplier: doors.supplier,
      note: doors.note,
      value: r2(unknownIva(doors.base)),
      badge: s.ivaUnknown ? 'IVA somado' : 'IVA a confirmar',
    },
    {
      id: 'janelas',
      group: 'estimativa',
      title: `Janelas: 4 janelas e a porta de sacada (${winPrice.label})`,
      note: `${winPrice.detail} Fornecimento e montagem, com IVA a ${Math.round(rate * 100)}%, sem estores.`,
      value: Math.round(gross(windowsTotal) / 10) * 10,
    },
    {
      id: 'vao-sacada',
      group: 'estimativa',
      title: 'Abrir o vão da sacada na parede sul',
      note: 'Pedreiro: demolição, padieira, soleira e remates interiores e exteriores. Não faz parte do preço das janelas.',
      value: Math.round(gross(SACADA_OPENING) / 10) * 10,
    },
    ...pending.map<Line>((p, i) => ({
      id: `falta-${i}`,
      group: 'falta',
      title: p.title,
      note: p.note,
      value: Math.round(((p.fullIva ? 1 : gross(1)) * (p.min + (p.max - p.min) * f)) / 50) * 50,
      range: p.fullIva ? [p.min, p.max] : [Math.round(gross(p.min) / 50) * 50, Math.round(gross(p.max) / 50) * 50],
    })),
    ...s.custom.map<Line>((c) => ({
      id: c.id,
      group: 'meu',
      title: c.title,
      supplier: c.supplier || undefined,
      value: r2(c.plusIva ? c.value * (1 + rate) : c.value),
      badge: c.plusIva ? '+ IVA' : 'com IVA',
      custom: true,
    })),
  ]
}

/** Página dos orçamentos: o que já foi orçamentado, o que falta e quanto sobra. */
export default function Budget() {
  const [s, setS, status, place] = useStored('orcamento', initial, LEGACY_STORAGE)
  const set = (patch: Partial<Saved>) => setS((prev) => ({ ...prev, ...patch }))

  const rate = ivaRates[s.ivaRate]
  const lines = buildLines(s, rate)
  const pct = `${Math.round(rate * 100)}%`

  const isChecked = (l: Line) => s.checked[l.id] ?? true
  const toggle = (id: string, v: boolean) => set({ checked: { ...s.checked, [id]: v } })

  const sumOf = (g: Group) => lines.filter((l) => l.group === g && isChecked(l)).reduce((sum, l) => sum + l.value, 0)
  const total = lines.filter(isChecked).reduce((sum, l) => sum + l.value, 0)
  const balance = s.budget - total
  const quoted = sumOf('escolhido') + sumOf('meu')
  const estimated = sumOf('estimativa') + sumOf('falta')
  const reserve = total * 0.1
  const totalAt = (r: number) =>
    buildLines(s, r)
      .filter(isChecked)
      .reduce((sum, l) => sum + l.value, 0)
  const aruSaving = totalAt(ivaRates.normal) - totalAt(ivaRates.aru)

  const groups: Group[] = ['escolhido', 'estimativa', 'falta', 'meu']

  if (status === 'loading') return <main className="mx-auto max-w-7xl px-4 py-6 text-sm text-stone-500 sm:px-6 lg:py-8">A ler…</main>

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Orçamento e contas</p>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Quanto custa e quanto sobra</h2>
        <p className="max-w-3xl text-sm text-stone-600">
          Marquem ou desmarquem cada linha para a somar ou tirar da conta. Tudo o que mudarem (marcações, opções e orçamentos novos) fica guardado neste
          computador se o site estiver a correr da pasta do projeto, ou neste navegador no site publicado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {groups.map((g) => {
            const gl = lines.filter((l) => l.group === g)
            return (
              <Card key={g}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{groupInfo[g].title}</CardTitle>
                      <CardDescription>{groupInfo[g].description}</CardDescription>
                    </div>
                    <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{eur.format(sumOf(g))}</span>
                  </div>
                  {g === 'falta' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-stone-500">Cenário</span>
                      <Segmented
                        value={s.scenario}
                        options={(['baixo', 'medio', 'alto'] as const).map((k) => [k, scenarioLabel[k]])}
                        onChange={(v) => set({ scenario: v })}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-0 divide-y divide-stone-100">
                  {gl.length === 0 && g === 'meu' && (
                    <p className="pb-3 text-sm text-stone-500">Ainda não adicionaram nenhum orçamento. Usem o formulário abaixo.</p>
                  )}
                  {gl.map((l) => (
                    <LineRow
                      key={l.id}
                      line={l}
                      checked={isChecked(l)}
                      onCheck={(v) => toggle(l.id, v)}
                      onRemove={
                        l.custom
                          ? () =>
                              set({
                                custom: s.custom.filter((c) => c.id !== l.id),
                              })
                          : undefined
                      }
                    >
                      {l.id === 'bonina' && <BoninaDetails rate={rate} recirc={s.recirc} onRecirc={(v) => set({ recirc: v })} />}
                      {l.id === 'janelas' && <WindowsDetails option={s.win} onOption={(v) => set({ win: v })} />}
                    </LineRow>
                  ))}
                  {g === 'meu' && <AddQuote pct={pct} onAdd={(c) => set({ custom: [...s.custom, c] })} />}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Contas</CardTitle>
              <CardDescription>Só somam as linhas marcadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="budget" className="text-xs text-stone-500">
                  Orçamento total disponível
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="budget"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={500}
                    value={s.budget}
                    onChange={(e) => set({ budget: Number(e.target.value) || 0 })}
                    className="tabular-nums"
                  />
                  <span className="text-sm text-stone-500">€</span>
                </div>
              </div>

              <Meter budget={s.budget} quoted={quoted} estimated={estimated} />

              <dl className="space-y-1.5 text-sm">
                <Sum k="Com orçamento" v={quoted} />
                <Sum k="Estimado" v={estimated} />
                <Sum k="Total marcado" v={total} strong />
                <div
                  className={`flex items-baseline justify-between rounded-md px-2 py-1.5 ${balance >= 0 ? 'bg-lime-50 text-lime-900' : 'bg-red-50 text-red-900'}`}
                >
                  <dt className="font-medium">{balance >= 0 ? 'Sobra' : 'Falta'}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{eur.format(Math.abs(balance))}</dd>
                </div>
              </dl>

              <p className="text-xs leading-relaxed text-stone-500">
                Numa remodelação, convém guardar cerca de 10% para imprevistos: neste momento seriam {eur.format(reserve)}.
                {balance >= reserve
                  ? ' O saldo cobre essa margem.'
                  : balance >= 0
                    ? ` O saldo não chega para essa margem: faltam ${eur.format(reserve - balance)}.`
                    : ` Com a margem, faltariam ${eur.format(reserve - balance)}.`}
              </p>

              <div className="space-y-1.5 rounded-lg border border-stone-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">Taxa de IVA</span>
                  <Segmented
                    value={s.ivaRate}
                    options={[
                      ['aru', '6% · ARU'],
                      ['normal', '23%'],
                    ]}
                    onChange={(v) => set({ ivaRate: v })}
                  />
                </div>
                <p className="text-xs leading-relaxed text-stone-500">
                  {s.ivaRate === 'aru'
                    ? `Com a casa em ARU, a empreitada paga 6% em vez de 23%: poupam ${eur.format(aruSaving)} nas linhas marcadas. `
                    : `A 6% (casa em ARU) poupariam ${eur.format(aruSaving)} nas linhas marcadas. `}
                  Só se aplica a empreitadas (mão de obra com material incluído), não a materiais comprados à parte, e o projeto paga sempre 23%. Peçam à Câmara
                  a certidão de que o prédio está em ARU e entreguem-na a cada empreiteiro antes de faturar.
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Switch checked={s.ivaUnknown} onCheckedChange={(v) => set({ ivaUnknown: v })} className="mt-0.5" />
                <span>
                  Somar IVA ({pct}) aos valores que não dizem se o incluem
                  <span className="block text-xs text-stone-500">Pintura e portas. Mais seguro deixar ligado até confirmarem.</span>
                </span>
              </label>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setS(initial)}>
                Repor valores iniciais
              </Button>
              <p className={`text-xs ${status === 'error' ? 'text-red-700' : 'text-stone-500'}`}>{saveText(status, place)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>A minha leitura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-stone-600">
              <p>
                {s.ivaRate === 'aru'
                  ? 'Com IVA a 6% e o cenário baixo em tudo o que ainda não tem orçamento, a obra cabe nos 50 000 €, mas a sobra não chega para os 10% de imprevistos. Se algum empreiteiro não aceitar faturar a 6%, ou se a Câmara não passar a certidão, voltam a faltar cerca de 3 500 €.'
                  : 'Com IVA a 23% e o cenário baixo em tudo o que ainda não tem orçamento, a obra fica um pouco acima dos 50 000 € e sem margem para imprevistos.'}{' '}
                Os 50 000 € são apertados para este âmbito: 2 WC novos, escada, abertura na laje, sacada, capoto e climatização da casa toda.
              </p>
              <p>Onde dá para poupar sem estragar o projeto:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Janelas em PVC em vez de alumínio: cerca de {eur.format(Math.round(((1350 / (1 + IVA)) * (1 + rate)) / 10) * 10)}.</li>
                <li>Escada e roupeiros em kit, montados em obra: 4 000 € a 8 000 € face a carpintaria por medida.</li>
                <li>Sem recirculação de água quente: {eur.format(bonina.recirculation.value * (1 + rate))}.</li>
                <li>Deixar a VMC para mais tarde (com as condutas já previstas): cerca de 4 000 € a 5 000 €.</li>
              </ul>
              <p>
                Antes de adjudicar, confirmem se a pintura e as portas incluem IVA e se os 3 850 € do capoto incluem o material e para que área de parede são: o
                valor parece baixo para capoto exterior.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function LineRow({
  line,
  checked,
  onCheck,
  onRemove,
  children,
}: {
  line: Line
  checked: boolean
  onCheck: (v: boolean) => void
  onRemove?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className={`py-3 first:pt-0 ${checked ? '' : 'opacity-55'}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(Boolean(v))} aria-label={`Somar ${line.title}`} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{line.title}</span>
            {line.badge && (
              <Badge variant="secondary" className="text-[10px]">
                {line.badge}
              </Badge>
            )}
          </div>
          {line.supplier && <div className="text-xs text-stone-500">{line.supplier}</div>}
          {line.note && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{line.note}</p>}
          {line.range && (
            <p className="mt-0.5 text-[11px] text-stone-400 tabular-nums">
              Intervalo: {eur.format(line.range[0])} – {eur.format(line.range[1])}
            </p>
          )}
          {children}
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <span className={`text-right text-sm font-semibold tabular-nums ${checked ? '' : 'line-through'}`}>{eur.format(line.value)}</span>
          {onRemove && (
            <button onClick={onRemove} className="-mt-0.5 rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label={`Apagar ${line.title}`}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function BoninaDetails({ rate, recirc, onRecirc }: { rate: number; recirc: boolean; onRecirc: (v: boolean) => void }) {
  return (
    <div className="mt-2 space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={recirc} onCheckedChange={(v) => onRecirc(v)} size="sm" />
        <span>
          Recirculação de água quente (+
          {eur2.format(bonina.recirculation.value * (1 + rate))})
        </span>
      </label>
      <details className="group rounded-lg border border-stone-200 bg-stone-50/60 text-sm">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-stone-700 select-none">Ver a proposta da Bonina em detalhe</summary>
        <div className="space-y-4 px-3 pb-3 text-xs text-stone-600">
          <table className="w-full">
            <tbody className="[&_td]:py-1 [&_tr]:border-t [&_tr]:border-stone-200">
              {[...bonina.items, ...(recirc ? [bonina.recirculation] : [])].map((i) => (
                <tr key={i.label}>
                  <td>{i.label}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{eur2.format(i.value)}</td>
                </tr>
              ))}
              <tr className="font-medium text-stone-800">
                <td>Total sem IVA · com IVA ({Math.round(rate * 100)}%)</td>
                <td className="text-right whitespace-nowrap tabular-nums">
                  {eur2.format(bonina.items.reduce((a, i) => a + i.value, 0) + (recirc ? bonina.recirculation.value : 0))} ·{' '}
                  {eur2.format((bonina.items.reduce((a, i) => a + i.value, 0) + (recirc ? bonina.recirculation.value : 0)) * (1 + rate))}
                </td>
              </tr>
            </tbody>
          </table>
          <Block title="Contacto">{bonina.contact}</Block>
          <BlockList title="Condições" items={bonina.conditions} />
          <div>
            <h4 className="mb-1 font-semibold text-stone-800">Equipamentos por divisão</h4>
            <table className="w-full">
              <tbody className="[&_td]:py-1 [&_td]:align-top [&_tr]:border-t [&_tr]:border-stone-200">
                {bonina.rooms.map(([a, b]) => (
                  <tr key={a}>
                    <td className="w-2/5 pr-2 font-medium text-stone-700">{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="mb-1 font-semibold text-stone-800">Dimensões e pesos</h4>
            <table className="w-full">
              <tbody className="[&_td]:py-1 [&_td]:align-top [&_tr]:border-t [&_tr]:border-stone-200">
                {bonina.sizes.map(([a, b, c, d]) => (
                  <tr key={a}>
                    <td className="pr-2 font-medium text-stone-700">{a}</td>
                    <td className="pr-2">{b}</td>
                    <td className="pr-2 whitespace-nowrap">{c}</td>
                    <td>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BlockList title="Características principais" items={bonina.features} />
          <BlockList title="A cargo de outros profissionais (exclusões da Bonina)" items={bonina.exclusions} />
          <BlockList title="Por confirmar com a Bonina" items={bonina.toConfirm} warn />
        </div>
      </details>
    </div>
  )
}

function WindowsDetails({ option, onOption }: { option: WindowOption; onOption: (v: WindowOption) => void }) {
  const p = windowPrices[option]
  return (
    <div className="mt-2 space-y-2">
      <Segmented value={option} options={(Object.keys(windowPrices) as WindowOption[]).map((k) => [k, windowPrices[k].label])} onChange={onOption} />
      <table className="w-full text-xs text-stone-600">
        <tbody className="[&_td]:py-1 [&_tr]:border-t [&_tr]:border-stone-100">
          {windows.map((w) => (
            <tr key={w.id}>
              <td>{w.label}</td>
              <td className="text-stone-400 tabular-nums">
                {w.w.toFixed(2).replace('.', ',')} × {w.h.toFixed(2).replace('.', ',')} m
              </td>
              <td className="text-right tabular-nums">{eur.format(w.kind === 'sacada' ? p.sacada : p.janela)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] leading-relaxed text-stone-400">
        Estimativa de mercado (±15%). Estores elétricos acrescentam cerca de 250 € a 400 € por vão. Com capoto, as janelas devem ser montadas alinhadas com o
        isolamento: convém pedir os dois orçamentos em conjunto.
      </p>
    </div>
  )
}

function AddQuote({ pct, onAdd }: { pct: string; onAdd: (c: CustomQuote) => void }) {
  const [title, setTitle] = useState('')
  const [supplier, setSupplier] = useState('')
  const [value, setValue] = useState('')
  const [plusIva, setPlusIva] = useState(false)
  const amount = Number(value.replace(/\s/g, '').replace(',', '.'))
  const valid = title.trim().length > 0 && amount > 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onAdd({
      id: `meu-${Date.now()}`,
      title: title.trim(),
      supplier: supplier.trim(),
      value: amount,
      plusIva,
    })
    setTitle('')
    setSupplier('')
    setValue('')
    setPlusIva(false)
  }

  return (
    <form onSubmit={submit} className="grid gap-3 pt-3 sm:grid-cols-[1.4fr_1fr_0.8fr]">
      <div className="space-y-1">
        <Label htmlFor="q-title" className="text-xs text-stone-500">
          Trabalho
        </Label>
        <Input id="q-title" placeholder="Ex.: Canalização" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="q-supplier" className="text-xs text-stone-500">
          Fornecedor (opcional)
        </Label>
        <Input id="q-supplier" placeholder="Ex.: Canalizações Silva" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="q-value" className="text-xs text-stone-500">
          Valor (€)
        </Label>
        <Input id="q-value" inputMode="decimal" placeholder="2 500" value={value} onChange={(e) => setValue(e.target.value)} className="tabular-nums" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox checked={plusIva} onCheckedChange={(v) => setPlusIva(Boolean(v))} />
        <span>O valor é sem IVA (somar {pct})</span>
      </label>
      <Button type="submit" disabled={!valid} className="sm:justify-self-end">
        Adicionar orçamento
      </Button>
    </form>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-stone-100 p-0.5 ring-1 ring-stone-200">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${value === k ? 'bg-white shadow-sm ring-1 ring-stone-900/10' : 'text-stone-500 hover:text-stone-800'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Meter({ budget, quoted, estimated }: { budget: number; quoted: number; estimated: number }) {
  const max = Math.max(budget, quoted + estimated) || 1
  const pct = (v: number) => `${(v / max) * 100}%`
  return (
    <div>
      <div className="relative flex h-3 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full bg-stone-800" style={{ width: pct(quoted) }} />
        <div className="h-full bg-[repeating-linear-gradient(45deg,#a8a29e_0_4px,#d6d3d1_4px_8px)]" style={{ width: pct(estimated) }} />
        {quoted + estimated > budget && <div className="absolute inset-y-0 w-0.5 bg-red-600" style={{ left: pct(budget) }} />}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-stone-800" /> Com orçamento
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-stone-400" /> Estimado
        </span>
        {quoted + estimated > budget && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-0.5 bg-red-600" /> Limite do orçamento
          </span>
        )}
      </div>
    </div>
  )
}

function Sum({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${strong ? 'border-t border-stone-200 pt-1.5 font-semibold' : 'text-stone-600'}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{eur.format(v)}</dd>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 font-semibold text-stone-800">{title}</h4>
      <p>{children}</p>
    </div>
  )
}

function BlockList({ title, items, warn }: { title: string; items: string[]; warn?: boolean }) {
  return (
    <div className={warn ? 'rounded-md bg-amber-50 p-2 text-amber-900' : ''}>
      <h4 className={`mb-1 font-semibold ${warn ? '' : 'text-stone-800'}`}>{title}</h4>
      <ul className="list-disc space-y-0.5 pl-4">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

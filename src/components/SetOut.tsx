import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GLASS_BLOCK } from '@/plan/common'
import { m, wallAction, whereDoor, whereWall, workWalls } from '@/plan/setout'
import type { Plan } from '@/plan/types'

export function SetOut({ plan, stair, title }: { plan: Plan; stair: [string, string][]; title: string }) {
  const walls = workWalls(plan)
  const doors = plan.doors.map((d) => whereDoor(plan, d))
  const newWindows = plan.windows.filter((w) => w.kind === 'new')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medidas para a obra · {title}</CardTitle>
        <CardDescription>
          Em metros, medidas a partir da face interior da parede poente (x) e da parede norte (y), como na planta. Saem do levantamento: confirmem em obra antes
          de marcar, sobretudo as paredes existentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <Table title="Paredes" head={['Ação', 'Onde']}>
          {walls.map((w, i) => (
            <tr key={i}>
              <td className="pr-3 font-medium whitespace-nowrap">
                {wallAction[w.kind]}
                {w.overhead && <span className="block text-[11px] font-normal text-stone-500">só acima dos degraus</span>}
                {w.glassBlock && <span className="block text-[11px] font-normal text-stone-500">blocos de vidro, até {m(GLASS_BLOCK.h)} m</span>}
                {w.low && <span className="block text-[11px] font-normal text-stone-500">baixa, até {m(w.low)} m</span>}
              </td>
              <td>{whereWall(w)}</td>
            </tr>
          ))}
        </Table>
        <div className="space-y-6">
          <Table title="Portas e vãos" head={['Tipo', 'Vão', 'Onde']}>
            {doors.map((d, i) => (
              <tr key={i}>
                <td className="pr-3 font-medium whitespace-nowrap">{d.kind}</td>
                <td className="pr-3 whitespace-nowrap tabular-nums">{d.size}</td>
                <td>{d.where}</td>
              </tr>
            ))}
            {newWindows.map((w, i) => (
              <tr key={`w${i}`}>
                <td className="pr-3 font-medium whitespace-nowrap">{w.label ?? 'Janela nova'}</td>
                <td className="pr-3 whitespace-nowrap tabular-nums">
                  {m(w.w)} × {m(w.head ?? 0)} m
                </td>
                <td>
                  Parede sul, de x {m(w.x)} a {m(w.x + w.w)}, do chão acabado até {m(w.head ?? 0)} m
                </td>
              </tr>
            ))}
          </Table>
          <Table title="Escada e abertura na laje" head={['', '']}>
            {stair.map(([k, v]) => (
              <tr key={k}>
                <td className="pr-3 font-medium">{k}</td>
                <td className="tabular-nums">{v}</td>
              </tr>
            ))}
            {(plan.ceilingOpenings ?? []).map((o, i) => (
              <tr key={`o${i}`}>
                <td className="pr-3 font-medium">Abertura na laje{(plan.ceilingOpenings?.length ?? 0) > 1 ? ` (${i + 1})` : ''}</td>
                <td className="tabular-nums">
                  {m(o.w)} × {m(o.h)} m: x {m(o.x)} a {m(o.x + o.w)}, y {m(o.y)} a {m(o.y + o.h)}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function Table({ title, head, children }: { title: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-stone-700">
          {head.some(Boolean) && (
            <thead className="text-stone-500">
              <tr>
                {head.map((h) => (
                  <th key={h} className="pb-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="[&_td]:py-1.5 [&_td]:align-top [&_tr]:border-t [&_tr]:border-stone-100">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

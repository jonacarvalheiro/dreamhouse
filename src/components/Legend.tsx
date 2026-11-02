import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'

/** Cores da planta; com `works`, também as paredes a manter, a construir e a demolir. */
export function PlanLegend({ works }: { works: boolean }) {
  const items: { swatch: ReactNode; label: string }[] = [
    { swatch: <span className="block h-3 w-5 rounded-sm bg-[#f5ecdc]" />, label: 'Quartos' },
    { swatch: <span className="block h-3 w-5 rounded-sm bg-[#dcebf3]" />, label: 'WC' },
    { swatch: <span className="block h-3 w-5 rounded-sm bg-[#ebe4f4]" />, label: 'Closet' },
    { swatch: <span className="block h-3 w-5 rounded-sm bg-[#e3ecdf]" />, label: 'Escada' },
    { swatch: <span className="block h-0.5 w-5 border-t-2 border-dotted border-lime-600" />, label: 'Abertura na laje' },
  ]
  if (works) {
    items.push(
      { swatch: <span className="block h-3 w-5 rounded-sm bg-[#292524]" />, label: 'Paredes a manter' },
      { swatch: <span className="block h-3 w-5 rounded-sm bg-[#ea580c]" />, label: 'Paredes novas' },
      { swatch: <span className="block h-3 w-5 rounded-sm border border-dashed border-red-600 bg-red-100" />, label: 'A demolir' },
      { swatch: <span className="block h-3 w-5 rounded-sm border border-orange-600 bg-[repeating-linear-gradient(45deg,#fde7d4_0_3px,#ea580c_3px_4px)]" />, label: 'Vão a fechar' },
    )
  }
  return (
    <>
      <Separator />
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 text-xs text-stone-600">
        {items.map((i) => (
          <span key={i.label} className="flex items-center gap-1.5">
            {i.swatch}
            {i.label}
          </span>
        ))}
      </div>
    </>
  )
}

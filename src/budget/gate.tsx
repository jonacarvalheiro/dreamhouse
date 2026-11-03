import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** SHA-256 do código; o número em si não fica no código. */
const HASH = 'c922414810ba8a2b1eb5202abce73ec27e15fa81ac0ed4079ecd94fed48a1db4'
const KEY = 'casa-pin'

const digest = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim()))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const isUnlocked = () => {
  try {
    return localStorage.getItem(KEY) === HASH
  } catch {
    return false
  }
}

/** Pedido do código para Compras e Orçamentos. Uma vez certo, este navegador fica à vontade. */
export function PinForm({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setWrong(false)
    const ok = (await digest(pin)) === HASH
    setBusy(false)
    if (!ok) {
      setWrong(true)
      return
    }
    localStorage.setItem(KEY, HASH)
    onUnlock()
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Contas da obra</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">Código para entrar</h2>
      <p className="mt-2 text-sm text-stone-600">Compras e orçamentos ficam atrás deste código. Depois de o meterem, este navegador não volta a pedir.</p>
      <form onSubmit={submit} className="mt-6 flex gap-2">
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="Código"
          aria-label="Código"
          aria-invalid={wrong}
          value={pin}
          onChange={(ev) => {
            setPin(ev.target.value)
            setWrong(false)
          }}
          className="h-10 tracking-[0.3em]"
        />
        <Button type="submit" disabled={busy || pin.trim().length === 0} className="h-10 px-4">
          Entrar
        </Button>
      </form>
      {wrong && <p className="mt-2 text-sm text-red-700">Código errado.</p>}
    </main>
  )
}

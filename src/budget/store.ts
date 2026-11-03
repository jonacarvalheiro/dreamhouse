import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error'
export type SavePlace = 'file' | 'browser'

const endpoint = (name: string) => `${import.meta.env.BASE_URL}api/dados/${name}`
const browserKey = (name: string) => `casa-${name}-v1`

export const saveText = (status: SaveStatus, place: SavePlace) =>
  ({
    loading: 'A ler…',
    saving: 'A guardar…',
    saved: place === 'file' ? 'Guardado na pasta dados/, neste computador.' : 'Guardado neste navegador.',
    error: 'Não foi possível guardar.',
  })[status]

const readBrowser = (name: string, legacy?: string) => {
  try {
    return localStorage.getItem(browserKey(name)) ?? (legacy ? localStorage.getItem(legacy) : null)
  } catch {
    return null
  }
}

const writeBrowser = (name: string, body: string) => {
  try {
    localStorage.setItem(browserKey(name), body)
    return true
  } catch {
    return false
  }
}

/**
 * Estado das páginas de contas. No `npm run dev` grava `dados/<name>.json` (o telemóvel na mesma rede vê o mesmo
 * ficheiro). No site publicado, sem esse servidor, grava neste navegador.
 */
export function useStored<T extends object>(name: string, initial: T, legacy?: string) {
  const [value, setValue] = useState(initial)
  const [status, setStatus] = useState<SaveStatus>('loading')
  const [place, setPlace] = useState<SavePlace>('browser')
  const latest = useRef(initial)
  const ready = useRef(false)
  const edits = useRef(0)
  const where = useRef<SavePlace>('browser')
  const queued = useRef<string | null>(null)
  const writing = useRef(false)

  const save = useCallback(
    async (next: T) => {
      queued.current = JSON.stringify(next)
      if (writing.current) return
      writing.current = true
      while (queued.current !== null) {
        const body = queued.current
        queued.current = null
        setStatus('saving')
        if (where.current === 'file') {
          try {
            const res = await fetch(endpoint(name), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
            if (res.ok) {
              setStatus('saved')
              continue
            }
          } catch {
            /* o site publicado não tem o servidor da pasta dados/ */
          }
          where.current = 'browser'
          setPlace('browser')
        }
        setStatus(writeBrowser(name, body) ? 'saved' : 'error')
      }
      writing.current = false
    },
    [name],
  )

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (writing.current) return
      const seen = edits.current
      let fromFile: Partial<T> | null | undefined
      try {
        const res = await fetch(endpoint(name), { cache: 'no-store' })
        if (res.ok) fromFile = (await res.json()) as Partial<T> | null
      } catch {
        /* GitHub Pages: não há /api/dados */
      }
      const raw = fromFile == null ? readBrowser(name, legacy) : null
      const data = fromFile ?? (raw ? (JSON.parse(raw) as Partial<T>) : null)
      if (!alive || edits.current !== seen) return
      const next = { ...initial, ...data }
      latest.current = next
      ready.current = true
      where.current = fromFile !== undefined ? 'file' : 'browser'
      setPlace(where.current)
      setValue(next)
      setStatus('saved')
      if (fromFile === null && raw) void save(next)
    }
    const onShow = () => {
      if (document.visibilityState === 'visible') void load()
    }
    void load()
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('focus', onShow)
    }
  }, [name, initial, legacy, save])

  const update = useCallback(
    (action: SetStateAction<T>) => {
      const next = typeof action === 'function' ? (action as (prev: T) => T)(latest.current) : action
      latest.current = next
      edits.current++
      setValue(next)
      if (ready.current) void save(next)
    },
    [save],
  )

  return [value, update, status, place] as const
}

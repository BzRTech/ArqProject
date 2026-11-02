import { useEffect, useState } from 'react'
import { useEditor } from './store'
import { getAsset, loadProject, saveBackupSync, saveProject } from './persistence'
import { clearHistory } from './store'

export type SaveStatus = 'carregando' | 'salvo' | 'salvando' | 'erro'

/** Carrega o projeto do IndexedDB e salva automaticamente a cada mudança (debounce). */
export function useLocalPersistence(): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('carregando')

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let dirty = false
    let unsubscribe: (() => void) | undefined

    const flush = () => {
      clearTimeout(timer)
      timer = undefined
      if (!dirty) return
      dirty = false
      saveProject(useEditor.getState().project)
        .then(() => {
          if (!dirty) setStatus('salvo')
        })
        .catch(() => setStatus('erro'))
    }
    // Ao esconder/recarregar/fechar a aba: cópia SÍNCRONA (localStorage) + gravação normal.
    const leave = () => {
      if (dirty) saveBackupSync(useEditor.getState().project)
      flush()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') leave()
    }
    window.addEventListener('pagehide', leave)
    document.addEventListener('visibilitychange', onHide)

    loadProject()
      .then((p) => {
        if (cancelled) return
        if (p) useEditor.getState().loadProject(p)
        clearHistory()
        setStatus('salvo')
        unsubscribe = useEditor.subscribe((s, prev) => {
          if (s.project === prev.project) return
          dirty = true
          setStatus('salvando')
          // Grava no máximo 400 ms depois da PRIMEIRA mudança; edições seguidas não adiam.
          timer ??= setTimeout(flush, 400)
        })
      })
      .catch(() => setStatus('erro'))

    return () => {
      cancelled = true
      flush()
      unsubscribe?.()
      window.removeEventListener('pagehide', leave)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  return status
}

const assetCache = new Map<string, string>()

/** URL (data:) de um arquivo salvo localmente. */
export function useAssetUrl(assetId: string | undefined): string | undefined {
  const [fetched, setFetched] = useState<{ id: string; url: string } | null>(null)
  const cached = assetId ? assetCache.get(assetId) : undefined
  useEffect(() => {
    if (!assetId || assetCache.has(assetId)) return
    let alive = true
    getAsset(assetId).then((u) => {
      if (!u) return
      assetCache.set(assetId, u)
      if (alive) setFetched({ id: assetId, url: u })
    })
    return () => {
      alive = false
    }
  }, [assetId])
  if (!assetId) return undefined
  return cached ?? (fetched?.id === assetId ? fetched.url : undefined)
}

export function rememberAsset(id: string, dataUrl: string) {
  assetCache.set(id, dataUrl)
}

export const assetUrlNow = (id: string | undefined) => (id ? assetCache.get(id) : undefined)

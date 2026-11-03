import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchProject, saveProjectRemote, type Conflict } from '@/api/projects'
import { migrateProject } from '@/core/project/migrations'
import type { Project } from '@/core/project/schema'
import { setAssetTarget } from './asset-target'
import { getAsset, loadProject, saveBackupSync, saveProject } from './persistence'
import { ServerSync, type SyncState } from './server-sync'
import { useEditorSession } from './session'
import { clearHistory, useEditor } from './store'

export type SaveStatus = 'carregando' | SyncState['status']

/** De onde vem o projeto aberto no editor. */
export type ProjectSource = { kind: 'local' } | { kind: 'server'; id: string }

export interface Persistence {
  status: SaveStatus
  source: ProjectSource
  conflict?: Conflict
  message?: string
  /** Erro ao abrir (projeto não encontrado, sem rede…). */
  loadError?: string
  /** Conflito: ficar com a versão do servidor (descarta as minhas mudanças não salvas). */
  loadServerVersion: () => Promise<void>
  /** Conflito: salvar a minha por cima. */
  keepMine: () => Promise<void>
}

export function usePersistence(source: ProjectSource): Persistence {
  const local = useLocalPersistence(source.kind === 'local')
  const server = useServerPersistence(source.kind === 'server' ? source.id : null)
  return source.kind === 'local' ? { ...local, source } : { ...server, source }
}

const noop = async () => undefined

/** Rascunho local: IndexedDB + cópia síncrona em localStorage (debounce de 400 ms). */
function useLocalPersistence(enabled: boolean): Omit<Persistence, 'source'> {
  const [status, setStatus] = useState<SaveStatus>('carregando')

  useEffect(() => {
    if (!enabled) return
    setAssetTarget('local')
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
  }, [enabled])

  return { status, loadServerVersion: noop, keepMine: noop }
}

// --- Projeto no servidor -----------------------------------------------------------------

interface ServerBackup {
  baseRevision: number
  savedAt: number
  project: unknown
}

const backupKey = (id: string) => `prancheta.server-backup.${id}`

function readServerBackup(id: string): ServerBackup | null {
  try {
    const raw = localStorage.getItem(backupKey(id))
    return raw ? (JSON.parse(raw) as ServerBackup) : null
  } catch {
    return null
  }
}

function writeServerBackup(id: string, baseRevision: number, project: Project) {
  try {
    const b: ServerBackup = { baseRevision, savedAt: Date.now(), project }
    localStorage.setItem(backupKey(id), JSON.stringify(b))
  } catch {
    // Sem espaço: o próximo save no servidor resolve.
  }
}

const dropServerBackup = (id: string) => {
  try {
    localStorage.removeItem(backupKey(id))
  } catch {
    // ignore
  }
}

/**
 * Projeto do servidor: abre (GET), migra o formato se for antigo e salva com `If-Match`
 * (`ServerSync`). Ao sair com algo pendente, guarda cópia local; ao abrir, se a cópia partiu
 * da MESMA revisão do servidor, ela vale (e é enviada).
 */
function useServerPersistence(id: string | null): Omit<Persistence, 'source'> {
  const [state, setState] = useState<SyncState | { status: 'carregando' }>({
    status: 'carregando',
  })
  const [loadError, setLoadError] = useState<string>()
  const syncRef = useRef<ServerSync | null>(null)

  useEffect(() => {
    if (!id) return
    // O editor é remontado a cada projeto (key = id): o estado já começa "carregando".
    setAssetTarget('server')
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const leave = () => {
      const sync = syncRef.current
      if (sync?.pending) writeServerBackup(id, sync.revision, useEditor.getState().project)
      void sync?.flush()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') leave()
    }
    window.addEventListener('pagehide', leave)
    document.addEventListener('visibilitychange', onHide)

    fetchProject(id)
      .then((detail) => {
        if (cancelled) return
        const backup = readServerBackup(id)
        const useBackup = backup !== null && backup.baseRevision === detail.revision
        if (backup && !useBackup) dropServerBackup(id)
        const doc = migrateProject(useBackup ? backup.project : detail.data)
        useEditor.getState().loadProject(doc)
        clearHistory()
        const sync = new ServerSync(
          {
            save: (d, rev) => saveProjectRemote(id, d, rev),
            getDoc: () => useEditor.getState().project,
            onState: (s) => {
              if (!cancelled) setState(s)
            },
            onSaved: () => dropServerBackup(id),
          },
          detail.revision,
        )
        syncRef.current = sync
        useEditorSession.setState({ projectId: id, flush: () => sync.flush() })
        setState({ status: 'salvo' })
        unsubscribe = useEditor.subscribe((s, prev) => {
          if (s.project !== prev.project) sync.markDirty()
        })
        // Cópia local mais nova que o servidor, formato convertido ou sem relatório do
        // memorial (projeto antigo ou versão restaurada): envia.
        if (useBackup || doc.schemaVersion !== detail.schema_version || !detail.has_report)
          sync.markDirty()
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
      leave()
      syncRef.current?.dispose()
      syncRef.current = null
      useEditorSession.setState({ projectId: null, flush: async () => undefined })
      unsubscribe?.()
      window.removeEventListener('pagehide', leave)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [id])

  const loadServerVersion = useCallback(async () => {
    const sync = syncRef.current
    if (!id || !sync) return
    const detail = await fetchProject(id)
    // Trocar o documento dispara o subscribe (markDirty); o reset logo depois zera.
    useEditor.getState().loadProject(migrateProject(detail.data))
    clearHistory()
    sync.reset(detail.revision)
    dropServerBackup(id)
  }, [id])

  const keepMine = useCallback(async () => {
    const sync = syncRef.current
    if (!id || !sync) return
    const detail = await fetchProject(id)
    await sync.overwrite(detail.revision)
  }, [id])

  const s = state as SyncState
  return {
    status: loadError ? 'erro' : state.status,
    conflict: s.conflict,
    message: loadError ?? s.message,
    loadError,
    loadServerVersion,
    keepMine,
  }
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

import { migrateProject } from '@/core/project/migrations'
import type { Project } from '@/core/project/schema'

/**
 * Persistência local no navegador (IndexedDB). Na Fase 2 o documento passa a ser salvo
 * no servidor; o formato é o mesmo (validado pelo schema zod).
 */
const DB = 'prancheta'
const VERSION = 1
const KV = 'kv'
const ASSETS = 'assets'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV)
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB indisponível'))
  })
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    t.oncomplete = () => {
      db.close()
      resolve(req.result)
    }
    t.onerror = () => reject(t.error ?? new Error('Falha no IndexedDB'))
  })
}

export async function loadProject(): Promise<Project | null> {
  const raw = await tx<unknown>(KV, 'readonly', (s) => s.get('project'))
  if (!raw) return null
  try {
    return migrateProject(raw)
  } catch (e) {
    console.warn('Projeto salvo inválido; começando um novo.', e)
    return null
  }
}

export const saveProject = (p: Project) =>
  tx(KV, 'readwrite', (s) => s.put(p, 'project')).then(() => undefined)

export const putAsset = (id: string, dataUrl: string) =>
  tx(ASSETS, 'readwrite', (s) => s.put(dataUrl, id)).then(() => undefined)

export const getAsset = (id: string) => tx<string | undefined>(ASSETS, 'readonly', (s) => s.get(id))

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error ?? new Error('Falha ao ler o arquivo'))
    r.readAsDataURL(file)
  })
}

export function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Imagem inválida'))
    img.src = dataUrl
  })
}

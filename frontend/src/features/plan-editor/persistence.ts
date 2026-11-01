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

let dbPromise: Promise<IDBDatabase> | null = null

/** Conexão reaproveitada (gravações rápidas); fecha sozinha se pedirem para apagar o banco. */
function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV)
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS)
    }
    req.onsuccess = () => {
      const db = req.result
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error ?? new Error('IndexedDB indisponível'))
    }
  })
  return dbPromise
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
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error ?? new Error('Falha no IndexedDB'))
  })
}

// --- Cópia de segurança síncrona ---------------------------------------------------
// Ao sair da página, o IndexedDB (assíncrono) pode não terminar. O localStorage é
// síncrono: grava ali na hora e, ao abrir, vale a versão mais recente.
const BACKUP_KEY = 'prancheta.backup'

interface Backup {
  savedAt: number
  project: unknown
}

function readBackup(): Backup | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? (JSON.parse(raw) as Backup) : null
  } catch {
    return null
  }
}

export function saveBackupSync(p: Project) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: Date.now(), project: p }))
  } catch {
    // Sem espaço/bloqueado: fica só o IndexedDB.
  }
}

export async function loadProject(): Promise<Project | null> {
  const raw = await tx<unknown>(KV, 'readonly', (s) => s.get('project'))
  const savedAt = (await tx<unknown>(KV, 'readonly', (s) => s.get('savedAt'))) as number | undefined
  const backup = readBackup()
  const source = backup && backup.savedAt > (savedAt ?? 0) ? backup.project : raw
  if (!source) return null
  try {
    return migrateProject(source)
  } catch (e) {
    console.warn('Projeto salvo inválido; começando um novo.', e)
    return null
  }
}

export async function saveProject(p: Project): Promise<void> {
  const db = await open()
  const at = Date.now()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(KV, 'readwrite')
    t.objectStore(KV).put(p, 'project')
    t.objectStore(KV).put(at, 'savedAt')
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error ?? new Error('Falha no IndexedDB'))
  })
  // O IndexedDB já tem algo tão novo quanto a cópia: ela pode sair.
  const b = readBackup()
  if (b && b.savedAt <= at) localStorage.removeItem(BACKUP_KEY)
}

/** Apaga tudo o que o editor guardou neste navegador (usado por testes e "novo projeto"). */
export function clearLocalBackup() {
  localStorage.removeItem(BACKUP_KEY)
}

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

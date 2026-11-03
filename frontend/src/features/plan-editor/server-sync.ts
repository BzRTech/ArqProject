import type { Conflict, SaveResult } from '@/api/projects'
import type { Project } from '@/core/project/schema'

/**
 * Autosave no servidor com controle de revisão (sem React; testado em server-sync.test.ts).
 *
 * - grava no máximo `delayMs` depois da PRIMEIRA mudança (edições seguidas não adiam);
 * - um save por vez, sempre com `If-Match` da última revisão confirmada;
 * - sem rede: tenta de novo a cada `retryMs`;
 * - 409 (outra aba/pessoa salvou antes): PARA e espera a decisão do usuário
 *   (`overwrite` = manter a minha; `reset` = ficar com a do servidor);
 * - 403 (papel de leitura): para de tentar.
 */
export type SyncStatus = 'salvo' | 'salvando' | 'offline' | 'conflito' | 'erro' | 'somente-leitura'

export interface SyncState {
  status: SyncStatus
  conflict?: Conflict
  message?: string
}

export interface SyncDeps {
  save: (doc: Project, revision: number) => Promise<SaveResult>
  getDoc: () => Project
  onState: (s: SyncState) => void
  /** Gravou com sucesso e não há nada pendente. */
  onSaved?: (revision: number) => void
  delayMs?: number
  retryMs?: number
}

export class ServerSync {
  revision: number
  private dirty = false
  private inFlight = false
  private blocked: 'conflito' | 'somente-leitura' | 'erro' | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  private readonly deps: Required<Omit<SyncDeps, 'onSaved'>> & Pick<SyncDeps, 'onSaved'>

  constructor(deps: SyncDeps, revision: number) {
    this.deps = { delayMs: 1000, retryMs: 5000, ...deps }
    this.revision = revision
  }

  /** O documento mudou. */
  markDirty() {
    this.dirty = true
    if (this.blocked) return
    this.deps.onState({ status: 'salvando' })
    this.schedule(this.deps.delayMs)
  }

  /** Há algo não confirmado pelo servidor. */
  get pending(): boolean {
    return this.dirty || this.inFlight
  }

  private schedule(ms: number) {
    if (this.timer !== undefined || this.inFlight || this.disposed) return
    this.timer = setTimeout(() => void this.flush(), ms)
  }

  /** Grava agora (se houver mudança e nada bloqueando). */
  async flush(): Promise<void> {
    clearTimeout(this.timer)
    this.timer = undefined
    if (this.inFlight || !this.dirty || this.blocked || this.disposed) return
    this.inFlight = true
    this.dirty = false
    let result: SaveResult
    try {
      result = await this.deps.save(this.deps.getDoc(), this.revision)
    } catch {
      this.inFlight = false
      this.dirty = true
      if (this.disposed) return
      this.deps.onState({
        status: 'offline',
        message: 'Sem conexão com o servidor; tentando de novo.',
      })
      this.schedule(this.deps.retryMs)
      return
    }
    this.inFlight = false
    if (this.disposed) return
    switch (result.kind) {
      case 'saved':
        this.revision = result.revision
        if (this.dirty) {
          this.deps.onState({ status: 'salvando' })
          this.schedule(this.deps.delayMs)
        } else {
          this.deps.onState({ status: 'salvo' })
          this.deps.onSaved?.(this.revision)
        }
        return
      case 'conflict':
        this.dirty = true
        this.blocked = 'conflito'
        this.deps.onState({ status: 'conflito', conflict: result.conflict })
        return
      case 'forbidden':
        this.blocked = 'somente-leitura'
        this.deps.onState({ status: 'somente-leitura', message: result.message })
        return
      case 'invalid':
        this.dirty = true
        this.blocked = 'erro'
        this.deps.onState({ status: 'erro', message: result.message })
        return
    }
  }

  /** Manter as MINHAS alterações: salva por cima da revisão atual do servidor. */
  overwrite(serverRevision: number): Promise<void> {
    this.revision = serverRevision
    this.blocked = null
    this.dirty = true
    this.deps.onState({ status: 'salvando' })
    return this.flush()
  }

  /** Ficar com o documento do servidor (o editor já o carregou). */
  reset(serverRevision: number) {
    clearTimeout(this.timer)
    this.timer = undefined
    this.revision = serverRevision
    this.dirty = false
    this.blocked = null
    this.deps.onState({ status: 'salvo' })
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.timer)
  }
}

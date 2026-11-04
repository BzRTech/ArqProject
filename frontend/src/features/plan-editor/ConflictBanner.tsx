import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { Persistence } from './hooks'

const time = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

/**
 * Conflito de revisão (409): outra aba ou outra pessoa salvou este projeto depois que ele foi
 * aberto aqui. O autosave para até o usuário escolher.
 */
export function ConflictBanner({ persistence }: { persistence: Persistence }) {
  const [busy, setBusy] = useState(false)
  const { status, conflict } = persistence
  if (status === 'somente-leitura')
    return (
      <div className="banner" role="status" data-testid="readonly-banner">
        <TriangleAlert size={16} strokeWidth={1.5} />
        <span>
          {persistence.message ?? 'Seu papel neste escritório é somente leitura.'} As alterações
          feitas aqui não são salvas.
        </span>
      </div>
    )
  if (status !== 'conflito' || !conflict) return null
  const run = (fn: () => Promise<void>) => {
    setBusy(true)
    void fn().finally(() => setBusy(false))
  }
  const who = conflict.updated_by_name ? ` por ${conflict.updated_by_name}` : ''
  return (
    <div className="banner banner--warn" role="alert" data-testid="conflict-banner">
      <TriangleAlert size={16} strokeWidth={1.5} />
      <span>
        Este projeto foi salvo em outra aba ou{who} às {time(conflict.updated_at)}. Suas últimas
        alterações <strong>ainda não foram salvas</strong>.
      </span>
      <div className="banner__actions">
        <button
          type="button"
          className="sm"
          disabled={busy}
          onClick={() => run(persistence.loadServerVersion)}
          data-testid="conflict-server"
        >
          Usar a versão salva
        </button>
        <button
          type="button"
          className="sm primary"
          disabled={busy}
          onClick={() => run(persistence.keepMine)}
          data-testid="conflict-mine"
        >
          Manter a minha
        </button>
      </div>
    </div>
  )
}

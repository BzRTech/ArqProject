import { CircleAlert, Check, FileDown, ImageUp, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTopbarSlot } from '@/app/topbar-slot'
import { importBasePlan } from './base-plan-import'
import type { Persistence, SaveStatus } from './hooks'
import { usePdf } from './pdf-action'

const STATUS_LABEL: Record<SaveStatus, string> = {
  carregando: 'Carregando…',
  salvo: 'Salvo',
  salvando: 'Salvando…',
  erro: 'Erro ao salvar',
  offline: 'Sem conexão',
  conflito: 'Não salvo (conflito)',
  'somente-leitura': 'Somente leitura',
}

function statusLabel(p: Persistence): string {
  if (p.source.kind === 'local' && p.status === 'salvo') return 'Salvo neste navegador'
  return STATUS_LABEL[p.status]
}

/** Ações do editor na barra superior: estado do salvamento, importar planta e baixar PDF. */
export function EditorActions({
  persistence,
  onFit,
}: {
  persistence: Persistence
  onFit: () => void
}) {
  const { status } = persistence
  const slot = useTopbarSlot()
  const fileRef = useRef<HTMLInputElement>(null)
  const { busy, toast, run: pdf, dismiss } = usePdf()

  useEffect(() => {
    if (!toast || toast.error) return
    const t = window.setTimeout(dismiss, 6000)
    return () => window.clearTimeout(t)
  }, [toast, dismiss])

  const actions = (
    <>
      <span
        className={`save-status save-status--${status}`}
        data-testid="save-status"
        title={persistence.message}
      >
        {statusLabel(persistence)}
      </span>
      <button
        type="button"
        className="sm"
        onClick={() => fileRef.current?.click()}
        data-testid="import-base-plan"
      >
        <ImageUp size={15} strokeWidth={1.5} />
        Importar planta
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        data-testid="base-plan-input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importBasePlan(f).then(onFit)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="primary sm"
        onClick={() => void pdf()}
        disabled={busy}
        data-testid="export-pdf"
        title="Uma prancha por ambiente (folha do modelo ou a escolhida), na maior escala que couber"
      >
        <FileDown size={15} strokeWidth={1.5} />
        {busy ? 'Gerando…' : 'Baixar PDF'}
      </button>
    </>
  )

  return (
    <>
      {slot && createPortal(actions, slot)}
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast--error' : ''}`}
          role="status"
          data-testid="toolbar-message"
        >
          {toast.error ? (
            <CircleAlert size={15} strokeWidth={1.5} />
          ) : (
            <Check size={15} strokeWidth={1.5} />
          )}
          {toast.text}
          <button type="button" onClick={dismiss} aria-label="Fechar aviso">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </>
  )
}

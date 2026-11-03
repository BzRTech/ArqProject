import { CircleAlert, Check, FileDown, ImageUp, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTopbarSlot } from '@/app/topbar-slot'
import { importBasePlan } from './base-plan-import'
import { usePdf } from './pdf-action'

const STATUS_LABEL = {
  carregando: 'Carregando…',
  salvo: 'Salvo neste navegador',
  salvando: 'Salvando…',
  erro: 'Erro ao salvar',
}

export type SaveStatus = keyof typeof STATUS_LABEL

/** Ações do editor na barra superior: estado do salvamento, importar planta e baixar PDF. */
export function EditorActions({ status, onFit }: { status: SaveStatus; onFit: () => void }) {
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
      <span className={`save-status save-status--${status}`} data-testid="save-status">
        {STATUS_LABEL[status]}
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
        title="Uma prancha A3 por ambiente, na maior escala que couber"
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

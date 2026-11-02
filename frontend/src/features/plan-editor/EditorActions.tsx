import { CircleAlert, Check, FileDown, ImageUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTopbarSlot } from '@/app/topbar-slot'
import { exportProjectPdf } from './export-pdf'
import { importBasePlan } from './base-plan-import'
import { useEditor } from './store'
import { useUnits } from './units-pref'

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
  const humanized = useUnits((u) => u.humanized)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)

  useEffect(() => {
    if (!toast || toast.error) return
    const t = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(t)
  }, [toast])

  async function pdf() {
    setBusy(true)
    setToast(null)
    try {
      const r = await exportProjectPdf(useEditor.getState().project, { humanized })
      setToast({
        text: `Planta exportada em PDF · ${r.pages} prancha(s) · escala ${r.scales.map((s) => `1:${s}`).join(', ')}`,
      })
    } catch (e) {
      setToast({
        text: `Erro ao gerar PDF: ${e instanceof Error ? e.message : String(e)}`,
        error: true,
      })
    } finally {
      setBusy(false)
    }
  }

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
        onClick={pdf}
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
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </>
  )
}

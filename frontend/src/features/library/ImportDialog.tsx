import { useState } from 'react'
import { importSheet, type ImportReport } from '@/api/library'
import type { LibraryKind } from '@/core/library/schemas'
import { Dialog } from '@/app/ui/Dialog'

/** Colunas aceitas por banco (iguais às de `apps/library/importers.py`). */
const COLUMNS: Partial<Record<LibraryKind, string>> = {
  materials:
    'id; nome; tipo (liso|madeirado); cor (#rrggbb); fabricante; linha; codigo; espessuras_mm (6,15,18); chapa_comprimento_mm; chapa_largura_mm',
  floors:
    'id; nome; material; peca_comprimento_mm; peca_largura_mm; junta_mm; paginacao (grid|half|third); perda_pct; cor; fabricante; codigo; preco_m2_centavos',
  handles:
    'id; nome; tipo (touch|bar|profile|cava|knob); fabricante; codigo; comprimento_mm; acabamento',
  hardware:
    'id; nome; tipo (dobradica|corredica|fecho-toque|articulador|cesto|outro); fabricante; codigo; observacoes',
  'spec-templates': 'id; nome; categoria; texto',
}

/** Importar planilha (CSV ou XLSX) para o banco do escritório: primeiro confere, depois grava. */
export function ImportDialog({
  kind,
  open,
  onClose,
  onImported,
}: {
  kind: LibraryKind
  open: boolean
  onClose: () => void
  onImported: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<{ r: ImportReport; dry: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const run = (dry: boolean) => {
    if (!file) return
    setBusy(true)
    setError(undefined)
    importSheet(kind, file, dry)
      .then((r) => {
        setReport({ r, dry })
        if (!dry) onImported()
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }
  const close = () => {
    setFile(null)
    setReport(null)
    setError(undefined)
    onClose()
  }

  return (
    <Dialog title="Importar planilha" open={open} onClose={close} testId="import-dialog" wide>
      <div className="form">
        <p className="muted small">
          CSV (separado por ; ou ,) ou XLSX, com cabeçalho na 1ª linha. Colunas:{' '}
          <span className="mono">{COLUMNS[kind]}</span>. Linhas com o mesmo id atualizam a entrada
          do escritório (a versão sobe); linhas com erro não entram.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setReport(null)
          }}
          data-testid="import-file"
        />
        {error && <p className="form-error">{error}</p>}
        {report && (
          <div className="note" data-testid="import-report">
            <strong>{report.dry ? 'Conferência (nada gravado)' : 'Importado'}:</strong>{' '}
            {report.r.criados} novas, {report.r.atualizados} atualizadas, {report.r.iguais} iguais
            {report.r.erros.length > 0 && `, ${report.r.erros.length} com erro`}
            {report.r.erros.length > 0 && (
              <ul className="import-errors">
                {report.r.erros.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="button-row">
          <button type="button" onClick={close}>
            Fechar
          </button>
          <button type="button" disabled={!file || busy} onClick={() => run(true)}>
            Conferir
          </button>
          <button
            type="button"
            className="primary"
            disabled={!file || busy}
            onClick={() => run(false)}
            data-testid="import-run"
          >
            {busy ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

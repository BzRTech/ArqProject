import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Dialog } from '@/app/ui/Dialog'
import { readFileAsDataUrl } from './persistence'
import { closePdfPlanImport, importImagePlan, usePdfPlanImport } from './base-plan-import'

function PdfPagePicker({ file, environmentId }: { file: File; environmentId: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [preview, setPreview] = useState<{ file: File; href: string; page: number } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    let passwordRequired = false
    let loading: { destroy: () => Promise<void> } | undefined
    void (async () => {
      if (file.size > 25 * 1024 * 1024) throw new Error('Escolha um PDF com até 25 MB.')
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = workerUrl
      const data = new Uint8Array(await file.arrayBuffer())
      if (!active) return
      const task = getDocument({ data })
      loading = task
      task.onPassword = () => {
        passwordRequired = true
        if (active) setError('O PDF está protegido por senha. Escolha uma cópia sem senha.')
        void task.destroy()
      }
      const pdf = await task.promise
      if (active) setDocument(pdf)
      else await task.destroy()
    })().catch((e) => {
      if (active && !passwordRequired)
        setError(e instanceof Error ? e.message : 'Não foi possível abrir o PDF.')
    })
    return () => {
      active = false
      void loading?.destroy()
    }
  }, [file])
  useEffect(() => {
    if (!document) return
    let active = true
    let cancel: (() => void) | undefined
    void (async () => {
      const page = await document.getPage(pageNumber)
      if (!active) return
      const natural = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({
        scale: Math.min(2, 3000 / Math.max(natural.width, natural.height)),
      })
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      try {
        const render = page.render({ canvas, viewport })
        cancel = () => render.cancel()
        await render.promise
        if (!active) return
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value ? resolve(value) : reject(new Error('Não foi possível converter a página.')),
            'image/png',
          ),
        )
        const image = new File(
          [blob],
          `${file.name.replace(/\.pdf$/i, '')}-pagina-${pageNumber}.png`,
          { type: 'image/png' },
        )
        const href = await readFileAsDataUrl(image)
        if (active) setPreview({ file: image, href, page: pageNumber })
      } finally {
        canvas.width = canvas.height = 0
        page.cleanup()
      }
    })().catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Não foi possível ler a página.')
    })
    return () => {
      active = false
      cancel?.()
    }
  }, [document, pageNumber, file.name])
  const ready = preview?.page === pageNumber && !error
  return (
    <>
      <p className="muted small">
        Escolha a página da planta. Ela será convertida em imagem para desenhar por cima e calibrar
        com uma medida conhecida.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !document ? (
        <p role="status">Abrindo PDF…</p>
      ) : (
        <>
          <label className="field">
            <span>Página (1 a {document.numPages})</span>
            <input
              type="number"
              min={1}
              max={document.numPages}
              value={pageNumber}
              disabled={saving}
              onChange={(e) => {
                setError('')
                setPageNumber(
                  Math.max(1, Math.min(document.numPages, Math.floor(Number(e.target.value) || 1))),
                )
              }}
              data-testid="pdf-plan-page"
            />
          </label>
          {ready ? (
            <img
              src={preview.href}
              alt={`Prévia da página ${pageNumber}`}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '42vh', margin: '12px auto' }}
              data-testid="pdf-plan-preview"
            />
          ) : (
            <p role="status">Preparando página…</p>
          )}
        </>
      )}
      <div className="button-row">
        <button type="button" onClick={closePdfPlanImport} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="primary"
          disabled={!ready || saving}
          onClick={() => {
            if (!preview || !ready) return
            setSaving(true)
            usePdfPlanImport.setState({ busy: true })
            void importImagePlan(preview.file, environmentId).finally(() => {
              usePdfPlanImport.setState({ busy: false })
              setSaving(false)
              closePdfPlanImport()
            })
          }}
          data-testid="pdf-plan-import"
        >
          {saving ? 'Importando…' : 'Usar esta página'}
        </button>
      </div>
    </>
  )
}

export function PdfPlanImportDialog() {
  const request = usePdfPlanImport((s) => s.request)
  return (
    <Dialog
      title="Importar planta em PDF"
      open={!!request}
      onClose={closePdfPlanImport}
      testId="pdf-plan-dialog"
    >
      {request && (
        <PdfPagePicker
          key={request.file.name + request.file.lastModified}
          file={request.file}
          environmentId={request.environmentId}
        />
      )}
    </Dialog>
  )
}

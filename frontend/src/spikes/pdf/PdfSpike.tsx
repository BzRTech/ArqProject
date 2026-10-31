import { useEffect, useMemo, useState } from 'react'
import { svgToPdf } from './exportPdf'
import { loadPdfFonts, registerWebFonts } from './fonts'
import { buildSheetSvg } from './sheet'

export default function PdfSpike() {
  const sheet = useMemo(() => buildSheetSvg(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    registerWebFonts().catch((e: unknown) => setError(String(e)))
  }, [])

  async function download() {
    setBusy(true)
    setError(null)
    try {
      await registerWebFonts()
      const doc = await svgToPdf(sheet.svg, await loadPdfFonts())
      doc.save('spike-a3-1-50.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="spike">
      <header className="spike__header">
        <h1>Spike: PDF vetorial A3 em 1:50</h1>
        <button type="button" onClick={download} disabled={busy} data-testid="download-pdf">
          {busy ? 'Gerando…' : 'Baixar PDF A3'}
        </button>
      </header>
      {error && <p className="error">Erro: {error}</p>}
      <div className="spike__body spike__body--split">
        <div
          className="sheet-preview"
          data-testid="sheet-preview"
          dangerouslySetInnerHTML={{ __html: sheet.svg }}
        />
        <aside className="notes">
          <h2>Como conferir a escala</h2>
          <ol>
            <li>
              Imprima em folha <strong>A3</strong> com escala <strong>100% / “tamanho real”</strong>{' '}
              (nunca “ajustar à página”).
            </li>
            <li>
              Meça a parede com régua: deve ter <strong>80 mm</strong> (4,00 m ÷ 50).
            </li>
            <li>
              A escala gráfica de 5 m deve medir <strong>100 mm</strong>; cada metro, 20 mm.
            </li>
            <li>
              Sem imprimir: no leitor de PDF, use a ferramenta de medição; a folha tem 420 × 297 mm.
              Dê zoom máximo: as linhas continuam nítidas (é vetor, não imagem).
            </li>
          </ol>
          <p>
            Parede no papel: <strong>{sheet.wallPaperLengthMm} mm</strong>. A mesma conferência roda
            automaticamente em <code>pdfScale.test.ts</code> (Vitest) e no e2e.
          </p>
        </aside>
      </div>
    </section>
  )
}

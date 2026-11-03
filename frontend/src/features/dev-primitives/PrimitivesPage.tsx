import { useEffect, useMemo, useState } from 'react'
import { formatDecimal } from '@/core/units'
import { distance } from '@/core/geometry/vec'
import { svgPagesToPdf } from '@/render/pdf/exportPdf'
import { loadPdfFonts, registerWebFonts } from '@/render/pdf/fonts'
import { toMarkup } from '@/render/svg/markup'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { buildCatalogSheet, MEASURE_CHECKS, PAPER } from './catalog-sheet'
import { SheetViewer } from '@/app/ui/SheetViewer'

export default function PrimitivesPage() {
  const sheet = useMemo(
    () =>
      primitivesToSvg(buildCatalogSheet(), {
        widthMm: PAPER.widthMm,
        heightMm: PAPER.heightMm,
        background: '#ffffff',
      }),
    [],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    registerWebFonts()
      .then(() => setFontsReady(true))
      .catch((e: unknown) => setError(String(e)))
  }, [])

  async function downloadPdf() {
    setBusy(true)
    setError(null)
    try {
      await registerWebFonts()
      const doc = await svgPagesToPdf(
        [{ svgMarkup: toMarkup(sheet), widthMm: PAPER.widthMm, heightMm: PAPER.heightMm }],
        await loadPdfFonts(),
      )
      doc.save('prancheta-primitivas-a3.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="spike">
      <header className="spike__header">
        <h1>Núcleo de geometria — catálogo de primitivas (A3)</h1>
        <button
          type="button"
          className="primary"
          onClick={downloadPdf}
          disabled={busy}
          data-testid="download-pdf"
        >
          {busy ? 'Gerando…' : 'Baixar PDF A3'}
        </button>
      </header>
      {error && <p className="error">Erro: {error}</p>}
      <div className="split">
        {fontsReady && (
          <SheetViewer sheet={sheet} widthMm={PAPER.widthMm} heightMm={PAPER.heightMm} />
        )}
        <aside className="notes">
          <h2>O que tem na prancha</h2>
          <ul>
            <li>
              Planta 1:50: paredes hachuradas, porta com arco, janela, mobiliário, área em m².
            </li>
            <li>
              Cotas em cadeia com linha de total, cota vertical, cota interna e cota alinhada
              (diagonal da cama).
            </li>
            <li>Vista frontal do rack M01 em 1:20 (módulos 90,9 / 90,9 / 90,9 / 45,3 = 318).</li>
            <li>Corte do rack em 1:10: vãos de 0,6 e 1,8 cm com texto escalonado ou para fora.</li>
            <li>Tipos de linha, penas, textos, hachuras, arco, círculo e imagem.</li>
          </ul>
          <h2>Conferir com régua (A3 a 100%)</h2>
          <ul data-testid="checks">
            {MEASURE_CHECKS.map((c) => (
              <li
                key={c.label}
                data-check={JSON.stringify({ a: c.a, b: c.b })}
                data-testid="measure-check"
              >
                {c.label}: <strong>{formatDecimal(distance(c.a, c.b), 1)} mm</strong>
              </li>
            ))}
            <li>Escalas gráficas: 5 m em 1:50 = 100 mm; 2 m em 1:20 = 100 mm.</li>
          </ul>
          <p>
            Tela e PDF saem da mesma árvore SVG gerada pelo núcleo. Os testes medem estas linhas
            dentro do PDF.
          </p>
        </aside>
      </div>
    </section>
  )
}

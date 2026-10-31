// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { svgToPdf, type EmbeddedFont } from './exportPdf'
import { extractSegments, findSegment, readFirstPage } from './pdfMeasure'
import { buildSheetSvg, MODEL_ORIGIN } from './sheet'

// Vitest roda a partir de frontend/.
const fontPath = (rel: string) => resolve('node_modules/@expo-google-fonts/roboto', rel)

const fonts: EmbeddedFont[] = [
  {
    family: 'Roboto',
    style: 'normal',
    fileName: 'Roboto-Regular.ttf',
    base64: readFileSync(fontPath('400Regular/Roboto_400Regular.ttf')).toString('base64'),
  },
  {
    family: 'Roboto',
    style: 'bold',
    fileName: 'Roboto-Bold.ttf',
    base64: readFileSync(fontPath('700Bold/Roboto_700Bold.ttf')).toString('base64'),
  },
]

describe('PDF A3 1:50 (svg2pdf + jsPDF)', () => {
  let page: ReturnType<typeof readFirstPage>

  beforeAll(async () => {
    // jsdom não implementa getBBox (usado pelo svg2pdf só para medir texto).
    // A aproximação afeta apenas o alinhamento do texto, não a geometria medida aqui.
    ;(window.SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = function (
      this: SVGElement,
    ) {
      return { x: 0, y: 0, width: (this.textContent ?? '').length * 1.5, height: 3 } as DOMRect
    }
    const doc = await svgToPdf(buildSheetSvg().svg, fonts, { compress: false })
    page = readFirstPage(new Uint8Array(doc.output('arraybuffer')))
  })

  it('folha tem 420 × 297 mm', () => {
    expect(page.widthMm).toBeCloseTo(420, 2)
    expect(page.heightMm).toBeCloseTo(297, 2)
  })

  it('parede de 4 m sai com exatamente 80 mm no papel', () => {
    const segs = extractSegments(page.content, page.heightMm)
    const { x, y } = MODEL_ORIGIN
    const top = findSegment(segs, [x, y], [x + 80, y])
    expect(top, 'face superior da parede').toBeDefined()
    expect(top!.x2 - top!.x1).toBeCloseTo(top!.x2 > top!.x1 ? 80 : -80, 3)
    // espessura 15 cm → 3 mm
    expect(findSegment(segs, [x + 80, y], [x + 80, y + 3])).toBeDefined()
  })

  it('é vetorial e embute a fonte TrueType', () => {
    expect(page.raw).toContain('/FontFile2')
    expect(page.raw).toMatch(/\/BaseFont \/Roboto/)
    expect(page.raw).not.toMatch(/\/Subtype\s*\/Image/)
  })
})

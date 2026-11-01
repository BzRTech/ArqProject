// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Primitive } from '@/core/drawing/primitives'
import { buildCatalogSheet, MEASURE_CHECKS, PAPER } from '@/features/dev-primitives/catalog-sheet'
import { toMarkup } from '../svg/markup'
import { primitivesToSvg } from '../svg/primitives-to-svg'
import { svgPagesToPdf, type EmbeddedFont } from './exportPdf'
import { extractSegments, findSegment, readFirstPage } from './testing/pdfMeasure'

// Vitest roda a partir de frontend/.
const font = (rel: string) =>
  readFileSync(resolve('node_modules/@expo-google-fonts/roboto', rel)).toString('base64')

const fonts: EmbeddedFont[] = [
  {
    family: 'Roboto',
    style: 'normal',
    fileName: 'R.ttf',
    base64: font('400Regular/Roboto_400Regular.ttf'),
  },
  {
    family: 'Roboto',
    style: 'bold',
    fileName: 'B.ttf',
    base64: font('700Bold/Roboto_700Bold.ttf'),
  },
]

/** jsdom não carrega imagens (o svg2pdf esperaria para sempre); elas são testadas no e2e. */
const withoutImages = (ps: Primitive[]): Primitive[] =>
  ps
    .filter((p) => p.kind !== 'image')
    .map((p) => (p.kind === 'group' ? { ...p, children: withoutImages(p.children) } : p))

describe('PDF da prancha de catálogo (núcleo → SVG → svg2pdf)', () => {
  let page: ReturnType<typeof readFirstPage>

  beforeAll(async () => {
    // jsdom não implementa getBBox (usado pelo svg2pdf só para medir texto).
    ;(window.SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = function (
      this: SVGElement,
    ) {
      return { x: 0, y: 0, width: (this.textContent ?? '').length * 1.5, height: 3 } as DOMRect
    }
    const svg = toMarkup(
      primitivesToSvg(withoutImages(buildCatalogSheet()), {
        widthMm: PAPER.widthMm,
        heightMm: PAPER.heightMm,
        background: '#fff',
      }),
    )
    const doc = await svgPagesToPdf(
      [{ svgMarkup: svg, widthMm: PAPER.widthMm, heightMm: PAPER.heightMm }],
      fonts,
      {
        compress: false,
      },
    )
    page = readFirstPage(new Uint8Array(doc.output('arraybuffer')))
  })

  it('A3: 420 × 297 mm', () => {
    expect(page.widthMm).toBeCloseTo(420, 2)
    expect(page.heightMm).toBeCloseTo(297, 2)
  })

  it.each(MEASURE_CHECKS.map((c) => [c.label, c] as const))('%s', (_, c) => {
    const segs = extractSegments(page.content, page.heightMm)
    expect(findSegment(segs, [c.a.x, c.a.y], [c.b.x, c.b.y])).toBeDefined()
  })

  it('vetorial e com fonte embutida', () => {
    expect(page.raw).toContain('/FontFile2')
  })
})

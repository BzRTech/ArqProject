// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Entity } from '@/core/drawing/entities'
import { walk } from '@/core/drawing/primitives'
import { PEN } from '@/core/drawing/styles'
import { vec } from '@/core/geometry/vec'
import type { Orientation, PaperFormat } from '@/core/sheets/paper'
import { buildPlanSheet } from '@/core/sheets/plan-sheet'
import { toMarkup } from '../svg/markup'
import { primitivesToSvg } from '../svg/primitives-to-svg'
import { svgPagesToPdf, type EmbeddedFont } from './exportPdf'
import { extractSegments, findSegment, readFirstPage } from './testing/pdfMeasure'

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

/** Parede de 4 m (pena grossa) num ambiente de 4 × 3 m. */
const room = (): Entity[] => [
  { kind: 'line', a: vec(0, 0), b: vec(4000, 0), style: { weight: PEN.extraThick } },
  { kind: 'rect', x: 0, y: 0, width: 4000, height: 3000, style: { weight: PEN.thin } },
]

const CASES: [PaperFormat, Orientation, number, number][] = [
  ['A4', 'portrait', 210, 297],
  ['A3', 'landscape', 420, 297],
  ['A1', 'landscape', 841, 594],
]

describe('PDF da prancha em cada folha: tamanho e medida em escala', () => {
  beforeAll(() => {
    ;(window.SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = function (
      this: SVGElement,
    ) {
      return { x: 0, y: 0, width: (this.textContent ?? '').length * 1.5, height: 3 } as DOMRect
    }
  })

  it.each(CASES)('%s %s', async (format, orientation, w, h) => {
    const sheet = buildPlanSheet({
      build: room,
      title: 'Sala',
      subtitle: 'CASA',
      format,
      orientation,
      brand: { name: 'Estúdio Teste', lines: ['CAU A12345-6'] },
      legend: [{ label: '1', text: 'Sofá', qty: '1 un' }],
    })
    const svg = toMarkup(
      primitivesToSvg(sheet.primitives, { widthMm: w, heightMm: h, background: '#fff' }),
    )
    const doc = await svgPagesToPdf([{ svgMarkup: svg, widthMm: w, heightMm: h }], fonts, {
      compress: false,
    })
    const page = readFirstPage(new Uint8Array(doc.output('arraybuffer')))
    expect(page.widthMm).toBeCloseTo(w, 2)
    expect(page.heightMm).toBeCloseTo(h, 2)
    // A parede de 4 m está no PDF com 4000 / escala mm (ex.: 1:20 → 200 mm).
    const vista = sheet.primitives.find((p) => p.kind === 'group' && p.role === 'vista')!
    const wall = [...walk([vista])].find(
      (p) => p.kind === 'line' && p.stroke.width === PEN.extraThick,
    )
    if (wall?.kind !== 'line') throw new Error('parede')
    expect(wall.b.x - wall.a.x).toBeCloseTo(4000 / sheet.scale, 6)
    const segs = extractSegments(page.content, page.heightMm)
    expect(findSegment(segs, [wall.a.x, wall.a.y], [wall.b.x, wall.b.y])).toBeDefined()
  })
})

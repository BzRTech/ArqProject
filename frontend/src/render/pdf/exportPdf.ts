import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'

export interface EmbeddedFont {
  family: string
  style: 'normal' | 'bold'
  fileName: string
  /** Conteúdo do .ttf em base64. */
  base64: string
}

export interface PdfPage {
  /** SVG em mm de papel (ver render/svg/primitivesToSvg). */
  svgMarkup: string
  widthMm: number
  heightMm: number
}

/**
 * Converte páginas SVG em um PDF vetorial (unidade mm) com fontes TrueType embutidas.
 * Decisão registrada em docs/adr/001-pdf.md.
 */
export async function svgPagesToPdf(
  pages: PdfPage[],
  fonts: EmbeddedFont[],
  options: { compress?: boolean } = {},
): Promise<jsPDF> {
  const first = pages[0]
  if (!first) throw new Error('Nenhuma página para exportar')
  const orient = (p: PdfPage) => (p.widthMm >= p.heightMm ? 'landscape' : 'portrait')
  const doc = new jsPDF({
    orientation: orient(first),
    unit: 'mm',
    format: [first.widthMm, first.heightMm],
    compress: options.compress ?? true,
  })
  for (const font of fonts) {
    doc.addFileToVFS(font.fileName, font.base64)
    doc.addFont(font.fileName, font.family, font.style)
  }
  for (const [i, page] of pages.entries()) {
    if (i > 0) doc.addPage([page.widthMm, page.heightMm], orient(page))
    const svgEl = new DOMParser().parseFromString(page.svgMarkup, 'image/svg+xml').documentElement
    await svg2pdf(svgEl as unknown as Element, doc, {
      x: 0,
      y: 0,
      width: page.widthMm,
      height: page.heightMm,
    })
  }
  return doc
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

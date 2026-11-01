import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import { A3_LANDSCAPE } from './sheet'

export interface EmbeddedFont {
  family: string
  style: 'normal' | 'bold'
  fileName: string
  /** Conteúdo do .ttf em base64. */
  base64: string
}

/**
 * Converte o SVG da folha em um PDF A3 vetorial (unidade mm), com fontes TTF
 * embutidas. O SVG precisa estar em mm de papel (ver `buildSheetSvg`).
 */
export async function svgToPdf(
  svgMarkup: string,
  fonts: EmbeddedFont[],
  options: { compress?: boolean } = {},
): Promise<jsPDF> {
  const { widthMm, heightMm } = A3_LANDSCAPE
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: options.compress ?? true,
  })
  for (const font of fonts) {
    doc.addFileToVFS(font.fileName, font.base64)
    doc.addFont(font.fileName, font.family, font.style)
  }
  const svgEl = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').documentElement
  await svg2pdf(svgEl as unknown as Element, doc, { x: 0, y: 0, width: widthMm, height: heightMm })
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

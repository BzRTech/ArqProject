/** Formatos de folha ISO 216 (mm). */
export type PaperFormat = 'A4' | 'A3' | 'A2' | 'A1'
export type Orientation = 'landscape' | 'portrait'

const ISO: Record<PaperFormat, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
}

export interface PaperSize {
  format: PaperFormat
  orientation: Orientation
  widthMm: number
  heightMm: number
}

export function paperSize(format: PaperFormat, orientation: Orientation = 'landscape'): PaperSize {
  const [short, long] = ISO[format]
  return orientation === 'landscape'
    ? { format, orientation, widthMm: long, heightMm: short }
    : { format, orientation, widthMm: short, heightMm: long }
}

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

/** Margens NBR 10068: 25 mm à esquerda (encadernação); 10 mm (A0/A1) ou 7 mm (A2–A4) nas demais. */
export function nbrMargins(format: PaperFormat): Margins {
  const m = format === 'A1' ? 10 : 7
  return { top: m, right: m, bottom: m, left: 25 }
}

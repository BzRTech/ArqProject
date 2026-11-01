import type { Stroke } from './primitives'

/** Penas usuais (mm de papel), série ISO 128 / NBR 8403. */
export const PEN = {
  extraFine: 0.13,
  fine: 0.18,
  thin: 0.25,
  medium: 0.35,
  thick: 0.5,
  extraThick: 0.7,
} as const

export type LineType = 'continuous' | 'dashed' | 'hidden' | 'dotted' | 'dashdot'

export const LINE_TYPE_LABEL: Record<LineType, string> = {
  continuous: 'Contínuo',
  dashed: 'Tracejado',
  hidden: 'Oculto',
  dotted: 'Pontilhado',
  dashdot: 'Traço-ponto (eixo)',
}

/** Padrões de traço em mm de papel. Comprimento ~0 + ponta redonda = ponto. */
const DASH: Record<LineType, { dash: number[] | null; cap: Stroke['cap'] }> = {
  continuous: { dash: null, cap: 'butt' },
  dashed: { dash: [3, 1.5], cap: 'butt' },
  hidden: { dash: [1.5, 1], cap: 'butt' },
  dotted: { dash: [0.01, 0.8], cap: 'round' },
  dashdot: { dash: [6, 1.2, 0.01, 1.2], cap: 'round' },
}

export interface StrokeStyle {
  color?: string
  /** mm de papel */
  weight?: number
  lineType?: LineType
}

export interface FillStyle {
  color: string
  opacity?: number
}

export const DEFAULT_STROKE: Required<StrokeStyle> = {
  color: '#000000',
  weight: PEN.thin,
  lineType: 'continuous',
}

export function resolveStroke(style: StrokeStyle | undefined): Stroke {
  const s = { ...DEFAULT_STROKE, ...style }
  const { dash, cap } = DASH[s.lineType]
  return { color: s.color, width: s.weight, dash: dash ? [...dash] : null, cap }
}

import { entitiesBBox } from '../drawing/bounds'
import { compileView, PAPER_VIEW } from '../drawing/compile'
import type { Entity } from '../drawing/entities'
import type { Primitive } from '../drawing/primitives'
import { PEN } from '../drawing/styles'
import { expand, height, isEmpty, width } from '../geometry/bbox'
import { vec } from '../geometry/vec'
import { STANDARD_SCALES } from './fit'
import { graphicScale } from './graphic-scale'
import { nbrMargins, paperSize, type PaperFormat } from './paper'

export interface PlanSheetInput {
  /** Entidades do modelo; serão escaladas para caber. */
  build: (scale: number) => Entity[]
  title: string
  subtitle: string
  format?: PaperFormat
  /** Força uma escala; senão escolhe a maior que couber. */
  scale?: number
  /** Texto de data já formatado (o núcleo não lê relógio). */
  dateText?: string
}

export interface PlanSheet {
  widthMm: number
  heightMm: number
  scale: number
  primitives: Primitive[]
}

const STAMP_H = 30
const HEADER_H = 14

/** Prancha simples: moldura, título, desenho centralizado em escala, escala gráfica e carimbo. */
export function buildPlanSheet(input: PlanSheetInput): PlanSheet {
  const paper = paperSize(input.format ?? 'A3', 'landscape')
  const m = nbrMargins(paper.format)
  const frame = {
    x: m.left,
    y: m.top,
    w: paper.widthMm - m.left - m.right,
    h: paper.heightMm - m.top - m.bottom,
  }
  // Área útil do desenho. A caixa do desenho já inclui as cotas; a folga é só respiro.
  const pad = 8
  const area = {
    x: frame.x + pad,
    y: frame.y + HEADER_H + pad,
    w: frame.w - 2 * pad,
    h: frame.h - HEADER_H - STAMP_H - 2 * pad,
  }

  // Testa cada escala com o desenho montado nela (afastamentos de cota dependem da escala).
  const fits = (sc: number) => {
    const b = entitiesBBox(input.build(sc), sc)
    return isEmpty(b) || (width(b) / sc <= area.w && height(b) / sc <= area.h)
  }
  const scale =
    input.scale ??
    [...STANDARD_SCALES].sort((a, b) => a - b).find(fits) ??
    Math.max(...STANDARD_SCALES)
  const entities = input.build(scale)
  const bbox = entitiesBBox(entities, scale)
  const bb = isEmpty(bbox) ? { minX: 0, minY: 0, maxX: 0, maxY: 0 } : expand(bbox, 0)
  const origin = vec(
    area.x + (area.w - width(bb) / scale) / 2 - bb.minX / scale,
    area.y + (area.h - height(bb) / scale) / 2 - bb.minY / scale,
  )

  const sx = frame.x + frame.w - 170
  const sy = frame.y + frame.h - STAMP_H
  const t = (x: number, y: number, text: string, size: number, bold = false): Entity => ({
    kind: 'text',
    at: vec(x, y),
    text,
    size,
    weight: bold ? 'bold' : 'normal',
  })
  const paperEntities: Entity[] = [
    {
      kind: 'rect',
      x: frame.x,
      y: frame.y,
      width: frame.w,
      height: frame.h,
      style: { weight: PEN.thick },
    },
    t(frame.x + 7, frame.y + 10, input.title.toUpperCase(), 4.5, true),
    {
      kind: 'line',
      a: vec(frame.x + 7, frame.y + 13),
      b: vec(frame.x + frame.w - 7, frame.y + 13),
      style: { weight: PEN.medium },
    },
    { kind: 'rect', x: sx, y: sy, width: 170, height: STAMP_H, style: { weight: PEN.medium } },
    {
      kind: 'line',
      a: vec(sx + 120, sy),
      b: vec(sx + 120, sy + STAMP_H),
      style: { weight: PEN.fine },
    },
    t(sx + 3, sy + 6, input.subtitle, 2.2, true),
    t(sx + 3, sy + 13, input.title, 3.5, true),
    t(sx + 3, sy + 20, 'Medidas em centímetros.', 2),
    t(sx + 3, sy + 25, 'As medidas devem ser conferidas no local.', 2),
    t(sx + 123, sy + 6, 'ESCALA', 2),
    t(sx + 123, sy + 13, `1:${scale}`, 4, true),
    t(sx + 123, sy + 20, `FOLHA ${paper.format}`, 2),
    ...(input.dateText ? [t(sx + 123, sy + 25, input.dateText, 2)] : []),
  ]

  const meters = Math.max(1, Math.min(5, Math.floor((90 * scale) / 1000)))
  return {
    widthMm: paper.widthMm,
    heightMm: paper.heightMm,
    scale,
    primitives: [
      ...compileView(paperEntities, PAPER_VIEW),
      { kind: 'group', role: 'vista', children: compileView(entities, { scale, origin }) },
      graphicScale({ at: vec(frame.x + 7, sy + 14), scale, meters }),
    ],
  }
}

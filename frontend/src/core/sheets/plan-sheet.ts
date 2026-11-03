import { entitiesBBox } from '../drawing/bounds'
import { compileView, PAPER_VIEW } from '../drawing/compile'
import type { Entity } from '../drawing/entities'
import type { Primitive } from '../drawing/primitives'
import { PEN } from '../drawing/styles'
import { expand, height, isEmpty, width } from '../geometry/bbox'
import { textWidth } from '../drawing/text-metrics'
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
  /** Linhas da legenda (marcador, descrição, quantidade já formatada). */
  legend?: LegendLine[]
  /** Título da coluna (padrão "LEGENDA"; detalhe de marcenaria usa "ESPECIFICAÇÕES"). */
  legendTitle?: string
  /** Escalas candidatas (padrão: as da planta). */
  scales?: readonly number[]
}

export interface LegendLine {
  label: string
  text: string
  qty: string
  /** Segunda linha, menor (ex.: acabamento da marcenaria). */
  detail?: string
}

const LEGEND_W = 82
const LEGEND_ROW = 5.6
/** Corpo do texto da legenda e do detalhe (mm de papel). */
const MAIN_SIZE = 2.2
const DETAIL_SIZE = 1.7
/** Entrelinhas: texto principal quebrado, 1ª linha de detalhe, demais linhas de detalhe. */
const MAIN_LINE = 3
const LEGEND_DETAIL = 3.2
const DETAIL_LINE = 2.6

/** Quebra o texto em linhas que caibam em `maxW` (mm de papel), por palavras. */
export function wrapText(text: string, size: number, maxW: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && textWidth(next, size) > maxW) {
      out.push(cur)
      cur = word
    } else cur = next
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

interface LegendRow {
  line: LegendLine
  main: string[]
  detail: string[]
  h: number
}

function layoutRow(l: LegendLine): LegendRow {
  const qtyW = l.qty ? textWidth(l.qty, MAIN_SIZE) + 3 : 0
  const main = wrapText(l.text, MAIN_SIZE, LEGEND_W - 10 - qtyW)
  const detail = l.detail ? wrapText(l.detail, DETAIL_SIZE, LEGEND_W - 10) : []
  const h =
    LEGEND_ROW +
    (main.length - 1) * MAIN_LINE +
    (detail.length ? LEGEND_DETAIL + (detail.length - 1) * DETAIL_LINE : 0)
  return { line: l, main, detail, h }
}

/** Coluna da legenda: título, balões (círculo ou etiqueta de marcenaria), descrição e qtd. */
function legendEntities(
  lines: LegendLine[],
  x: number,
  y: number,
  maxH: number,
  title = 'LEGENDA',
): Entity[] {
  const out: Entity[] = [
    { kind: 'text', at: vec(x, y + 3), text: title, size: 2.6, weight: 'bold' },
    {
      kind: 'line',
      a: vec(x, y + 4.6),
      b: vec(x + LEGEND_W, y + 4.6),
      style: { weight: PEN.fine },
    },
  ]
  const rows = lines.map(layoutRow)
  // Quantas linhas cabem (as quebradas ocupam mais); sobrando, a última vira "… e mais".
  const fits = (n: number) =>
    rows.slice(0, n).reduce((h, r) => h + r.h, 0) <= maxH - 8 - (n < rows.length ? LEGEND_ROW : 0)
  let count = rows.length
  while (count > 1 && !fits(count)) count--
  const shown = rows.slice(0, count)
  let rowY = y + 9
  shown.forEach((r) => {
    const l = r.line
    const cy = rowY
    rowY += r.h
    const cx = x + 4
    // Marcenaria (M01) e revestimentos (P1) em etiqueta; móveis e especificações em círculo.
    if (/^[MP]\d/.test(l.label)) {
      out.push({
        kind: 'rect',
        x: cx - 4,
        y: cy - 2.1,
        width: 8,
        height: 4.2,
        style: { weight: PEN.fine },
      })
    } else {
      out.push({ kind: 'circle', center: vec(cx, cy), radius: 2.4, style: { weight: PEN.fine } })
    }
    out.push({
      kind: 'text',
      at: vec(cx, cy),
      text: l.label,
      size: 1.9,
      anchor: 'middle',
      vAlign: 'middle',
      weight: 'bold',
    })
    r.main.forEach((text, i) =>
      out.push({
        kind: 'text',
        at: vec(x + 10, cy + i * MAIN_LINE),
        text,
        size: MAIN_SIZE,
        vAlign: 'middle',
      }),
    )
    const dy = cy + (r.main.length - 1) * MAIN_LINE + LEGEND_DETAIL
    r.detail.forEach((text, i) =>
      out.push({
        kind: 'text',
        at: vec(x + 10, dy + i * DETAIL_LINE),
        text,
        size: DETAIL_SIZE,
        vAlign: 'middle',
        color: '#4a4741',
      }),
    )
    if (l.qty)
      out.push({
        kind: 'text',
        at: vec(x + LEGEND_W, cy),
        text: l.qty,
        size: MAIN_SIZE,
        anchor: 'end',
        vAlign: 'middle',
      })
  })
  if (shown.length < rows.length) {
    out.push({
      kind: 'text',
      at: vec(x + 10, rowY),
      text: `… e mais ${rows.length - shown.length} item(ns) — ver memorial`,
      size: 2,
      vAlign: 'middle',
      color: '#59626d',
    })
  }
  return out
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
  const hasLegend = !!input.legend?.length
  const area = {
    x: frame.x + pad,
    y: frame.y + HEADER_H + pad,
    w: frame.w - 2 * pad - (hasLegend ? LEGEND_W + 10 : 0),
    h: frame.h - HEADER_H - STAMP_H - 2 * pad,
  }

  // Testa cada escala com o desenho montado nela (afastamentos de cota dependem da escala).
  const fits = (sc: number) => {
    const b = entitiesBBox(input.build(sc), sc)
    return isEmpty(b) || (width(b) / sc <= area.w && height(b) / sc <= area.h)
  }
  const scale =
    input.scale ??
    [...(input.scales ?? STANDARD_SCALES)].sort((a, b) => a - b).find(fits) ??
    Math.max(...(input.scales ?? STANDARD_SCALES))
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
      ...(hasLegend
        ? [
            {
              kind: 'group' as const,
              role: 'legenda',
              children: compileView(
                legendEntities(
                  input.legend!,
                  frame.x + frame.w - 7 - LEGEND_W,
                  frame.y + HEADER_H + 4,
                  sy - (frame.y + HEADER_H + 4) - 6,
                  input.legendTitle,
                ),
                PAPER_VIEW,
              ),
            },
          ]
        : []),
    ],
  }
}

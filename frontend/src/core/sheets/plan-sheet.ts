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
import { nbrMargins, paperSize, type Orientation, type PaperFormat } from './paper'

export interface PlanSheetInput {
  /** Entidades do modelo; serão escaladas para caber. */
  build: (scale: number) => Entity[]
  title: string
  subtitle: string
  format?: PaperFormat
  orientation?: Orientation
  /** Margem (mm) em cima, à direita e embaixo; a esquerda é sempre 25 mm (NBR 10068). */
  marginMm?: number
  /** Marca do escritório no carimbo ("Minha marca"). */
  brand?: SheetBrand
  /** Notas do carimbo (do modelo de folha). */
  notes?: string[]
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
  /** Captura sem escala, ajustada à área da vista preservando a proporção. */
  image?: { href: string; aspect: number }
}

export interface SheetBrand {
  name: string
  /** Contato e registro (telefone, e-mail, site, CAU…), uma linha cada. */
  lines: string[]
  /** Logo já carregado (data URL) e a proporção largura/altura. */
  logo?: { href: string; aspect: number }
}

/** Notas quando o modelo de folha não traz as dele. */
export const DEFAULT_SHEET_NOTES = [
  'Medidas em centímetros, salvo indicação.',
  'As medidas devem ser conferidas no local.',
]

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

function layoutRow(l: LegendLine, w: number): LegendRow {
  const qtyW = l.qty ? textWidth(l.qty, MAIN_SIZE) + 3 : 0
  const main = wrapText(l.text, MAIN_SIZE, w - 10 - qtyW)
  const detail = l.detail ? wrapText(l.detail, DETAIL_SIZE, w - 10) : []
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
  w = LEGEND_W,
): Entity[] {
  const out: Entity[] = [
    { kind: 'text', at: vec(x, y + 3), text: title, size: 2.6, weight: 'bold' },
    {
      kind: 'line',
      a: vec(x, y + 4.6),
      b: vec(x + w, y + 4.6),
      style: { weight: PEN.fine },
    },
  ]
  const rows = lines.map((l) => layoutRow(l, w))
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
        at: vec(x + w, cy),
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

const STAMP_H = 32
const HEADER_H = 14
/** Largura mínima do desenho para a legenda ir ao lado (senão vai embaixo). */
const MIN_DRAWING_W = 150

/** Altura que a legenda ocuparia (para a faixa de baixo nas folhas estreitas). */
function legendHeight(lines: LegendLine[], w: number): number {
  return 10 + lines.map((l) => layoutRow(l, w)).reduce((h, r) => h + r.h, 0)
}

/** Carimbo: marca do escritório | projeto, título e notas | escala, folha e data. */
function stampEntities(
  input: PlanSheetInput,
  box: { x: number; y: number; w: number; h: number },
  scale: number,
  format: PaperFormat,
): Entity[] {
  const t = (
    x: number,
    y: number,
    text: string,
    size: number,
    bold = false,
    color?: string,
  ): Entity => ({
    kind: 'text',
    at: vec(x, y),
    text,
    size,
    weight: bold ? 'bold' : 'normal',
    ...(color ? { color } : {}),
  })
  const brand = input.brand
  const brandW = brand ? Math.min(62, box.w * 0.34) : 0
  const scaleW = 36
  const projX = box.x + brandW
  const projW = box.w - brandW - scaleW
  const scaleX = box.x + box.w - scaleW
  const out: Entity[] = [
    {
      kind: 'rect',
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      style: { weight: PEN.medium },
    },
    {
      kind: 'line',
      a: vec(scaleX, box.y),
      b: vec(scaleX, box.y + box.h),
      style: { weight: PEN.fine },
    },
  ]
  if (brand) {
    out.push({
      kind: 'line',
      a: vec(projX, box.y),
      b: vec(projX, box.y + box.h),
      style: { weight: PEN.fine },
    })
    let y = box.y + 3
    if (brand.logo && brand.logo.aspect > 0) {
      const maxW = brandW - 6
      const h = Math.min(11, maxW / brand.logo.aspect)
      out.push({
        kind: 'image',
        x: box.x + 3,
        y,
        width: h * brand.logo.aspect,
        height: h,
        href: brand.logo.href,
      })
      y += h + 3.2
    } else y += 3
    out.push(t(box.x + 3, y, brand.name, 2.6, true))
    y += 3.4
    const room = Math.max(0, Math.floor((box.y + box.h - 1.5 - y) / 2.4))
    for (const line of brand.lines.slice(0, room)) {
      out.push(t(box.x + 3, y, line, 1.7, false, '#4a4741'))
      y += 2.4
    }
  }
  out.push(t(projX + 3, box.y + 6, input.subtitle, 2.2, true))
  const title = wrapText(input.title, 3.5, projW - 6)[0]!
  out.push(t(projX + 3, box.y + 13, title, 3.5, true))
  let ny = box.y + 19.5
  for (const note of input.notes ?? DEFAULT_SHEET_NOTES)
    for (const line of wrapText(note, 1.9, projW - 6)) {
      if (ny > box.y + box.h - 1.5) break
      out.push(t(projX + 3, ny, line, 1.9))
      ny += 2.7
    }
  out.push(t(scaleX + 3, box.y + 6, 'ESCALA', 2))
  out.push(
    t(
      scaleX + 3,
      box.y + 13,
      input.image ? 'SEM ESCALA' : `1:${scale}`,
      input.image ? 2.7 : 4,
      true,
    ),
  )
  out.push(t(scaleX + 3, box.y + 20, `FOLHA ${format}`, 2))
  if (input.dateText) out.push(t(scaleX + 3, box.y + 25, input.dateText, 2))
  return out
}

/**
 * Prancha: moldura, título, desenho centralizado em escala, escala gráfica, legenda (ao lado
 * ou, em folha estreita, embaixo) e carimbo com a marca do escritório. A4 a A1, paisagem ou
 * retrato. Tudo em mm de papel.
 */
export function buildPlanSheet(input: PlanSheetInput): PlanSheet {
  const paper = paperSize(input.format ?? 'A3', input.orientation ?? 'landscape')
  const nbr = nbrMargins(paper.format)
  const mg = input.marginMm ?? nbr.top
  const m = { top: mg, right: mg, bottom: mg, left: nbr.left }
  const frame = {
    x: m.left,
    y: m.top,
    w: paper.widthMm - m.left - m.right,
    h: paper.heightMm - m.top - m.bottom,
  }
  const stampW = Math.min(190, frame.w)
  const sx = frame.x + frame.w - stampW
  const sy = frame.y + frame.h - STAMP_H
  // Escala gráfica ao lado do carimbo, se couber; senão logo acima dele.
  const scaleBeside = sx - frame.x >= 105
  const scaleBandH = input.image || scaleBeside ? 0 : 12

  const pad = 8
  const lines = input.legend ?? []
  const hasLegend = lines.length > 0
  const side = hasLegend && frame.w - 2 * pad - (LEGEND_W + 10) >= MIN_DRAWING_W
  const bottomW = frame.w - 14
  const bandH = hasLegend && !side ? Math.min(legendHeight(lines, bottomW), frame.h * 0.32) : 0
  const area = {
    x: frame.x + pad,
    y: frame.y + HEADER_H + pad,
    w: frame.w - 2 * pad - (side ? LEGEND_W + 10 : 0),
    h: sy - scaleBandH - (bandH ? bandH + 4 : 0) - pad - (frame.y + HEADER_H + pad),
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
  if (input.image) {
    const aspect = Math.max(0.001, input.image.aspect)
    const w = Math.min(area.w, area.h * aspect)
    const h = w / aspect
    entities.push({
      kind: 'image',
      href: input.image.href,
      x: (area.w - w) / 2,
      y: (area.h - h) / 2,
      width: w,
      height: h,
    })
  }
  const bbox = entitiesBBox(entities, scale)
  const bb = isEmpty(bbox) ? { minX: 0, minY: 0, maxX: 0, maxY: 0 } : expand(bbox, 0)
  const origin = vec(
    area.x + (area.w - width(bb) / scale) / 2 - bb.minX / scale,
    area.y + (area.h - height(bb) / scale) / 2 - bb.minY / scale,
  )

  const paperEntities: Entity[] = [
    {
      kind: 'rect',
      x: frame.x,
      y: frame.y,
      width: frame.w,
      height: frame.h,
      style: { weight: PEN.thick },
    },
    {
      kind: 'text',
      at: vec(frame.x + 7, frame.y + 10),
      text: input.title.toUpperCase(),
      size: 4.5,
      weight: 'bold',
    },
    {
      kind: 'line',
      a: vec(frame.x + 7, frame.y + 13),
      b: vec(frame.x + frame.w - 7, frame.y + 13),
      style: { weight: PEN.medium },
    },
    ...stampEntities(input, { x: sx, y: sy, w: stampW, h: STAMP_H }, scale, paper.format),
  ]

  const meters = Math.max(1, Math.min(5, Math.floor((90 * scale) / 1000)))
  const legendTop = frame.y + HEADER_H + 4
  return {
    widthMm: paper.widthMm,
    heightMm: paper.heightMm,
    scale,
    primitives: [
      ...compileView(paperEntities, PAPER_VIEW),
      { kind: 'group', role: 'vista', children: compileView(entities, { scale, origin }) },
      ...(!input.image
        ? [
            graphicScale({
              at: scaleBeside ? vec(frame.x + 7, sy + 14) : vec(frame.x + 7, sy - 8),
              scale,
              meters,
            }),
          ]
        : []),
      ...(hasLegend
        ? [
            {
              kind: 'group' as const,
              role: 'legenda',
              children: compileView(
                side
                  ? legendEntities(
                      lines,
                      frame.x + frame.w - 7 - LEGEND_W,
                      legendTop,
                      sy - legendTop - 6,
                      input.legendTitle,
                    )
                  : legendEntities(
                      lines,
                      frame.x + 7,
                      sy - scaleBandH - bandH - 2,
                      bandH,
                      input.legendTitle,
                      bottomW,
                    ),
                PAPER_VIEW,
              ),
            },
          ]
        : []),
    ],
  }
}

import type { Entity, HatchPattern } from '../drawing/entities'
import { PEN, type FillStyle, type LineType, type StrokeStyle } from '../drawing/styles'
import { vec, type Vec2 } from '../geometry/vec'
import { evalNum, type Num } from './expr'

/**
 * Símbolo paramétrico de um bloco, só com DADOS (serializável em JSON → banco na Fase 3).
 *
 * Coordenadas LOCAIS em mm: origem no canto de trás à esquerda; `w` ao longo de x
 * (largura), `d` ao longo de y (profundidade, crescendo para a frente / para dentro do
 * ambiente). A parede/encosto fica em y = 0. Qualquer número pode ser uma expressão.
 */

export type PenName = keyof typeof PEN

export interface ShapeStyle {
  pen?: PenName
  lineType?: LineType
  color?: string
  fill?: string
}

export type SymbolShape =
  | ({ type: 'rect'; x: Num; y: Num; w: Num; h: Num } & ShapeStyle)
  | ({ type: 'line'; x1: Num; y1: Num; x2: Num; y2: Num } & ShapeStyle)
  | ({ type: 'polyline'; points: [Num, Num][]; closed?: boolean } & ShapeStyle)
  | ({ type: 'circle'; cx: Num; cy: Num; r: Num } & ShapeStyle)
  | ({ type: 'ellipse'; cx: Num; cy: Num; rx: Num; ry: Num } & ShapeStyle)
  | ({ type: 'arc'; cx: Num; cy: Num; r: Num; start: Num; sweep: Num } & ShapeStyle)
  | ({
      type: 'hatch'
      x: Num
      y: Num
      w: Num
      h: Num
      pattern: 'lines' | 'cross'
      angle?: Num
      /** mm de papel */
      spacing?: Num
    } & ShapeStyle)
  | { type: 'text'; x: Num; y: Num; text: string; size?: Num; anchor?: 'start' | 'middle' | 'end' }
  /** Repete `shapes` `count` vezes; dentro, `i` = índice (0…n-1) e `n` = total. */
  | { type: 'repeat'; count: Num; shapes: SymbolShape[] }

export interface BlockSymbol {
  shapes: SymbolShape[]
}

export interface SymbolParams {
  w: number
  d: number
  h?: number
}

const ELLIPSE_SEGMENTS = 48

function stroke(s: ShapeStyle): StrokeStyle {
  return {
    weight: PEN[s.pen ?? 'thin'],
    ...(s.lineType ? { lineType: s.lineType } : {}),
    ...(s.color ? { color: s.color } : {}),
  }
}

const fill = (s: ShapeStyle): FillStyle | undefined => (s.fill ? { color: s.fill } : undefined)

/** Gera as entidades do símbolo em coordenadas locais (mm). */
export function buildSymbol(symbol: BlockSymbol, params: SymbolParams): Entity[] {
  const base: Record<string, number> = { w: params.w, d: params.d, h: params.h ?? 0 }

  const build = (shapes: SymbolShape[], vars: Record<string, number>): Entity[] => {
    const n = (v: Num) => evalNum(v, vars)
    const out: Entity[] = []
    for (const s of shapes) {
      switch (s.type) {
        case 'rect':
          out.push({
            kind: 'rect',
            x: n(s.x),
            y: n(s.y),
            width: n(s.w),
            height: n(s.h),
            style: stroke(s),
            fill: fill(s),
          })
          break
        case 'line':
          out.push({
            kind: 'line',
            a: vec(n(s.x1), n(s.y1)),
            b: vec(n(s.x2), n(s.y2)),
            style: stroke(s),
          })
          break
        case 'polyline':
          out.push({
            kind: 'polyline',
            points: s.points.map(([x, y]) => vec(n(x), n(y))),
            closed: s.closed ?? false,
            style: stroke(s),
            fill: fill(s),
          })
          break
        case 'circle':
          out.push({
            kind: 'circle',
            center: vec(n(s.cx), n(s.cy)),
            radius: n(s.r),
            style: stroke(s),
            fill: fill(s),
          })
          break
        case 'ellipse': {
          const cx = n(s.cx)
          const cy = n(s.cy)
          const rx = n(s.rx)
          const ry = n(s.ry)
          const pts: Vec2[] = []
          for (let k = 0; k < ELLIPSE_SEGMENTS; k++) {
            const a = (2 * Math.PI * k) / ELLIPSE_SEGMENTS
            pts.push(vec(cx + rx * Math.cos(a), cy + ry * Math.sin(a)))
          }
          out.push({ kind: 'polyline', points: pts, closed: true, style: stroke(s), fill: fill(s) })
          break
        }
        case 'arc':
          out.push({
            kind: 'arc',
            center: vec(n(s.cx), n(s.cy)),
            radius: n(s.r),
            startDeg: n(s.start),
            sweepDeg: n(s.sweep),
            style: stroke(s),
          })
          break
        case 'hatch': {
          const x = n(s.x)
          const y = n(s.y)
          const w = n(s.w)
          const h = n(s.h)
          const pattern: HatchPattern = {
            kind: s.pattern,
            angleDeg: s.angle === undefined ? 45 : n(s.angle),
            spacing: s.spacing === undefined ? 1.5 : n(s.spacing),
          }
          out.push({
            kind: 'hatch',
            boundary: [vec(x, y), vec(x + w, y), vec(x + w, y + h), vec(x, y + h)],
            pattern,
            style: { weight: PEN[s.pen ?? 'extraFine'], ...(s.color ? { color: s.color } : {}) },
          })
          break
        }
        case 'text':
          out.push({
            kind: 'text',
            at: vec(n(s.x), n(s.y)),
            text: s.text,
            size: s.size === undefined ? 2 : n(s.size),
            anchor: s.anchor ?? 'middle',
            vAlign: 'middle',
          })
          break
        case 'repeat': {
          const count = Math.max(0, Math.round(n(s.count)))
          for (let i = 0; i < count; i++) out.push(...build(s.shapes, { ...vars, i, n: count }))
          break
        }
      }
    }
    return out
  }

  return build(symbol.shapes, base)
}

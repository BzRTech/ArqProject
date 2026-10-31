import type { Primitive, Stroke } from '@/core/drawing/primitives'
import type { SvgNode } from './svg-node'

/**
 * Converte primitivas (mm de papel) em uma árvore SVG cujo sistema de coordenadas é o
 * próprio mm de papel (`viewBox="0 0 W H"`, `width="Wmm"`). Não faz cálculo geométrico:
 * só traduz atributos.
 */

export interface SvgSheetOptions {
  widthMm: number
  heightMm: number
  fontFamily?: string
  background?: string
}

const num = (v: number): string => {
  const r = Math.round(v * 10000) / 10000
  return Object.is(r, -0) ? '0' : String(r)
}

function strokeAttrs(s: Stroke | null): Record<string, string> {
  if (!s) return { stroke: 'none' }
  const a: Record<string, string> = {
    stroke: s.color,
    'stroke-width': num(s.width),
    'stroke-linecap': s.cap,
  }
  if (s.dash) a['stroke-dasharray'] = s.dash.map(num).join(' ')
  return a
}

function toNode(p: Primitive, font: string): SvgNode {
  switch (p.kind) {
    case 'line':
      return {
        tag: 'line',
        attrs: {
          x1: num(p.a.x),
          y1: num(p.a.y),
          x2: num(p.b.x),
          y2: num(p.b.y),
          ...strokeAttrs(p.stroke),
        },
      }
    case 'polyline': {
      const fill = p.fill
        ? {
            fill: p.fill.color,
            ...(p.fill.opacity < 1 ? { 'fill-opacity': num(p.fill.opacity) } : {}),
          }
        : { fill: 'none' }
      return {
        tag: p.closed ? 'polygon' : 'polyline',
        attrs: {
          points: p.points.map((q) => `${num(q.x)},${num(q.y)}`).join(' '),
          ...fill,
          ...strokeAttrs(p.stroke),
        },
      }
    }
    case 'circle': {
      const fill = p.fill
        ? {
            fill: p.fill.color,
            ...(p.fill.opacity < 1 ? { 'fill-opacity': num(p.fill.opacity) } : {}),
          }
        : { fill: 'none' }
      return {
        tag: 'circle',
        attrs: {
          cx: num(p.center.x),
          cy: num(p.center.y),
          r: num(p.r),
          ...fill,
          ...strokeAttrs(p.stroke),
        },
      }
    }
    case 'arc':
      return {
        tag: 'path',
        attrs: {
          d: `M ${num(p.from.x)} ${num(p.from.y)} A ${num(p.r)} ${num(p.r)} 0 ${p.largeArc ? 1 : 0} ${p.clockwise ? 1 : 0} ${num(p.to.x)} ${num(p.to.y)}`,
          fill: 'none',
          ...strokeAttrs(p.stroke),
        },
      }
    case 'text': {
      const attrs: Record<string, string> = {
        x: num(p.at.x),
        y: num(p.at.y),
        'font-family': font,
        'font-size': num(p.size),
        'font-weight': p.weight,
        'text-anchor': p.anchor,
        fill: p.color,
      }
      if (p.rotationDeg !== 0) {
        attrs.transform = `rotate(${num(p.rotationDeg)} ${num(p.at.x)} ${num(p.at.y)})`
      }
      return { tag: 'text', attrs, text: p.text }
    }
    case 'image':
      return {
        tag: 'image',
        attrs: {
          x: num(p.x),
          y: num(p.y),
          width: num(p.width),
          height: num(p.height),
          href: p.href,
          preserveAspectRatio: 'none',
          ...(p.opacity < 1 ? { opacity: num(p.opacity) } : {}),
        },
      }
    case 'group':
      return {
        tag: 'g',
        attrs: { 'data-role': p.role },
        children: p.children.map((c) => toNode(c, font)),
      }
  }
}

export function primitivesToSvg(prims: readonly Primitive[], o: SvgSheetOptions): SvgNode {
  const font = o.fontFamily ?? 'Roboto'
  const children: SvgNode[] = []
  if (o.background) {
    children.push({
      tag: 'rect',
      attrs: { x: 0, y: 0, width: num(o.widthMm), height: num(o.heightMm), fill: o.background },
    })
  }
  children.push(...prims.map((p) => toNode(p, font)))
  return {
    tag: 'svg',
    attrs: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: `${num(o.widthMm)}mm`,
      height: `${num(o.heightMm)}mm`,
      viewBox: `0 0 ${num(o.widthMm)} ${num(o.heightMm)}`,
    },
    children,
  }
}

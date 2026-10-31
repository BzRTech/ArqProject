import type { Primitive, Stroke } from '../drawing/primitives'
import { PEN } from '../drawing/styles'
import type { Vec2 } from '../geometry/vec'
import { formatDecimal, modelToPaper } from '../units'

export interface GraphicScaleOptions {
  /** Canto superior esquerdo da barra, mm de papel. */
  at: Vec2
  scale: number
  /** Comprimento total representado, em metros. */
  meters: number
  /** Tamanho de cada bloco, em metros (padrão 1). */
  step?: number
  barHeight?: number
  textSize?: number
}

/**
 * Escala gráfica em mm de papel. Também serve de régua de conferência da impressão:
 * a barra inteira mede `meters × 1000 / scale` mm.
 */
export function graphicScale(o: GraphicScaleOptions): Primitive {
  const step = o.step ?? 1
  const h = o.barHeight ?? 1.5
  const size = o.textSize ?? 2
  const seg = modelToPaper(step * 1000, o.scale)
  const count = Math.round(o.meters / step)
  const stroke: Stroke = { color: '#000000', width: PEN.fine, dash: null, cap: 'butt' }
  const children: Primitive[] = []
  const label = (x: number, m: number, unit = false) =>
    children.push({
      kind: 'text',
      at: { x, y: o.at.y + h + size + 0.8 },
      text: `${formatDecimal(m, Number.isInteger(m) ? 0 : 1)}${unit ? ' m' : ''}`,
      size,
      anchor: 'middle',
      rotationDeg: 0,
      weight: 'normal',
      color: '#000000',
    })
  for (let i = 0; i < count; i++) {
    const x = o.at.x + i * seg
    children.push({
      kind: 'polyline',
      points: [
        { x, y: o.at.y },
        { x: x + seg, y: o.at.y },
        { x: x + seg, y: o.at.y + h },
        { x, y: o.at.y + h },
      ],
      closed: true,
      stroke,
      fill: { color: i % 2 === 0 ? '#000000' : '#ffffff', opacity: 1 },
    })
    label(x, i * step)
  }
  label(o.at.x + count * seg, count * step, true)
  children.push({
    kind: 'text',
    at: { x: o.at.x, y: o.at.y - 1.2 },
    text: `ESCALA 1:${o.scale}`,
    size,
    anchor: 'start',
    rotationDeg: 0,
    weight: 'bold',
    color: '#000000',
  })
  return { kind: 'group', role: 'graphic-scale', children }
}

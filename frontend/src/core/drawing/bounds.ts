import { bboxOf, EMPTY_BBOX, union, type BBox } from '../geometry/bbox'
import { dimensionDirection } from '../dimensions/layout'
import { DEFAULT_DIM_STYLE } from '../dimensions/style'
import { add, leftNormal, polar, scale, sub, vec, type Vec2 } from '../geometry/vec'
import type { Entity } from './entities'

/** Pontos extremos de um arco (extremidades + direções cardeais dentro da varredura). */
export function arcExtremePoints(
  center: Vec2,
  r: number,
  startDeg: number,
  sweepDeg: number,
): Vec2[] {
  const pts = [polar(center, r, startDeg), polar(center, r, startDeg + sweepDeg)]
  const lo = Math.min(startDeg, startDeg + sweepDeg)
  const hi = Math.max(startDeg, startDeg + sweepDeg)
  for (let k = Math.ceil(lo / 90); k * 90 <= hi; k++) pts.push(polar(center, r, k * 90))
  return pts
}

/** Pontos das linhas de cota (afastadas do objeto), incluindo a linha de total e o texto. */
function dimensionReach(
  points: Vec2[],
  orientation: 'aligned' | 'horizontal' | 'vertical',
  offsetPaper: number,
  rows: number,
  paperScale: number,
): Vec2[] {
  const first = points[0]!
  const last = points[points.length - 1]!
  const dir = dimensionDirection(first, last, orientation)
  const n = leftNormal(dir)
  const st = DEFAULT_DIM_STYLE
  const sign = Math.sign(offsetPaper) || 1
  const reach =
    (offsetPaper + sign * ((rows - 1) * st.rowGap + st.textGap + st.textSize)) * paperScale
  return points.map((p) => add(first, add(scale(n, reach), sub(p, first))))
}

/**
 * Caixa envolvente de entidades no espaço do modelo (textos contam só o ponto de inserção).
 * Com `paperScale`, inclui também as linhas de cota (cujo afastamento é em mm de papel).
 */
export function entitiesBBox(entities: readonly Entity[], paperScale?: number): BBox {
  let b: BBox = EMPTY_BBOX
  const add = (pts: Vec2[]) => {
    if (pts.length) b = union(b, bboxOf(pts))
  }
  for (const e of entities) {
    switch (e.kind) {
      case 'line':
        add([e.a, e.b])
        break
      case 'polyline':
        add(e.points)
        break
      case 'rect':
        add([vec(e.x, e.y), vec(e.x + e.width, e.y + e.height)])
        break
      case 'circle':
        add([
          vec(e.center.x - e.radius, e.center.y - e.radius),
          vec(e.center.x + e.radius, e.center.y + e.radius),
        ])
        break
      case 'arc':
        add(arcExtremePoints(e.center, e.radius, e.startDeg, e.sweepDeg))
        break
      case 'text':
        add([e.at])
        break
      case 'hatch':
        add(e.boundary)
        break
      case 'image':
        add([vec(e.x, e.y), vec(e.x + e.width, e.y + e.height)])
        break
      case 'dimension':
        add([e.p1, e.p2])
        if (paperScale)
          add(dimensionReach([e.p1, e.p2], e.orientation ?? 'aligned', e.offset, 1, paperScale))
        break
      case 'chain':
        add(e.points)
        if (paperScale && e.points.length >= 2) {
          add(
            dimensionReach(
              e.points,
              e.orientation ?? 'aligned',
              e.offset,
              e.total && e.points.length > 2 ? 2 : 1,
              paperScale,
            ),
          )
        }
        break
      case 'group':
        b = union(b, entitiesBBox(e.children, paperScale))
        break
    }
  }
  return b
}

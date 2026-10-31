import { bboxOf, EMPTY_BBOX, union, type BBox } from '../geometry/bbox'
import { polar, vec, type Vec2 } from '../geometry/vec'
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

/** Caixa envolvente de entidades no espaço do modelo (textos contam só o ponto de inserção). */
export function entitiesBBox(entities: readonly Entity[]): BBox {
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
        break
      case 'chain':
        add(e.points)
        break
      case 'group':
        b = union(b, entitiesBBox(e.children))
        break
    }
  }
  return b
}

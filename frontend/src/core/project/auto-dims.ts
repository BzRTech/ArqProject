import { dimensionDirection } from '../dimensions/layout'
import { signedArea } from '../geometry/polygon'
import { add, cross, dot, leftNormal, scale, sub, type Vec2 } from '../geometry/vec'
import { roundMm } from '../units'
import { openingFrame } from './openings'
import type { ChainDrawing, Opening, Wall } from './schema'
import { wallPoints, wallSegments, type WallSegment } from './walls'

/** Afastamento padrão da cota em relação à face externa, mm do modelo. */
export const AUTO_DIM_OFFSET = 400

function intersect(p: Vec2, r: Vec2, q: Vec2, s: Vec2): Vec2 | null {
  const d = cross(r, s)
  if (Math.abs(d) < 1e-9) return null
  return add(p, scale(r, cross(sub(q, p), s) / d))
}

/**
 * Cotas em cadeia de cada trecho da parede, pela FACE EXTERNA, com os vãos de portas e
 * janelas. Parede fechada: "externa" é o lado de fora do ambiente. Parede aberta: esquerda
 * do sentido de desenho (o usuário pode trocar o lado da cota depois).
 */
export function wallChainDimensions(
  wall: Wall,
  openings: readonly Opening[],
  offset = AUTO_DIM_OFFSET,
): Omit<ChainDrawing, 'id' | 'kind'>[] {
  const segs = wallSegments(wall)
  if (!segs.length) return []
  const pts = wallPoints(wall)
  // Com y para baixo, área positiva = sentido horário visual → a esquerda aponta para fora.
  const outSign = wall.closed && signedArea(pts) < 0 ? -1 : 1
  const h = wall.thicknessMm / 2
  const nOut = (s: WallSegment) => scale(leftNormal(s.dir), outSign)
  const faceLine = (s: WallSegment) => ({ p: add(s.a, scale(nOut(s), h)), r: s.dir })

  return segs.map((s, k) => {
    const line = faceLine(s)
    const prev = wall.closed ? segs[(k - 1 + segs.length) % segs.length] : segs[k - 1]
    const next = wall.closed ? segs[(k + 1) % segs.length] : segs[k + 1]
    const start = (prev && intersect(faceLine(prev).p, faceLine(prev).r, line.p, line.r)) || line.p
    const end =
      (next && intersect(line.p, line.r, faceLine(next).p, faceLine(next).r)) ||
      add(line.p, scale(s.dir, s.length))

    const onFace = (p: Vec2) => add(p, scale(nOut(s), h))
    const jambs = openings
      .filter((o) => o.wallId === wall.id && o.segment === s.index)
      .flatMap((o) => {
        const f = openingFrame(wall, o)
        return f ? [onFace(f.a), onFace(f.b)] : []
      })
    const points = [start, ...jambs, end]
      .map((p) => ({ x: roundMm(p.x), y: roundMm(p.y) }))
      .sort((p, q) => dot(sub(p, start), s.dir) - dot(sub(q, start), s.dir))

    const orientation =
      Math.abs(s.dir.y) < 1e-9 ? 'horizontal' : Math.abs(s.dir.x) < 1e-9 ? 'vertical' : 'aligned'
    const dimDir = dimensionDirection(points[0]!, points[points.length - 1]!, orientation)
    const sign = Math.sign(dot(nOut(s), leftNormal(dimDir))) || 1
    return { points, orientation, offsetMm: sign * offset, total: jambs.length > 0 }
  })
}

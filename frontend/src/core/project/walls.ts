import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import {
  add,
  cross,
  distance,
  dot,
  leftNormal,
  normalize,
  scale,
  sub,
  type Vec2,
} from '../geometry/vec'
import type { Wall } from './schema'

/** Limite de meia-esquadria (em múltiplos da meia espessura) antes de chanfrar. */
const MITER_LIMIT = 4

/** Linha deslocada de cada segmento do eixo, à distância `off` (positivo = esquerda). */
function offsetSegments(points: Vec2[], off: number, closed: boolean): [Vec2, Vec2][] {
  const n = points.length
  const segs: [Vec2, Vec2][] = []
  const count = closed ? n : n - 1
  for (let i = 0; i < count; i++) {
    const a = points[i]!
    const b = points[(i + 1) % n]!
    const nrm = scale(leftNormal(normalize(sub(b, a))), off)
    segs.push([add(a, nrm), add(b, nrm)])
  }
  return segs
}

function intersectLines(p: Vec2, r: Vec2, q: Vec2, s: Vec2): Vec2 | null {
  const denom = cross(r, s)
  if (Math.abs(denom) < 1e-9) return null
  const t = cross(sub(q, p), s) / denom
  return add(p, scale(r, t))
}

/** Uma face da parede (deslocamento `off`) com encontros em meia-esquadria. */
function offsetPolyline(points: Vec2[], off: number, closed: boolean): Vec2[] {
  const segs = offsetSegments(points, off, closed)
  const out: Vec2[] = []
  const join = (prev: [Vec2, Vec2], next: [Vec2, Vec2], corner: Vec2) => {
    const hit = intersectLines(prev[0], sub(prev[1], prev[0]), next[0], sub(next[1], next[0]))
    if (!hit || distance(hit, corner) > Math.abs(off) * MITER_LIMIT) {
      out.push(prev[1], next[0]) // segmentos colineares ou ângulo muito agudo: chanfro
    } else {
      out.push(hit)
    }
  }
  if (closed) {
    for (let i = 0; i < segs.length; i++) {
      const prev = segs[(i - 1 + segs.length) % segs.length]!
      join(prev, segs[i]!, points[i]!)
    }
  } else {
    out.push(segs[0]![0])
    for (let i = 1; i < segs.length; i++) join(segs[i - 1]!, segs[i]!, points[i]!)
    out.push(segs[segs.length - 1]![1])
  }
  return out
}

/** Remove pontos repetidos consecutivos (cliques duplos no mesmo lugar). */
export function dedupePoints(points: Vec2[]): Vec2[] {
  return points.filter((p, i) => i === 0 || distance(p, points[i - 1]!) > 0.5)
}

export interface WallOutline {
  /** Polígonos de contorno; parede fechada tem anel externo + interno. */
  rings: Vec2[][]
  closed: boolean
}

export function wallOutline(
  points: Vec2[],
  thickness: number,
  closed: boolean,
): WallOutline | null {
  const pts = dedupePoints(points)
  if (closed && pts.length > 2 && distance(pts[0]!, pts[pts.length - 1]!) < 0.5) pts.pop()
  if (pts.length < 2 || (closed && pts.length < 3)) return null
  const h = thickness / 2
  const left = offsetPolyline(pts, h, closed)
  const right = offsetPolyline(pts, -h, closed)
  if (closed) return { rings: [left, right], closed }
  return { rings: [[...left, ...right.reverse()]], closed }
}

export function wallEntities(
  wall: Pick<Wall, 'points' | 'thicknessMm' | 'closed'>,
  color = '#000000',
): Entity[] {
  const o = wallOutline(wall.points, wall.thicknessMm, wall.closed)
  if (!o) return []
  const [outer, ...holes] = o.rings
  return [
    {
      kind: 'hatch',
      boundary: outer!,
      holes,
      pattern: { kind: 'lines', angleDeg: 45, spacing: 0.8 },
      style: { color },
    },
    ...o.rings.map((ring): Entity => ({
      kind: 'polyline',
      points: ring,
      closed: true,
      style: { weight: PEN.thick, color },
    })),
  ]
}

/** Distância do ponto ao segmento ab. */
export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a)
  const len2 = dot(ab, ab)
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2))
  return distance(p, add(a, scale(ab, t)))
}

export function hitWall(wall: Wall, p: Vec2, tolerance = 0): boolean {
  const pts = wall.points
  const n = wall.closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    if (
      distanceToSegment(p, pts[i]!, pts[(i + 1) % pts.length]!) <=
      wall.thicknessMm / 2 + tolerance
    )
      return true
  }
  return false
}

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
export function offsetPolyline(points: Vec2[], off: number, closed: boolean): Vec2[] {
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
  const pts = wallPoints({ points, closed })
  if (pts.length < 2 || (closed && pts.length < 3)) return null
  const h = thickness / 2
  const left = offsetPolyline(pts, h, closed)
  const right = offsetPolyline(pts, -h, closed)
  if (closed) return { rings: [left, right], closed }
  return { rings: [[...left, ...right.reverse()]], closed }
}

export type WallGeometry = Pick<Wall, 'points' | 'thicknessMm' | 'closed'>

export interface WallSegment {
  index: number
  a: Vec2
  b: Vec2
  length: number
  dir: Vec2
  /** Distância acumulada (eixo) do início da parede até `a`. */
  start: number
}

/** Pontos limpos do eixo (sem repetidos; parede fechada sem repetir o primeiro no fim). */
export function wallPoints(wall: Pick<Wall, 'points' | 'closed'>): Vec2[] {
  const pts = dedupePoints(wall.points)
  if (wall.closed && pts.length > 2 && distance(pts[0]!, pts[pts.length - 1]!) < 0.5) pts.pop()
  return pts
}

export function wallSegments(wall: Pick<Wall, 'points' | 'closed'>): WallSegment[] {
  const pts = wallPoints(wall)
  const n = wall.closed ? pts.length : pts.length - 1
  const out: WallSegment[] = []
  let start = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % pts.length]!
    const length = distance(a, b)
    if (length < 0.5) continue
    out.push({ index: i, a, b, length, dir: normalize(sub(b, a)), start })
    start += length
  }
  return out
}

/** Trecho [from, to] do eixo, em mm a partir do início da parede. */
export interface AxisInterval {
  from: number
  to: number
}

/** Partes cheias da parede depois de tirar os vãos (cada parte é uma polilinha aberta). */
export function wallPieces(
  wall: Pick<Wall, 'points' | 'closed'>,
  gaps: AxisInterval[],
): { points: Vec2[]; closed: boolean }[] {
  const pts = wallPoints(wall)
  const segs = wallSegments(wall)
  if (!segs.length) return []
  const lastSeg = segs[segs.length - 1]!
  const total = lastSeg.start + lastSeg.length
  const merged = gaps
    .map((g) => ({ from: Math.max(0, g.from), to: Math.min(total, g.to) }))
    .filter((g) => g.to - g.from > 0.5)
    .sort((x, y) => x.from - y.from)
    .reduce<AxisInterval[]>((acc, g) => {
      const last = acc[acc.length - 1]
      if (last && g.from <= last.to) last.to = Math.max(last.to, g.to)
      else acc.push({ ...g })
      return acc
    }, [])
  if (!merged.length) return [{ points: pts, closed: wall.closed }]

  const pointAt = (s: number): Vec2 => {
    const seg = segs.find((g) => s <= g.start + g.length + 1e-9) ?? lastSeg
    return add(seg.a, scale(seg.dir, Math.min(seg.length, Math.max(0, s - seg.start))))
  }
  // Polilinha do eixo entre s0 e s1, incluindo os vértices internos.
  const extract = (s0: number, s1: number): Vec2[] => {
    const inner = segs.filter((g) => g.start > s0 + 1e-9 && g.start < s1 - 1e-9).map((g) => g.a)
    return [pointAt(s0), ...inner, pointAt(s1)]
  }

  const pieces: Vec2[][] = []
  if (!wall.closed) {
    let cur = 0
    for (const g of merged) {
      if (g.from - cur > 0.5) pieces.push(extract(cur, g.from))
      cur = g.to
    }
    if (total - cur > 0.5) pieces.push(extract(cur, total))
  } else {
    for (let i = 0; i + 1 < merged.length; i++) {
      if (merged[i + 1]!.from - merged[i]!.to > 0.5)
        pieces.push(extract(merged[i]!.to, merged[i + 1]!.from))
    }
    // Do fim do último vão, dando a volta pelo início, até o primeiro vão.
    const last = merged[merged.length - 1]!
    const first = merged[0]!
    if (total - last.to + first.from > 0.5) {
      pieces.push([...extract(last.to, total), ...extract(0, first.from).slice(1)])
    }
  }
  return pieces.map((p) => ({ points: dedupePoints(p), closed: false }))
}

function outlineEntities(o: WallOutline, color: string): Entity[] {
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

/** Parede hachurada e contornada, já recortada pelos vãos (`gaps`, ao longo do eixo). */
export function wallEntities(
  wall: WallGeometry,
  color = '#000000',
  gaps: AxisInterval[] = [],
): Entity[] {
  return wallPieces(wall, gaps).flatMap((piece) => {
    const o = wallOutline(piece.points, wall.thicknessMm, piece.closed)
    return o ? outlineEntities(o, color) : []
  })
}

export interface NearestWall {
  wallId: string
  segment: number
  /** Posição ao longo do trecho (mm, a partir de `a`). */
  along: number
  distance: number
  /** Lado do ponto em relação ao sentido do trecho (visual, y para baixo). */
  side: 'left' | 'right'
}

/** Trecho de parede mais próximo do ponto (para encaixar portas e janelas). */
export function nearestWall(
  walls: readonly Wall[],
  p: Vec2,
  maxDistance: number,
): NearestWall | null {
  let best: NearestWall | null = null
  for (const w of walls) {
    for (const s of wallSegments(w)) {
      const t = Math.max(0, Math.min(s.length, dot(sub(p, s.a), s.dir)))
      const foot = add(s.a, scale(s.dir, t))
      const d = distance(p, foot)
      if (d <= maxDistance && (!best || d < best.distance)) {
        // leftNormal aponta para a "esquerda visual"; produto escalar decide o lado.
        const side = dot(sub(p, foot), leftNormal(s.dir)) >= 0 ? 'left' : 'right'
        best = { wallId: w.id, segment: s.index, along: t, distance: d, side }
      }
    }
  }
  return best
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

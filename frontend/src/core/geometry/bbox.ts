import type { Vec2 } from './vec'

export interface BBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const EMPTY_BBOX: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

export function bboxOf(points: readonly Vec2[]): BBox {
  return points.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x),
      minY: Math.min(b.minY, p.y),
      maxX: Math.max(b.maxX, p.x),
      maxY: Math.max(b.maxY, p.y),
    }),
    EMPTY_BBOX,
  )
}

export function union(a: BBox, b: BBox): BBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

export const isEmpty = (b: BBox): boolean => b.minX > b.maxX || b.minY > b.maxY
export const width = (b: BBox): number => b.maxX - b.minX
export const height = (b: BBox): number => b.maxY - b.minY

export function expand(b: BBox, margin: number): BBox {
  return {
    minX: b.minX - margin,
    minY: b.minY - margin,
    maxX: b.maxX + margin,
    maxY: b.maxY + margin,
  }
}

// --- Seleção por janela ----------------------------------------------------------

/** Retângulo normalizado entre dois cantos quaisquer. */
export function rectFromCorners(a: Vec2, b: Vec2): BBox {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

export const pointInRect = (r: BBox, p: Vec2): boolean =>
  p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = o(c, d, a)
  const d2 = o(c, d, b)
  const d3 = o(a, b, c)
  const d4 = o(a, b, d)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/** O segmento ab toca o retângulo (ponta dentro ou cruza uma borda)? */
export function segmentTouchesRect(r: BBox, a: Vec2, b: Vec2): boolean {
  if (pointInRect(r, a) || pointInRect(r, b)) return true
  const c = [
    { x: r.minX, y: r.minY },
    { x: r.maxX, y: r.minY },
    { x: r.maxX, y: r.maxY },
    { x: r.minX, y: r.maxY },
  ]
  return c.some((p, i) => segmentsCross(a, b, p, c[(i + 1) % 4]!))
}

/** Contorno de um objeto para a seleção: pontos e segmentos (fechado ou não). */
export interface PickShape {
  points: Vec2[]
  closed: boolean
}

/**
 * Janela (esquerda→direita): o objeto precisa estar INTEIRO dentro.
 * Cruzamento (direita→esquerda): basta TOCAR (ou o retângulo estar dentro de um contorno fechado).
 */
export function shapeInRect(r: BBox, s: PickShape, mode: 'window' | 'crossing'): boolean {
  if (!s.points.length) return false
  if (mode === 'window') return s.points.every((p) => pointInRect(r, p))
  const n = s.points.length
  const segs = s.closed ? n : n - 1
  if (n === 1) return pointInRect(r, s.points[0]!)
  for (let i = 0; i < segs; i++)
    if (segmentTouchesRect(r, s.points[i]!, s.points[(i + 1) % n]!)) return true
  return false
}

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

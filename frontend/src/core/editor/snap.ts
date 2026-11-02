import { distance, type Vec2 } from '../geometry/vec'
import { roundMm } from '../units'

/** `right`: auxiliar de ângulo reto (ver right-angle.ts). */
export type SnapKind = 'endpoint' | 'midpoint' | 'grid' | 'ortho' | 'right' | 'free'

export interface SnapOptions {
  /** Passo da grade em mm (0 = sem grade). */
  grid: number
  /** Pontos notáveis (extremidades de parede, cantos de itens). */
  endpoints: readonly Vec2[]
  /** Pontos médios (meio dos trechos de parede); perdem para extremidades. */
  midpoints?: readonly Vec2[]
  /** Raio de captura das extremidades, mm do modelo. */
  tolerance: number
  /** Ponto anterior: ativa o travamento ortogonal (horizontal/vertical). */
  orthoFrom?: Vec2
}

export interface SnapResult {
  point: Vec2
  kind: SnapKind
}

/** Extremidade > ponto médio > ortogonal + grade > grade. Sempre devolve mm inteiros. */
export function snapPoint(p: Vec2, o: SnapOptions): SnapResult {
  let best: Vec2 | null = null
  let bestD = o.tolerance
  for (const e of o.endpoints) {
    const d = distance(p, e)
    if (d <= bestD) {
      best = e
      bestD = d
    }
  }
  if (best) return { point: { x: roundMm(best.x), y: roundMm(best.y) }, kind: 'endpoint' }
  for (const m of o.midpoints ?? []) {
    const d = distance(p, m)
    if (d <= bestD) {
      best = m
      bestD = d
    }
  }
  if (best) return { point: { x: roundMm(best.x), y: roundMm(best.y) }, kind: 'midpoint' }

  const g = (v: number) => (o.grid > 0 ? Math.round(v / o.grid) * o.grid : v)
  if (o.orthoFrom) {
    const from = o.orthoFrom
    const horizontal = Math.abs(p.x - from.x) >= Math.abs(p.y - from.y)
    const point = horizontal ? { x: g(p.x), y: from.y } : { x: from.x, y: g(p.y) }
    return { point: { x: roundMm(point.x), y: roundMm(point.y) }, kind: 'ortho' }
  }
  if (o.grid > 0) return { point: { x: roundMm(g(p.x)), y: roundMm(g(p.y)) }, kind: 'grid' }
  return { point: { x: roundMm(p.x), y: roundMm(p.y) }, kind: 'free' }
}

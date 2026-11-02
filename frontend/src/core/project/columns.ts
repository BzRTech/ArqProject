import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import { containsPoint } from '../geometry/polygon'
import { add, distance, rotate, type Vec2 } from '../geometry/vec'
import type { Column } from './schema'
import { distanceToSegment } from './walls'

/** Pilar novo: 20 × 20 cm (o usuário ajusta no painel). */
export const COLUMN_DEFAULTS = {
  shape: 'rect',
  widthMm: 200,
  depthMm: 200,
  rotationDeg: 0,
} as const

/** Contorno do pilar no modelo: 4 cantos (retangular) ou polígono de 32 lados (circular). */
export function columnOutline(
  c: Pick<Column, 'at' | 'shape' | 'widthMm' | 'depthMm' | 'rotationDeg'>,
): Vec2[] {
  if (c.shape === 'circle') {
    const r = c.widthMm / 2
    return Array.from({ length: 32 }, (_, i) => {
      const t = (i / 32) * 2 * Math.PI
      return { x: c.at.x + r * Math.cos(t), y: c.at.y + r * Math.sin(t) }
    })
  }
  const w = c.widthMm / 2
  const d = c.depthMm / 2
  return [
    { x: -w, y: -d },
    { x: w, y: -d },
    { x: w, y: d },
    { x: -w, y: d },
  ].map((p) => add(c.at, rotate(p, c.rotationDeg)))
}

/**
 * Pilar como na planta: seção cortada CHEIA (preta), que distingue a estrutura das paredes
 * (hachuradas), com contorno de pena grossa.
 */
export function columnEntities(c: Column, color = '#000000'): Entity[] {
  const style = { weight: PEN.thick, color }
  const fill = { color }
  if (c.shape === 'circle')
    return [{ kind: 'circle', center: c.at, radius: c.widthMm / 2, style, fill }]
  return [{ kind: 'polyline', points: columnOutline(c), closed: true, style, fill }]
}

export function hitColumn(c: Column, p: Vec2, tol: number): boolean {
  if (c.shape === 'circle') return distance(p, c.at) <= c.widthMm / 2 + tol
  const o = columnOutline(c)
  if (containsPoint(o, p)) return true
  return o.some((a, i) => distanceToSegment(p, a, o[(i + 1) % o.length]!) <= tol)
}

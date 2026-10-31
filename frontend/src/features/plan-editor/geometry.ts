/** Consultas geométricas do editor sobre o documento (acerto por clique, pontos de snap). */
import { dimensionDirection } from '@/core/dimensions/layout'
import { textWidth } from '@/core/drawing/text-metrics'
import { add, dot, leftNormal, scale, sub, type Vec2 } from '@/core/geometry/vec'
import { hitItem, itemCorners } from '@/core/project/items'
import type { DimensionDrawing, Environment } from '@/core/project/schema'
import { distanceToSegment, hitWall } from '@/core/project/walls'
import type { Selection } from './store'

export const DISPLAY_SCALE = 50

/** Linha de cota no modelo (onde o usuário a vê). */
export function dimensionLine(d: DimensionDrawing): [Vec2, Vec2] {
  const dir = dimensionDirection(d.p1, d.p2, d.orientation)
  const base = add(d.p1, scale(leftNormal(dir), d.offsetMm))
  return [base, add(base, scale(dir, dot(sub(d.p2, d.p1), dir)))]
}

/** Retângulo aproximado de um texto (alinhado à esquerda, centrado na vertical). */
export function textBox(
  at: Vec2,
  text: string,
  sizeMm: number,
): { x: number; y: number; w: number; h: number } {
  const w = textWidth(text, sizeMm) * DISPLAY_SCALE
  const h = sizeMm * DISPLAY_SCALE
  return { x: at.x, y: at.y - h / 2, w, h }
}

/** O que está sob o ponteiro: itens (de cima para baixo), textos, cotas e paredes. */
export function hitTest(env: Environment, p: Vec2, tol: number): Selection {
  for (let i = env.items.length - 1; i >= 0; i--) {
    const it = env.items[i]!
    if (hitItem(it, p)) return { kind: 'item', id: it.id }
  }
  for (let i = env.drawings.length - 1; i >= 0; i--) {
    const d = env.drawings[i]!
    if (d.kind === 'text') {
      const b = textBox(d.at, d.text, d.sizeMm)
      if (
        p.x >= b.x - tol &&
        p.x <= b.x + b.w + tol &&
        p.y >= b.y - tol &&
        p.y <= b.y + b.h + tol
      ) {
        return { kind: 'drawing', id: d.id }
      }
    } else if (d.kind === 'dimension') {
      const [a, b] = dimensionLine(d)
      if (distanceToSegment(p, a, b) <= tol * 2) return { kind: 'drawing', id: d.id }
    }
  }
  for (let i = env.drawings.length - 1; i >= 0; i--) {
    const d = env.drawings[i]!
    if (d.kind === 'wall' && hitWall(d, p, tol)) return { kind: 'drawing', id: d.id }
  }
  return null
}

/** Pontos notáveis para o snap. */
export function snapPoints(env: Environment): Vec2[] {
  const pts: Vec2[] = []
  for (const d of env.drawings) {
    if (d.kind === 'wall') pts.push(...d.points)
    else if (d.kind === 'dimension') pts.push(d.p1, d.p2)
  }
  for (const it of env.items) pts.push(...itemCorners(it))
  return pts
}

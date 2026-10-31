/** Consultas geométricas do editor sobre o documento (acerto por clique, pontos de snap). */
import { dimensionDirection } from '@/core/dimensions/layout'
import { textWidth } from '@/core/drawing/text-metrics'
import { add, dot, leftNormal, scale, sub, type Vec2 } from '@/core/geometry/vec'
import { hitItem, itemCorners } from '@/core/project/items'
import { hitOpening, openingJambs } from '@/core/project/openings'
import type { ChainDrawing, DimensionDrawing, Environment, Wall } from '@/core/project/schema'
import { distanceToSegment, hitWall } from '@/core/project/walls'
import type { Selection } from './store'

export const DISPLAY_SCALE = 50

/** Linha de cota no modelo (onde o usuário a vê). Para cadeias, do primeiro ao último ponto. */
export function dimensionLine(d: DimensionDrawing | ChainDrawing): [Vec2, Vec2] {
  const p1 = d.kind === 'dimension' ? d.p1 : d.points[0]!
  const p2 = d.kind === 'dimension' ? d.p2 : d.points[d.points.length - 1]!
  const dir = dimensionDirection(p1, p2, d.orientation)
  const base = add(p1, scale(leftNormal(dir), d.offsetMm))
  if (d.kind === 'dimension') return [base, add(base, scale(dir, dot(sub(p2, p1), dir)))]
  const ts = d.points.map((p) => dot(sub(p, p1), dir))
  return [add(base, scale(dir, Math.min(...ts))), add(base, scale(dir, Math.max(...ts)))]
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

export const wallsOf = (env: Environment): Wall[] =>
  env.drawings.filter((d): d is Wall => d.kind === 'wall')

/** O que está sob o ponteiro: itens, portas/janelas, textos, cotas e, por fim, paredes. */
export function hitTest(env: Environment, p: Vec2, tol: number): Selection {
  for (let i = env.items.length - 1; i >= 0; i--) {
    const it = env.items[i]!
    if (hitItem(it, p)) return { kind: 'item', id: it.id }
  }
  const walls = new Map(wallsOf(env).map((w) => [w.id, w]))
  for (let i = env.openings.length - 1; i >= 0; i--) {
    const o = env.openings[i]!
    const w = walls.get(o.wallId)
    if (w && hitOpening(w, o, p, tol)) return { kind: 'opening', id: o.id }
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
    } else if (d.kind === 'dimension' || d.kind === 'chain') {
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
  const walls = new Map(wallsOf(env).map((w) => [w.id, w]))
  for (const d of env.drawings) {
    if (d.kind === 'wall') pts.push(...d.points)
    else if (d.kind === 'dimension') pts.push(d.p1, d.p2)
  }
  for (const o of env.openings) {
    const w = walls.get(o.wallId)
    if (w) pts.push(...openingJambs(w, o))
  }
  for (const it of env.items) pts.push(...itemCorners(it))
  return pts
}

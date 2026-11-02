import { add, distance, dot, length, scale, sub, type Vec2 } from '../geometry/vec'
import { roundMm } from '../units'

/**
 * Auxiliar de ângulo reto ao arrastar um canto de parede (como o "rastreamento polar" de CAD).
 * Cada restrição é um lugar geométrico onde o canto arrastado deixa algum ângulo em 90° ou
 * alinha com um vizinho:
 * - círculo de Tales (diâmetro = vizinhos): 90° NO PRÓPRIO canto;
 * - reta pelo vizinho, perpendicular ao trecho seguinte: 90° NO VIZINHO;
 * - horizontais/verticais pelos vizinhos: alinhamento ortogonal.
 */
export type AngleConstraint =
  | { kind: 'line'; p: Vec2; dir: Vec2; reason: 'perp' | 'axis' }
  | { kind: 'circle'; c: Vec2; r: number }

/** Ângulo interno no canto `v` (entre v→a e v→b), em graus de 0 a 180. */
export function cornerAngleDeg(a: Vec2, v: Vec2, b: Vec2): number {
  const u = sub(a, v)
  const w = sub(b, v)
  const lu = length(u)
  const lw = length(w)
  if (!lu || !lw) return 0
  const c = Math.max(-1, Math.min(1, dot(u, w) / (lu * lw)))
  return (Math.acos(c) * 180) / Math.PI
}

const perp = (v: Vec2): Vec2 => ({ x: -v.y, y: v.x })

/** Índice vizinho (k passos) numa polilinha aberta ou fechada; null fora dela. */
function at(n: number, closed: boolean, i: number): number | null {
  if (closed) return ((i % n) + n) % n
  return i >= 0 && i < n ? i : null
}

export function vertexConstraints(
  pts: readonly Vec2[],
  closed: boolean,
  i: number,
): AngleConstraint[] {
  const n = pts.length
  const get = (k: number) => {
    const j = at(n, closed, i + k)
    return j === null || j === i ? null : pts[j]!
  }
  const prev = get(-1)
  const next = get(1)
  const prev2 = get(-2)
  const next2 = get(2)
  const out: AngleConstraint[] = []
  if (prev && next && distance(prev, next) > 1) {
    out.push({ kind: 'circle', c: scale(add(prev, next), 0.5), r: distance(prev, next) / 2 })
  }
  if (prev && prev2 && distance(prev, prev2) > 1)
    out.push({ kind: 'line', p: prev, dir: perp(sub(prev, prev2)), reason: 'perp' })
  if (next && next2 && distance(next, next2) > 1)
    out.push({ kind: 'line', p: next, dir: perp(sub(next, next2)), reason: 'perp' })
  for (const q of [prev, next]) {
    if (!q) continue
    out.push({ kind: 'line', p: q, dir: { x: 1, y: 0 }, reason: 'axis' })
    out.push({ kind: 'line', p: q, dir: { x: 0, y: 1 }, reason: 'axis' })
  }
  return out
}

function project(p: Vec2, c: AngleConstraint): Vec2 {
  if (c.kind === 'line') {
    const d = scale(c.dir, 1 / length(c.dir))
    return add(c.p, scale(d, dot(sub(p, c.p), d)))
  }
  const v = sub(p, c.c)
  const l = length(v)
  return l ? add(c.c, scale(v, c.r / l)) : add(c.c, { x: c.r, y: 0 })
}

function intersect(a: AngleConstraint, b: AngleConstraint): Vec2[] {
  if (a.kind === 'circle' && b.kind === 'circle') return []
  if (a.kind === 'circle') return intersect(b, a)
  const d = scale(a.dir, 1 / length(a.dir))
  if (b.kind === 'line') {
    const e = scale(b.dir, 1 / length(b.dir))
    const den = d.x * e.y - d.y * e.x
    if (Math.abs(den) < 1e-9) return []
    const w = sub(b.p, a.p)
    const t = (w.x * e.y - w.y * e.x) / den
    return [add(a.p, scale(d, t))]
  }
  // reta × círculo
  const f = sub(a.p, b.c)
  const B = dot(f, d)
  const C = dot(f, f) - b.r * b.r
  const disc = B * B - C
  if (disc < 0) return []
  const s = Math.sqrt(disc)
  return [add(a.p, scale(d, -B - s)), add(a.p, scale(d, -B + s))]
}

export interface RightAngleSnap {
  point: Vec2
  /** Encontro de duas restrições (o canto fica "travado" num ponto exato). */
  exact: boolean
}

/**
 * Gruda `p` na restrição mais próxima dentro de `tol` (mm do modelo); encontros de duas
 * restrições têm prioridade. Devolve mm inteiros, ou null se nada estiver perto.
 */
export function rightAngleSnap(
  p: Vec2,
  cs: readonly AngleConstraint[],
  tol: number,
): RightAngleSnap | null {
  const round = (q: Vec2) => ({ x: roundMm(q.x), y: roundMm(q.y) })
  let best: Vec2 | null = null
  let bestD = tol
  for (let i = 0; i < cs.length; i++)
    for (let j = i + 1; j < cs.length; j++)
      for (const q of intersect(cs[i]!, cs[j]!)) {
        const d = distance(p, q)
        if (d <= bestD) {
          best = q
          bestD = d
        }
      }
  if (best) return { point: round(best), exact: true }
  for (const c of cs) {
    const q = project(p, c)
    const d = distance(p, q)
    if (d <= bestD) {
      best = q
      bestD = d
    }
  }
  return best ? { point: round(best), exact: false } : null
}

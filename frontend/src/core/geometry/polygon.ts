import { rotate, type Vec2 } from './vec'

/** Área com sinal (fórmula do laço). Com y para baixo, positivo = sentido horário visual. */
export function signedArea(points: readonly Vec2[]): number {
  let s = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

/** Área absoluta, nas unidades² das coordenadas (mm² para o modelo). */
export const area = (points: readonly Vec2[]): number => Math.abs(signedArea(points))

/** Centroide de polígono simples (cai na média dos vértices se a área for nula). */
export function centroid(points: readonly Vec2[]): Vec2 {
  const a = signedArea(points)
  if (a === 0) {
    const n = points.length || 1
    return {
      x: points.reduce((s, p) => s + p.x, 0) / n,
      y: points.reduce((s, p) => s + p.y, 0) / n,
    }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const q = points[(i + 1) % points.length]!
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export const perimeter = (points: readonly Vec2[]): number =>
  points.reduce((s, p, i) => {
    const q = points[(i + 1) % points.length]!
    return s + Math.hypot(q.x - p.x, q.y - p.y)
  }, 0)

/** Ponto dentro do polígono (regra par-ímpar). */
export function containsPoint(points: readonly Vec2[], p: Vec2): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!
    const b = points[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export interface Segment {
  a: Vec2
  b: Vec2
}

/**
 * Linhas paralelas de hachura recortadas pelo polígono (par-ímpar; aceita côncavo e furos
 * passados como anéis extras). As linhas ficam ancoradas na origem, então regiões vizinhas
 * com o mesmo padrão continuam alinhadas.
 */
export function hatchLines(
  rings: readonly (readonly Vec2[])[],
  angleDeg: number,
  spacing: number,
  offset = 0,
): Segment[] {
  if (spacing <= 0) throw new Error('Espaçamento de hachura deve ser positivo')
  // Gira o polígono para que as linhas de hachura fiquem horizontais.
  const local = rings.map((ring) => ring.map((p) => rotate(p, -angleDeg)))
  const all = local.flat()
  if (all.length < 3) return []
  const minY = Math.min(...all.map((p) => p.y))
  const maxY = Math.max(...all.map((p) => p.y))
  const out: Segment[] = []
  const first = Math.ceil((minY - offset) / spacing) * spacing + offset
  for (let y = first; y <= maxY; y += spacing) {
    const xs: number[] = []
    for (const ring of local) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!
        const b = ring[(i + 1) % ring.length]!
        // Intervalo semiaberto evita contar o vértice duas vezes.
        if (a.y <= y !== b.y <= y) {
          xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
        }
      }
    }
    xs.sort((m, n) => m - n)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1]! - xs[i]! > 1e-9) {
        out.push({
          a: rotate({ x: xs[i]!, y }, angleDeg),
          b: rotate({ x: xs[i + 1]!, y }, angleDeg),
        })
      }
    }
  }
  return out
}

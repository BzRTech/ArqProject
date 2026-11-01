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

/** Dentro da região formada por anéis (regra par-ímpar: furos contam como fora). */
export function insideRings(rings: readonly (readonly Vec2[])[], p: Vec2): boolean {
  return rings.reduce((acc, r) => (containsPoint(r, p) ? !acc : acc), false)
}

/** Partes do segmento ab que ficam dentro da região (aceita côncavos e furos). */
export function clipSegment(rings: readonly (readonly Vec2[])[], a: Vec2, b: Vec2): Segment[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const ts = [0, 1]
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!
      const q = ring[(i + 1) % ring.length]!
      const ex = q.x - p.x
      const ey = q.y - p.y
      const den = dx * ey - dy * ex
      if (Math.abs(den) < 1e-12) continue
      const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / den
      const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / den
      if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t)
    }
  }
  ts.sort((m, n) => m - n)
  const at = (t: number) => ({ x: a.x + dx * t, y: a.y + dy * t })
  const out: Segment[] = []
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i]!
    const t1 = ts[i + 1]!
    if (t1 - t0 < 1e-9) continue
    if (insideRings(rings, at((t0 + t1) / 2))) {
      const last = out[out.length - 1]
      // junta trechos contíguos (o ponto de corte caiu num vértice)
      if (last && Math.abs(last.b.x - at(t0).x) < 1e-6 && Math.abs(last.b.y - at(t0).y) < 1e-6)
        last.b = at(t1)
      else out.push({ a: at(t0), b: at(t1) })
    }
  }
  return out
}

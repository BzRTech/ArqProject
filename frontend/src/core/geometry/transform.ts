import { degToRad, type Vec2 } from './vec'

/**
 * Transformação afim 2D [a b c d e f] (mesma convenção do SVG/PDF):
 *   x' = a·x + c·y + e
 *   y' = b·x + d·y + f
 */
export interface Transform {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const IDENTITY: Transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

export const translation = (tx: number, ty: number): Transform => ({ ...IDENTITY, e: tx, f: ty })
export const scaling = (sx: number, sy: number = sx): Transform => ({ ...IDENTITY, a: sx, d: sy })

export function rotation(deg: number): Transform {
  const r = degToRad(deg)
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { a: c, b: s, c: -s, d: c, e: 0, f: 0 }
}

/** Composição: aplica `first` e depois `second`. */
export function compose(first: Transform, second: Transform): Transform {
  return {
    a: second.a * first.a + second.c * first.b,
    b: second.b * first.a + second.d * first.b,
    c: second.a * first.c + second.c * first.d,
    d: second.b * first.c + second.d * first.d,
    e: second.a * first.e + second.c * first.f + second.e,
    f: second.b * first.e + second.d * first.f + second.f,
  }
}

/** Compõe uma sequência na ordem em que as transformações são aplicadas. */
export const chain = (...ts: Transform[]): Transform => ts.reduce(compose, IDENTITY)

export function apply(t: Transform, p: Vec2): Vec2 {
  return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f }
}

/** Aplica só a parte linear (para vetores/direções). */
export function applyLinear(t: Transform, v: Vec2): Vec2 {
  return { x: t.a * v.x + t.c * v.y, y: t.b * v.x + t.d * v.y }
}

export function invert(t: Transform): Transform {
  const det = t.a * t.d - t.b * t.c
  if (det === 0) throw new Error('Transformação não inversível')
  return {
    a: t.d / det,
    b: -t.b / det,
    c: -t.c / det,
    d: t.a / det,
    e: (t.c * t.f - t.d * t.e) / det,
    f: (t.b * t.e - t.a * t.f) / det,
  }
}

/** Fator de escala uniforme (média geométrica); útil para converter tamanhos. */
export const scaleFactor = (t: Transform): number => Math.sqrt(Math.abs(t.a * t.d - t.b * t.c))

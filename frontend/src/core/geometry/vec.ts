/** Vetor/ponto 2D. Eixo y para baixo (ver core/README.md). */
export interface Vec2 {
  x: number
  y: number
}

export const vec = (x: number, y: number): Vec2 => ({ x, y })
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k })
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x
export const length = (a: Vec2): number => Math.hypot(a.x, a.y)
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y)
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})
export const midpoint = (a: Vec2, b: Vec2): Vec2 => lerp(a, b, 0.5)

export function normalize(a: Vec2): Vec2 {
  const len = length(a)
  if (len === 0) throw new Error('Não é possível normalizar vetor nulo')
  return { x: a.x / len, y: a.y / len }
}

/**
 * Normal "à esquerda" de quem anda no sentido de `dir`, visualmente, com y para baixo:
 * (1,0) → (0,-1), isto é, para cima.
 */
export const leftNormal = (dir: Vec2): Vec2 => ({ x: dir.y, y: -dir.x })

export const degToRad = (deg: number): number => (deg * Math.PI) / 180
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI

/** Ponto a `deg` graus (0° = +x, horário visual) e distância `r` de `center`. */
export function polar(center: Vec2, r: number, deg: number): Vec2 {
  const a = degToRad(deg)
  return { x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) }
}

/** Ângulo de `v` em graus, em [0, 360). */
export function angleDeg(v: Vec2): number {
  const d = radToDeg(Math.atan2(v.y, v.x))
  return d < 0 ? d + 360 : d
}

export function rotate(v: Vec2, deg: number, origin: Vec2 = { x: 0, y: 0 }): Vec2 {
  const a = degToRad(deg)
  const c = Math.cos(a)
  const s = Math.sin(a)
  const dx = v.x - origin.x
  const dy = v.y - origin.y
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c }
}

export function nearlyEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps
}

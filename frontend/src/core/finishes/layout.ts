import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import { centroid, clipSegment, type Segment } from '../geometry/polygon'
import { add, dot, rotate, scale, vec, type Vec2 } from '../geometry/vec'
import type { Floor } from '../project/schema'

/** Limite de juntas desenhadas (peças minúsculas em áreas enormes viram só preenchimento). */
const MAX_SEGMENTS = 6000

/**
 * Juntas da paginação, recortadas no polígono da área (côncavo e com furos).
 * Sistema local: `u` = direção de assentamento (comprimento da peça), `v` = largura.
 * A junta é desenhada como uma linha no meio do rejunte.
 */
export function floorJoints(
  area: readonly Vec2[],
  floor: Pick<Floor, 'pieceAMm' | 'pieceBMm' | 'jointMm' | 'pattern' | 'angleDeg' | 'origin'>,
  holes: Vec2[][] = [],
): Segment[] {
  const { pieceAMm: A, pieceBMm: B, jointMm: J } = floor
  if (A <= 0 || B <= 0) return []
  const u = rotate(vec(1, 0), floor.angleDeg)
  const v = rotate(vec(0, 1), floor.angleDeg)
  const pa = A + J
  const pb = B + J
  const rings = [area, ...holes]
  const loc = area.map((p) => ({ s: dot(p, u), t: dot(p, v) }))
  const sMin = Math.min(...loc.map((q) => q.s))
  const sMax = Math.max(...loc.map((q) => q.s))
  const tMin = Math.min(...loc.map((q) => q.t))
  const tMax = Math.max(...loc.map((q) => q.t))
  const estimate = ((sMax - sMin) / pa + 2) * ((tMax - tMin) / pb + 2) * 2
  if (estimate > MAX_SEGMENTS) return []

  // Origem das juntas: centralizado = uma peça inteira centrada no centroide.
  const c = centroid(area)
  const s0 = floor.origin === 'center' ? dot(c, u) - pa / 2 : sMin
  const t0 = floor.origin === 'center' ? dot(c, v) - pb / 2 : tMin
  const P = (s: number, t: number) => add(scale(u, s), scale(v, t))
  const out: Segment[] = []
  const clip = (a: Vec2, b: Vec2) => out.push(...clipSegment(rings, a, b))
  const ext = Math.max(pa, pb) // folga além da caixa

  // Linhas de fiada (ao longo de u)
  const kFirst = Math.floor((tMin - t0) / pb)
  const kLast = Math.ceil((tMax - t0) / pb)
  for (let k = kFirst; k <= kLast; k++) {
    const t = t0 + k * pb
    if (t <= tMin || t >= tMax) continue
    clip(P(sMin - ext, t), P(sMax + ext, t))
  }
  // Juntas de topo (ao longo de v)
  if (floor.pattern === 'grid') {
    for (let i = Math.floor((sMin - s0) / pa); i <= Math.ceil((sMax - s0) / pa); i++) {
      const s = s0 + i * pa
      if (s <= sMin || s >= sMax) continue
      clip(P(s, tMin - ext), P(s, tMax + ext))
    }
  } else {
    const n = floor.pattern === 'half' ? 2 : 3
    for (let k = kFirst - 1; k <= kLast; k++) {
      const ta = t0 + k * pb
      const tb = ta + pb
      if (tb <= tMin || ta >= tMax) continue
      const shift = (((k % n) + n) % n) * (pa / n)
      for (
        let i = Math.floor((sMin - s0 - shift) / pa);
        i <= Math.ceil((sMax - s0 - shift) / pa);
        i++
      ) {
        const s = s0 + shift + i * pa
        if (s <= sMin || s >= sMax) continue
        clip(P(s, Math.max(ta, tMin)), P(s, Math.min(tb, tMax)))
      }
    }
  }
  return out
}

/** Desenho do piso: preenchimento (modo humanizado) + juntas. Vai por baixo de tudo. */
export function floorEntities(area: Vec2[], floor: Floor, humanized: boolean): Entity[] {
  const out: Entity[] = []
  if (humanized) {
    out.push({
      kind: 'polyline',
      points: area,
      closed: true,
      style: null,
      fill: { color: floor.color, opacity: 0.55 },
    })
  }
  const color = humanized ? '#8f8678' : '#a7a196'
  for (const seg of floorJoints(area, floor)) {
    out.push({ kind: 'line', a: seg.a, b: seg.b, style: { weight: PEN.extraFine, color } })
  }
  return out
}

import { add, rotate, type Vec2 } from '../geometry/vec'
import type { Entity } from './entities'

/**
 * Posicionamento de um bloco: espelha no eixo x local (opcional), gira em torno da origem
 * local e translada. Ângulos em graus, horário visual (y para baixo).
 */
export interface Placement {
  translate: Vec2
  rotationDeg: number
  mirrorX: boolean
}

export function placePoint(p: Vec2, pl: Placement): Vec2 {
  const m = pl.mirrorX ? { x: -p.x, y: p.y } : p
  return add(rotate(m, pl.rotationDeg), pl.translate)
}

/** Ângulo após espelhar e girar (para arcos). */
function placeAngle(deg: number, pl: Placement): number {
  return (pl.mirrorX ? 180 - deg : deg) + pl.rotationDeg
}

/** Texto continua legível: só gira, nunca espelha; mantém rotação em (-90, 90]. */
function readableTextRotation(deg: number): number {
  let r = ((deg % 360) + 360) % 360
  if (r > 90 && r <= 270) r -= 180
  if (r > 270) r -= 360
  return r
}

export function placeEntity(e: Entity, pl: Placement): Entity {
  const P = (p: Vec2) => placePoint(p, pl)
  switch (e.kind) {
    case 'line':
      return { ...e, a: P(e.a), b: P(e.b) }
    case 'polyline':
      return { ...e, points: e.points.map(P) }
    case 'rect': {
      const pts = [
        { x: e.x, y: e.y },
        { x: e.x + e.width, y: e.y },
        { x: e.x + e.width, y: e.y + e.height },
        { x: e.x, y: e.y + e.height },
      ]
      return { kind: 'polyline', points: pts.map(P), closed: true, style: e.style, fill: e.fill }
    }
    case 'circle':
      return { ...e, center: P(e.center) }
    case 'arc':
      return {
        ...e,
        center: P(e.center),
        startDeg: placeAngle(e.startDeg, pl),
        sweepDeg: pl.mirrorX ? -e.sweepDeg : e.sweepDeg,
      }
    case 'text':
      return {
        ...e,
        at: P(e.at),
        rotationDeg: readableTextRotation((e.rotationDeg ?? 0) + pl.rotationDeg),
      }
    case 'hatch':
      return {
        ...e,
        boundary: e.boundary.map(P),
        holes: e.holes?.map((h) => h.map(P)),
        pattern:
          e.pattern.kind === 'solid'
            ? e.pattern
            : { ...e.pattern, angleDeg: placeAngle(e.pattern.angleDeg, pl) },
      }
    case 'image':
      // Imagens não giram (planta base); só translada.
      return { ...e, x: e.x + pl.translate.x, y: e.y + pl.translate.y }
    case 'dimension':
      return { ...e, p1: P(e.p1), p2: P(e.p2) }
    case 'chain':
      return { ...e, points: e.points.map(P) }
    case 'group':
      return { ...e, children: e.children.map((c) => placeEntity(c, pl)) }
  }
}

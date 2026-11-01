import { distanceToSegment } from '../project/walls'
import { area, perimeter } from '../geometry/polygon'
import { add, scale, type Vec2 } from '../geometry/vec'
import { openingFrame } from '../project/openings'
import type { Floor, Opening, Wall } from '../project/schema'

/** Arredonda m² para cima com 2 casas (compra-se a mais, nunca a menos). */
export const ceilM2 = (m2: number) => Math.ceil(m2 * 100 - 1e-9) / 100

export interface FloorQuantities {
  /** Área do polígono, m². */
  areaM2: number
  /** Área a comprar (com perda), m², arredondada para cima. */
  buyM2: number
  /** Rodapé em metros (perímetro menos portas na borda), 0 se não houver rodapé. */
  skirtingM: number
  floorTotalCents: number
  skirtingTotalCents: number
}

/**
 * Comprimento de rodapé: perímetro da área menos a largura das PORTAS cujo vão encosta na
 * borda da área (rodapé não passa pela porta). Janelas não descontam.
 */
export function skirtingLengthMm(
  points: readonly Vec2[],
  walls: readonly Wall[],
  openings: readonly Opening[],
): number {
  const byId = new Map(walls.map((w) => [w.id, w]))
  let doors = 0
  for (const o of openings) {
    if (!o.type.startsWith('porta')) continue
    const w = byId.get(o.wallId)
    const f = w && openingFrame(w, o)
    if (!f) continue
    // A borda da área fica numa das faces da parede; testa as duas.
    const faces = [
      add(f.center, scale(f.n, f.halfThickness)),
      add(f.center, scale(f.n, -f.halfThickness)),
    ]
    const touches = faces.some((c) =>
      points.some((p, i) => distanceToSegment(c, p, points[(i + 1) % points.length]!) <= 20),
    )
    if (touches) doors += f.width
  }
  return Math.max(0, perimeter(points) - doors)
}

export function floorQuantities(
  points: readonly Vec2[],
  floor: Floor,
  walls: readonly Wall[] = [],
  openings: readonly Opening[] = [],
): FloorQuantities {
  const areaM2 = area(points) / 1_000_000
  const buyM2 = ceilM2(areaM2 * (1 + floor.wastePct / 100))
  const skirtingM = floor.skirting
    ? Math.round(skirtingLengthMm(points, walls, openings)) / 1000
    : 0
  return {
    areaM2,
    buyM2,
    skirtingM,
    floorTotalCents:
      floor.priceCentsPerM2 === undefined ? 0 : Math.round(buyM2 * floor.priceCentsPerM2),
    skirtingTotalCents:
      floor.skirting?.priceCentsPerM === undefined
        ? 0
        : Math.round(skirtingM * floor.skirting.priceCentsPerM),
  }
}

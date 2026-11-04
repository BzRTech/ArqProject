import type { Vec2 } from './vec'

/**
 * Transformação mundo → tela (px) para pan/zoom:
 *   tela = mundo × scale + (tx, ty)
 * O "mundo" pode ser o modelo (mm) ou uma folha (mm de papel).
 */
export interface Viewport {
  scale: number // px por mm
  tx: number
  ty: number
}

export const MIN_SCALE = 0.005
export const MAX_SCALE = 20

type Point = Vec2

export function screenToWorld(v: Viewport, p: Point): Point {
  return { x: (p.x - v.tx) / v.scale, y: (p.y - v.ty) / v.scale }
}

export function worldToScreen(v: Viewport, p: Point): Point {
  return { x: p.x * v.scale + v.tx, y: p.y * v.scale + v.ty }
}

/** Zoom mantendo fixo o ponto da tela sob o cursor. */
export function zoomAt(v: Viewport, factor: number, screen: Point): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
  const world = screenToWorld(v, screen)
  return { scale, tx: screen.x - world.x * scale, ty: screen.y - world.y * scale }
}

export function pan(v: Viewport, dx: number, dy: number): Viewport {
  return { ...v, tx: v.tx + dx, ty: v.ty + dy }
}

/** Two-finger zoom and pan, keeping the world point beneath the moving midpoint. */
export function pinch(
  v: Viewport,
  before: readonly [Point, Point],
  after: readonly [Point, Point],
): Viewport {
  const midpoint = ([a, b]: readonly [Point, Point]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const a = midpoint(before)
  const b = midpoint(after)
  const oldDistance = Math.hypot(before[1].x - before[0].x, before[1].y - before[0].y)
  const newDistance = Math.hypot(after[1].x - after[0].x, after[1].y - after[0].y)
  return pan(
    zoomAt(v, oldDistance > 0 ? Math.max(1, newDistance) / oldDistance : 1, a),
    b.x - a.x,
    b.y - a.y,
  )
}

/** Enquadra um retângulo do mundo na tela com margem em px. */
export function fit(
  world: { x: number; y: number; width: number; height: number },
  screen: { width: number; height: number },
  margin = 24,
): Viewport {
  const scale = Math.min(
    (screen.width - 2 * margin) / world.width,
    (screen.height - 2 * margin) / world.height,
  )
  return {
    scale,
    tx: (screen.width - world.width * scale) / 2 - world.x * scale,
    ty: (screen.height - world.height * scale) / 2 - world.y * scale,
  }
}

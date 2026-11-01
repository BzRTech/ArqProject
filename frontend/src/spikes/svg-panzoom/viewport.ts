/**
 * Transformação mundo (mm) → tela (px) do spike de pan/zoom:
 *   tela = mundo × scale + (tx, ty)
 * Na Fase 1 isso migra para core/geometry.
 */
export interface Viewport {
  scale: number // px por mm
  tx: number
  ty: number
}

export const MIN_SCALE = 0.005
export const MAX_SCALE = 20

export interface Point {
  x: number
  y: number
}

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

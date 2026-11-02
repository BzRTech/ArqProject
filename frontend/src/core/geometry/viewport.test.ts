import { describe, expect, it } from 'vitest'
import {
  fit,
  MAX_SCALE,
  pan,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Viewport,
} from './viewport'

const v0: Viewport = { scale: 0.1, tx: 50, ty: 20 }

describe('viewport', () => {
  it('ida e volta mundo ↔ tela', () => {
    const p = { x: 1234, y: -567 }
    const back = screenToWorld(v0, worldToScreen(v0, p))
    expect(back.x).toBeCloseTo(p.x, 9)
    expect(back.y).toBeCloseTo(p.y, 9)
  })

  it('zoom mantém o ponto sob o cursor', () => {
    const cursor = { x: 300, y: 200 }
    const before = screenToWorld(v0, cursor)
    const v1 = zoomAt(v0, 2.5, cursor)
    const after = screenToWorld(v1, cursor)
    expect(v1.scale).toBeCloseTo(0.25)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
  })

  it('zoom respeita o limite máximo', () => {
    expect(zoomAt(v0, 1e6, { x: 0, y: 0 }).scale).toBe(MAX_SCALE)
  })

  it('pan desloca em px', () => {
    expect(pan(v0, 10, -5)).toEqual({ scale: 0.1, tx: 60, ty: 15 })
  })

  it('fit centraliza o mundo', () => {
    const v = fit({ x: 0, y: 0, width: 1000, height: 500 }, { width: 600, height: 400 }, 50)
    expect(v.scale).toBeCloseTo(0.5)
    const c = worldToScreen(v, { x: 500, y: 250 })
    expect(c.x).toBeCloseTo(300)
    expect(c.y).toBeCloseTo(200)
  })
})

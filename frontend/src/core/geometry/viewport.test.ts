import { describe, expect, it } from 'vitest'
import {
  fit,
  MAX_SCALE,
  pan,
  pinch,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Viewport,
} from './viewport'

const v0: Viewport = { scale: 0.1, tx: 50, ty: 20 }

describe('viewport', () => {
  it('pinça combina zoom e translação mantendo o ponto sob o centro dos dedos', () => {
    const before = [
      { x: 200, y: 150 },
      { x: 400, y: 150 },
    ] as const
    const after = [
      { x: 150, y: 200 },
      { x: 550, y: 200 },
    ] as const
    const next = pinch(v0, before, after)
    expect(next.scale).toBeCloseTo(v0.scale * 2)
    const anchor = screenToWorld(v0, { x: 300, y: 150 })
    expect(worldToScreen(next, anchor)).toEqual({ x: 350, y: 200 })
  })
  it('pinça mantém os limites do zoom e aceita dedos coincidentes', () => {
    const next = pinch(
      v0,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: -1e6, y: 0 },
        { x: 1e6, y: 0 },
      ],
    )
    expect(next.scale).toBe(MAX_SCALE)
    expect(
      pinch(
        v0,
        [
          { x: 10, y: 10 },
          { x: 10, y: 10 },
        ],
        [
          { x: 30, y: 40 },
          { x: 30, y: 40 },
        ],
      ),
    ).toEqual(pan(v0, 20, 30))
  })
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

import { describe, expect, it } from 'vitest'
import { vec } from '../geometry/vec'
import { arcExtremePoints, entitiesBBox } from './bounds'

describe('bounds', () => {
  it('arco de 90° no 1º quadrante não estende para o lado oposto', () => {
    const b = entitiesBBox([
      { kind: 'arc', center: vec(0, 0), radius: 800, startDeg: 90, sweepDeg: -90 },
    ])
    expect(b.minX).toBeCloseTo(0)
    expect(b.minY).toBeCloseTo(0)
    expect(b.maxX).toBeCloseTo(800)
    expect(b.maxY).toBeCloseTo(800)
  })
  it('arco que cruza 0° inclui o ponto mais à direita', () => {
    const xs = arcExtremePoints(vec(0, 0), 10, -30, 60).map((p) => p.x)
    expect(Math.max(...xs)).toBeCloseTo(10)
  })
  it('grupo, retângulo e círculo', () => {
    const b = entitiesBBox([
      {
        kind: 'group',
        role: 'g',
        children: [{ kind: 'rect', x: 10, y: 10, width: 100, height: 50 }],
      },
      { kind: 'circle', center: vec(0, 0), radius: 5 },
    ])
    expect(b).toEqual({ minX: -5, minY: -5, maxX: 110, maxY: 60 })
  })
})

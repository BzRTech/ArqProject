import { describe, expect, it } from 'vitest'
import { vec } from '../geometry/vec'
import { entitiesBBox } from './bounds'
import { placeEntity, placePoint } from './transform-entities'

const pl = (rotationDeg: number, mirrorX = false, translate = vec(0, 0)) => ({
  rotationDeg,
  mirrorX,
  translate,
})

describe('placeEntity', () => {
  it('gira 90° (horário visual): +x vira +y', () => {
    const p = placePoint(vec(100, 0), pl(90))
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(100)
  })

  it('retângulo girado vira polilinha fechada', () => {
    const e = placeEntity(
      { kind: 'rect', x: 0, y: 0, width: 200, height: 100 },
      pl(90, false, vec(1000, 1000)),
    )
    expect(e.kind).toBe('polyline')
    const b = entitiesBBox([e])
    expect(b.minX).toBeCloseTo(900)
    expect(b.maxX).toBeCloseTo(1000)
    expect(b.maxY).toBeCloseTo(1200)
  })

  it('espelhar inverte o arco da porta (abre para o outro lado)', () => {
    const arc = {
      kind: 'arc' as const,
      center: vec(0, 0),
      radius: 800,
      startDeg: 90,
      sweepDeg: -90,
    }
    const m = placeEntity(arc, pl(0, true))
    expect(m).toMatchObject({ startDeg: 90, sweepDeg: 90 })
    const b = entitiesBBox([m])
    expect(b.minX).toBeCloseTo(-800)
    expect(b.maxX).toBeCloseTo(0)
    expect(b.maxY).toBeCloseTo(800)
  })

  it('texto não espelha e continua legível ao girar 180°', () => {
    const t = placeEntity({ kind: 'text', at: vec(10, 0), text: 'M01', size: 2 }, pl(180, true))
    expect(t).toMatchObject({ kind: 'text', rotationDeg: 0 })
    if (t.kind === 'text') expect(t.at.x).toBeCloseTo(10)
  })

  it('hachura acompanha a rotação', () => {
    const h = placeEntity(
      {
        kind: 'hatch',
        boundary: [vec(0, 0), vec(1, 0), vec(1, 1)],
        pattern: { kind: 'lines', angleDeg: 0, spacing: 1 },
      },
      pl(30),
    )
    expect(h.kind === 'hatch' && h.pattern.kind === 'lines' && h.pattern.angleDeg).toBe(30)
  })
})

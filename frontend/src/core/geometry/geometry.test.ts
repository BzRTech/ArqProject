import { describe, expect, it } from 'vitest'
import { bboxOf, expand, union } from './bbox'
import { area, centroid, containsPoint, hatchLines, perimeter, signedArea } from './polygon'
import { apply, chain, invert, rotation, scaling, translation } from './transform'
import { angleDeg, distance, leftNormal, polar, rotate, vec } from './vec'

const close = (a: { x: number; y: number }, b: { x: number; y: number }, digits = 9) => {
  expect(a.x).toBeCloseTo(b.x, digits)
  expect(a.y).toBeCloseTo(b.y, digits)
}

describe('vec (y para baixo)', () => {
  it('normal à esquerda de +x aponta para cima', () => {
    expect(leftNormal(vec(1, 0))).toEqual({ x: 0, y: -1 })
  })
  it('90° aponta para baixo (horário visual)', () => {
    close(polar(vec(0, 0), 10, 90), vec(0, 10))
    expect(angleDeg(vec(0, 5))).toBeCloseTo(90)
    expect(angleDeg(vec(0, -5))).toBeCloseTo(270)
  })
  it('rotate em torno de um ponto', () => {
    close(rotate(vec(20, 10), 90, vec(10, 10)), vec(10, 20))
  })
  it('distance', () => {
    expect(distance(vec(0, 0), vec(3000, 4000))).toBe(5000)
  })
})

describe('transform', () => {
  it('compõe na ordem de aplicação e inverte', () => {
    const t = chain(scaling(0.02), rotation(90), translation(60, 140))
    const p = vec(4000, 0)
    close(apply(t, p), vec(60, 220))
    close(apply(invert(t), apply(t, p)), p)
  })
})

describe('bbox', () => {
  it('une e expande', () => {
    const b = union(bboxOf([vec(0, 0), vec(10, 5)]), bboxOf([vec(-2, 8)]))
    expect(b).toEqual({ minX: -2, minY: 0, maxX: 10, maxY: 8 })
    expect(expand(b, 1)).toEqual({ minX: -3, minY: -1, maxX: 11, maxY: 9 })
  })
})

describe('polygon', () => {
  // Quarto em "L": 3500 × 3530 menos um recorte de 1000 × 1000
  const room = [
    vec(0, 0),
    vec(3500, 0),
    vec(3500, 3530),
    vec(1000, 3530),
    vec(1000, 2530),
    vec(0, 2530),
  ]

  it('área e perímetro em mm', () => {
    expect(area(room)).toBe(3500 * 3530 - 1000 * 1000)
    expect(perimeter(room)).toBe(2 * 3500 + 2 * 3530)
  })
  it('sentido horário visual tem área positiva', () => {
    expect(signedArea(room)).toBeGreaterThan(0)
    expect(signedArea([...room].reverse())).toBeLessThan(0)
  })
  it('centroide de retângulo é o centro', () => {
    close(centroid([vec(0, 0), vec(40, 0), vec(40, 20), vec(0, 20)]), vec(20, 10))
  })
  it('ponto dentro/fora', () => {
    expect(containsPoint(room, vec(500, 500))).toBe(true)
    expect(containsPoint(room, vec(500, 3000))).toBe(false)
  })
})

describe('hatchLines', () => {
  const square = [vec(0, 0), vec(10, 0), vec(10, 10), vec(0, 10)]

  it('linhas horizontais a cada 2 mm dentro de um quadrado 10×10', () => {
    const segs = hatchLines([square], 0, 2)
    expect(segs.map((s) => s.a.y)).toEqual([0, 2, 4, 6, 8])
    for (const s of segs) {
      expect(Math.min(s.a.x, s.b.x)).toBeCloseTo(0)
      expect(Math.max(s.a.x, s.b.x)).toBeCloseTo(10)
    }
  })

  it('45° fica inteira dentro do polígono', () => {
    const segs = hatchLines([square], 45, 1)
    expect(segs.length).toBeGreaterThan(10)
    for (const s of segs) {
      for (const p of [s.a, s.b]) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-9)
        expect(p.x).toBeLessThanOrEqual(10 + 1e-9)
        expect(p.y).toBeGreaterThanOrEqual(-1e-9)
        expect(p.y).toBeLessThanOrEqual(10 + 1e-9)
      }
    }
  })

  it('respeita furos (anel interno)', () => {
    const hole = [vec(3, 3), vec(7, 3), vec(7, 7), vec(3, 7)]
    const segs = hatchLines([square, hole], 0, 5, 0.5)
    // y = 5.5 atravessa o furo: dois trechos
    const at55 = segs.filter((s) => Math.abs(s.a.y - 5.5) < 1e-9)
    expect(at55).toHaveLength(2)
  })

  it('polígono côncavo gera dois trechos na mesma linha', () => {
    const u = [
      vec(0, 0),
      vec(3, 0),
      vec(3, 5),
      vec(7, 5),
      vec(7, 0),
      vec(10, 0),
      vec(10, 10),
      vec(0, 10),
    ]
    const at2 = hatchLines([u], 0, 10, 2)
    expect(at2).toHaveLength(2)
  })
})

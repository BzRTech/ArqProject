import { describe, expect, it } from 'vitest'
import { cornerAngleDeg, rightAngleSnap, vertexConstraints } from './right-angle'

// Quarto 4000 × 3000 com o canto 2 (embaixo à direita) puxado para fora: trapézio
const pts = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4300, y: 3000 },
  { x: 0, y: 3000 },
]

describe('ângulo do canto', () => {
  it('mede em graus (0–180)', () => {
    expect(cornerAngleDeg({ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 })).toBeCloseTo(90)
    expect(cornerAngleDeg(pts[0]!, pts[1]!, pts[2]!)).toBeCloseTo(95.71, 2)
  })
})

describe('auxiliar de ângulo reto ao arrastar um canto', () => {
  it('gera as restrições: 90° no próprio canto, nos vizinhos e alinhamentos', () => {
    const cs = vertexConstraints(pts, true, 2)
    expect(cs.some((c) => c.kind === 'circle')).toBe(true) // Tales: 90° no canto arrastado
    expect(cs.filter((c) => c.kind === 'line' && c.reason === 'perp')).toHaveLength(2)
    expect(cs.filter((c) => c.kind === 'line' && c.reason === 'axis')).toHaveLength(4)
  })

  it('perto do esquadro, gruda no ponto que deixa os três cantos em 90°', () => {
    // arrastando o canto 2 de volta, solto em (4020, 2990): o retângulo exato é (4000, 3000)
    const r = rightAngleSnap({ x: 4020, y: 2990 }, vertexConstraints(pts, true, 2), 40)
    expect(r?.point).toEqual({ x: 4000, y: 3000 })
    expect(r?.exact).toBe(true) // interseção de duas restrições
  })

  it('perto de uma restrição só, projeta nela (mantém o 90° no vizinho)', () => {
    // vertical por (4000, 0): 90° no canto 1; longe das outras
    const r = rightAngleSnap({ x: 4015, y: 1800 }, vertexConstraints(pts, true, 2), 40)
    expect(r?.point.x).toBe(4000)
    expect(cornerAngleDeg(pts[0]!, pts[1]!, r!.point)).toBeCloseTo(90, 1)
  })

  it('longe de tudo, não mexe', () => {
    expect(rightAngleSnap({ x: 4600, y: 1500 }, vertexConstraints(pts, true, 2), 40)).toBeNull()
  })

  it('parede aberta: o canto da ponta só tem o vizinho de um lado', () => {
    const open = [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 2000 },
    ]
    const cs = vertexConstraints(open, false, 2)
    expect(cs.some((c) => c.kind === 'circle')).toBe(false)
    const r = rightAngleSnap({ x: 3030, y: 2500 }, cs, 40)
    expect(r?.point.x).toBe(3000) // 90° no canto 1
  })
})

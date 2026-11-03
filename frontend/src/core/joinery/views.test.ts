import { describe, expect, it } from 'vitest'
import type { Primitive } from '../drawing/primitives'
import { ITEM_DEFAULTS, type Environment, type Item, type JoineryDesign } from '../project/schema'
import { dimensionDirection } from '../dimensions/layout'
import { add, leftNormal, scale } from '../geometry/vec'
import { DEFAULT_RULE_PROFILE as R } from './rules'
import { defaultDesign, joinerySheet } from './sheet'
import { solveJoinery } from './solve'
import { frontExternalView, frontInternalView, planView } from './views'

const rack: JoineryDesign = {
  heightMm: 400,
  base: { kind: 'suspended', heightMm: 100 },
  modules: [
    { widthMm: 909, front: 'door2', shelves: 1, drawers: 3 },
    { widthMm: 909, front: 'door2', shelves: 1, drawers: 3 },
    { widthMm: 909, front: 'door2', shelves: 1, drawers: 3 },
    { widthMm: 453, front: 'door1', shelves: 1, drawers: 3 },
  ],
  handle: 'touch',
}
const s = solveJoinery({ w: 3180, d: 450 }, rack, R)

describe('vistas do móvel', () => {
  it('frontal externa: 7 portas desenhadas na altura certa (suspenso 10 cm)', () => {
    const v = frontExternalView(s)
    const doors = v.filter((e) => e.kind === 'rect' && e.width === 452 && e.height === 397)
    expect(doors).toHaveLength(3)
    // porta começa 1,5 mm acima do fundo do corpo, que está 100 mm acima do piso
    expect(doors[0]).toMatchObject({ x: 1.5, y: -(100 + 1.5 + 397) })
    const chain = v.find((e) => e.kind === 'chain')!
    expect(chain.kind === 'chain' && chain.points.map((p) => p.x)).toEqual([
      0, 909, 1818, 2727, 3180,
    ])
    // altura e suspensão do lado de FORA, à direita (linha de cota em x > L)
    const dims = v.filter((e) => e.kind === 'dimension')
    expect(dims).toHaveLength(2)
    for (const d of dims) {
      if (d.kind !== 'dimension') continue
      const dir = dimensionDirection(d.p1, d.p2, d.orientation ?? 'aligned')
      expect(add(d.p1, scale(leftNormal(dir), d.offset)).x).toBeGreaterThan(3180)
    }
  })

  it('frontal interna: cadeia lateral | vão | divisória … igual à da referência', () => {
    const v = frontInternalView(s)
    const chain = v.find((e) => e.kind === 'chain' && e.orientation === 'horizontal')!
    const xs = chain.kind === 'chain' ? chain.points.map((p) => p.x) : []
    // 1,8 | 88,2 | 1,8 | 89,1 | 1,8 | 89,1 | 1,8 | 42,6 | 1,8
    const steps = xs.slice(1).map((x, i) => x - xs[i]!)
    expect(steps).toEqual([18, 882, 18, 891, 18, 891, 18, 426, 18])
    expect(v.some((e) => e.kind === 'text' && e.text === 'EMENDA')).toBe(true)
  })

  it('planta: giro de cada porta com raio = largura da porta', () => {
    const depth = planView(s, R).find((e) => e.kind === 'dimension')!
    if (depth.kind === 'dimension') {
      const dir = dimensionDirection(depth.p1, depth.p2, 'vertical')
      expect(add(depth.p1, scale(leftNormal(dir), depth.offset)).x).toBeGreaterThan(3180)
    }
    const arcs = planView(s, R).filter((e) => e.kind === 'arc')
    expect(arcs.map((a) => a.kind === 'arc' && a.radius)).toEqual([
      452, 451, 452, 451, 452, 451, 450,
    ])
  })
})

describe('prancha de detalhe', () => {
  const item: Item = {
    ...ITEM_DEFAULTS,
    id: 'r',
    blockId: 'rack',
    blockVersion: 1,
    name: 'Rack',
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    mirrored: false,
    sizeMm: { w: 3180, d: 450, h: 400 },
    joinery: { finishes: {}, grain: 'vertical', design: rack },
  } as Item
  const env: Environment = {
    id: 'e',
    name: 'Sala',
    ceilingHeightMm: 2700,
    basePlan: null,
    drawings: [],
    openings: [],
    items: [item],
  }

  it('escala automática e medida conferida no papel: porta de 452 mm = 22,6 mm em 1:20', () => {
    const sheet = joinerySheet({ name: 'Casa' }, env, item, R)!
    expect(sheet.scale).toBe(20)
    const flat = (ps: Primitive[]): Primitive[] =>
      ps.flatMap((p) => (p.kind === 'group' ? flat(p.children) : [p]))
    const prims = flat(sheet.primitives)
    const doorW = prims.flatMap((p) => {
      if (p.kind !== 'polyline' || p.points.length !== 4) return []
      const xs = p.points.map((q) => q.x)
      const ys = p.points.map((q) => q.y)
      return [[Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]]
    })
    expect(doorW.some(([w, h]) => Math.abs(w! - 22.6) < 1e-6 && Math.abs(h! - 19.85) < 1e-6)).toBe(
      true,
    )
    const texts = prims
      .filter((p) => p.kind === 'text')
      .map((p) => (p.kind === 'text' ? p.text : ''))
    expect(texts).toContain('ESPECIFICAÇÕES')
    expect(texts).toContain('M01 · Rack')
    expect(texts.some((t) => t.startsWith('VISTA FRONTAL · ESC. 1:20'))).toBe(true)
  })

  it('desenho inicial: módulos de ~90 cm somando a largura; rack suspenso com fecho toque', () => {
    const d = defaultDesign({ blockId: 'rack', sizeMm: { w: 1800, d: 450, h: 400 } })
    expect(d.modules.map((m) => m.widthMm)).toEqual([900, 900])
    expect(d).toMatchObject({
      heightMm: 400,
      base: { kind: 'suspended', heightMm: 100 },
      handle: 'touch',
    })
    const g = defaultDesign({ blockId: 'guarda-roupa', sizeMm: { w: 1500, d: 600 } })
    expect(g.modules.map((m) => m.widthMm)).toEqual([750, 750])
    expect(g.heightMm).toBe(2400)
    expect(g.modules[0]!.shelves).toBe(3)
  })
})

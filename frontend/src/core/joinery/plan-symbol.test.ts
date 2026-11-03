import { describe, expect, it } from 'vitest'
import { environmentEntities } from '../project/render'
import { itemEntities } from '../project/items'
import { ITEM_DEFAULTS, type Environment, type Item } from '../project/schema'
import { DEFAULT_RULE_PROFILE as R } from './rules'

const rack = (design?: boolean): Item =>
  ({
    ...ITEM_DEFAULTS,
    id: 'r',
    blockId: 'rack',
    blockVersion: 1,
    name: 'Rack',
    position: { x: 2000, y: 1000 },
    rotationDeg: 0,
    mirrored: false,
    sizeMm: { w: 3180, d: 450, h: 400 },
    joinery: design
      ? {
          finishes: {},
          grain: 'vertical',
          design: {
            heightMm: 400,
            base: { kind: 'suspended', heightMm: 100 },
            modules: [
              { widthMm: 909, front: 'door2', shelves: 1, drawers: 3 },
              { widthMm: 909, front: 'door2', shelves: 1, drawers: 3 },
              { widthMm: 909, front: 'door2', shelves: 1, drawers: 3 },
              { widthMm: 453, front: 'door1', shelves: 1, drawers: 3 },
            ],
            handle: 'touch',
          },
        }
      : undefined,
  }) as Item

const arcs = (es: ReturnType<typeof itemEntities>) =>
  es.filter((e) => e.kind === 'arc').map((e) => (e.kind === 'arc' ? e.radius : 0))

describe('símbolo da planta ligado ao detalhamento', () => {
  it('com detalhamento: divisórias nos eixos e o giro de cada porta', () => {
    const es = itemEntities(rack(true), { rules: R })
    expect(arcs(es)).toEqual([452, 451, 452, 451, 452, 451, 450])
    // divisórias nos eixos 909, 1818, 2727 (centro do item em x = 2000 → x0 = 410)
    const lines = es.filter((e) => e.kind === 'line' && e.style?.weight === 0.18)
    expect(lines.map((l) => (l.kind === 'line' ? Math.round(l.a.x) : 0))).toEqual([
      410 + 909,
      410 + 1818,
      410 + 2727,
    ])
  })

  it('sem detalhamento (ou sem regras): continua o símbolo do catálogo', () => {
    expect(arcs(itemEntities(rack(false), { rules: R }))).toEqual([])
    expect(arcs(itemEntities(rack(true)))).toEqual([])
  })

  it('a planta e o PDF usam o mesmo símbolo (regras passadas no render)', () => {
    const env: Environment = {
      id: 'e',
      name: 'Sala',
      ceilingHeightMm: 2700,
      basePlan: null,
      drawings: [],
      openings: [],
      items: [rack(true)],
    }
    const json = JSON.stringify(environmentEntities(env, { scale: 50, rules: R }))
    expect(json.match(/"kind":"arc"/g)).toHaveLength(7)
  })
})

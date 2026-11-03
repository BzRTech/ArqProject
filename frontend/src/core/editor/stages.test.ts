import { describe, expect, it } from 'vitest'
import { applyFinish } from '../joinery/finish'
import { getMaterial } from '../joinery/materials'
import { ITEM_DEFAULTS, type Environment, type Item } from '../project/schema'
import { editableIn, layerOf, stageBlockFilter, stageChecklist, stageEnv } from './stages'

const wall = {
  id: 'w',
  kind: 'wall' as const,
  points: [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 3000 },
    { x: 0, y: 3000 },
  ],
  closed: true,
  thicknessMm: 150,
}
const item = (id: string, blockId: string, patch: Partial<Item> = {}): Item =>
  ({
    ...ITEM_DEFAULTS,
    id,
    blockId,
    blockVersion: 1,
    name: blockId,
    position: { x: 1000, y: 1000 },
    rotationDeg: 0,
    mirrored: false,
    sizeMm: { w: 1000, d: 500 },
    ...patch,
  }) as Item
const env = (p: Partial<Environment> = {}): Environment => ({
  id: 'e',
  name: 'Sala',
  ceilingHeightMm: 2700,
  basePlan: null,
  drawings: [],
  openings: [],
  items: [],
  ...p,
})
const done = (e: Environment, stage: Parameters<typeof stageChecklist>[1]) =>
  stageChecklist(e, stage).map((s) => `${s.id}:${s.done ? '✓' : '·'}`)

describe('abas: o que cada uma edita', () => {
  it('marcenaria é camada própria; móvel comum fica no Layout', () => {
    const e = env({ items: [item('c', 'cama-casal'), item('r', 'rack')] })
    expect(layerOf(e, { kind: 'item', id: 'c' })).toBe('item')
    expect(layerOf(e, { kind: 'item', id: 'r' })).toBe('joinery')
    expect(editableIn('layout', 'item')).toBe(true)
    expect(editableIn('layout', 'joinery')).toBe(false)
    expect(editableIn('marcenaria', 'joinery')).toBe(true)
    expect(editableIn('piso', 'wall')).toBe(false)
  })

  it('catálogo: Layout sem marcenaria; Marcenaria só marcenaria', () => {
    expect(stageBlockFilter('layout')('cama-casal')).toBe(true)
    expect(stageBlockFilter('layout')('rack')).toBe(false)
    expect(stageBlockFilter('marcenaria')('rack')).toBe(true)
    expect(stageBlockFilter('planta')('cama-casal')).toBe(false)
  })
})

describe('passo a passo de cada aba', () => {
  it('Planta: marca o que já foi feito', () => {
    expect(done(env(), 'planta')).toEqual(['walls:·', 'openings:·', 'columns:·', 'wall-dims:·'])
    const e = env({
      drawings: [
        wall,
        {
          id: 'd',
          kind: 'chain',
          ref: { kind: 'wall-outer', wallId: 'w', segment: 0 },
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
          orientation: 'horizontal',
          offsetMm: 400,
          total: false,
        },
      ],
    })
    expect(done(e, 'planta')).toEqual(['walls:✓', 'openings:·', 'columns:·', 'wall-dims:✓'])
  })

  it('Piso: área criada, depois revestimento', () => {
    const area = { id: 'a', kind: 'area' as const, points: wall.points, name: 'Sala' }
    expect(done(env({ drawings: [wall, area] }), 'piso')).toEqual([
      'area:✓',
      'floor:·',
      'skirting:·',
    ])
  })

  it('Marcenaria: acabamento completo só com as 3 partes em todos os móveis', () => {
    const freijo = getMaterial('freijo')!
    const parcial = item('r', 'rack', { joinery: applyFinish(undefined, ['frentes'], freijo) })
    expect(done(env({ items: [parcial] }), 'marcenaria')).toEqual([
      'joinery:✓',
      'detail:·',
      'finishes:·',
      'notes:·',
    ])
    const completo = item('r', 'rack', {
      joinery: { ...applyFinish(undefined, 'all', freijo), notes: 'Cava 45°' },
    })
    expect(done(env({ items: [completo] }), 'marcenaria')).toEqual([
      'joinery:✓',
      'detail:·',
      'finishes:✓',
      'notes:✓',
    ])
  })

  it('Layout: preço preenchido em todos (existente não conta)', () => {
    const e = env({
      items: [
        item('c', 'cama-casal', { unitPriceCents: 150000 }),
        item('t', 'tapete', { existing: true }),
      ],
    })
    expect(done(e, 'layout')).toEqual(['furniture:✓', 'prices:✓', 'item-dims:·'])
  })
})

describe('stageEnv', () => {
  it('cada aba vê só as suas camadas', () => {
    const e = env({
      drawings: [wall, { id: 'a', kind: 'area', points: wall.points, name: 'Sala' }],
      items: [item('c', 'cama-casal'), item('r', 'rack')],
      openings: [
        {
          id: 'p',
          wallId: 'w',
          segment: 0,
          offsetMm: 1000,
          widthMm: 800,
          heightMm: 2100,
          sillMm: 0,
          type: 'porta-abrir',
          hinge: 'start',
          side: 'left',
        },
      ],
    })
    const ids = (st: Parameters<typeof stageEnv>[1]) => {
      const x = stageEnv(e, st)
      return [...x.drawings, ...x.items, ...x.openings].map((o) => o.id)
    }
    expect(ids('planta')).toEqual(['w', 'p'])
    expect(ids('layout')).toEqual(['c'])
    expect(ids('piso')).toEqual(['a'])
    expect(ids('marcenaria')).toEqual(['r'])
    expect(ids('pranchas')).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { dimensionDirection } from '../dimensions/layout'
import { add, leftNormal, scale, vec } from '../geometry/vec'
import {
  createItemDims,
  createWallDims,
  itemSideGap,
  syncLinkedDims,
  wallInnerDimensions,
} from './linked-dims'
import { ITEM_DEFAULTS, type Environment, type Item, type Wall } from './schema'
import { moveVertex } from './wall-edit'

// Quarto 4,40 × 3,80 interno, parede de 15 (eixo -75..4475 × -75..3875)
const quarto: Wall = {
  id: 'q',
  kind: 'wall',
  points: [vec(-75, -75), vec(4475, -75), vec(4475, 3875), vec(-75, 3875)],
  closed: true,
  thicknessMm: 150,
}
const cama: Item = {
  ...ITEM_DEFAULTS,
  id: 'c',
  blockId: 'cama-casal',
  blockVersion: 1,
  name: 'Cama',
  position: vec(2200, 1000), // centro
  rotationDeg: 0,
  mirrored: false,
  sizeMm: { w: 1600, d: 2000 },
} as Item

const env = (patch: Partial<Environment> = {}): Environment => ({
  id: 'e',
  name: 'Quarto',
  ceilingHeightMm: 2700,
  basePlan: null,
  drawings: [quarto],
  openings: [],
  items: [],
  ...patch,
})

let n = 0
const newId = () => `d${++n}`

describe('cotas internas (área útil)', () => {
  it('uma cota por trecho, de face interna a face interna', () => {
    const dims = wallInnerDimensions(quarto)
    expect(dims.map((d) => d.segment)).toEqual([0, 1, 2, 3])
    expect(dims[0]).toMatchObject({ p1: vec(0, 0), p2: vec(4400, 0), orientation: 'horizontal' })
    expect(dims[1]).toMatchObject({
      p1: vec(4400, 0),
      p2: vec(4400, 3800),
      orientation: 'vertical',
    })
  })

  it('a linha de cota fica DENTRO do cômodo, a 40 cm da face', () => {
    for (const d of wallInnerDimensions(quarto)) {
      const dir = dimensionDirection(d.p1, d.p2, d.orientation)
      const base = add(d.p1, scale(leftNormal(dir), d.offsetMm))
      expect(base.x).toBeGreaterThanOrEqual(0)
      expect(base.x).toBeLessThanOrEqual(4400)
      expect(base.y).toBeGreaterThanOrEqual(0)
      expect(base.y).toBeLessThanOrEqual(3800)
    }
    const [top] = wallInnerDimensions(quarto)
    expect(add(top!.p1, scale(leftNormal(vec(1, 0)), top!.offsetMm)).y).toBe(400)
  })
})

describe('Cotar parede: externa com os vãos + área útil, ligadas', () => {
  it('cria as cadeias externas e só as internas que não se repetem (retângulo: 2)', () => {
    const ds = createWallDims(env(), 'q', newId)
    const outer = ds.filter((d) => d.kind === 'chain')
    const inner = ds.filter((d) => d.kind === 'dimension')
    expect(outer).toHaveLength(4)
    expect(inner).toHaveLength(2) // largura e profundidade úteis
    expect(inner.map((d) => d.ref)).toEqual([
      { kind: 'wall-inner', wallId: 'q', segment: 0 },
      { kind: 'wall-inner', wallId: 'q', segment: 1 },
    ])
  })

  it('acompanham a parede quando um canto anda', () => {
    const e = env()
    e.drawings = [quarto, ...createWallDims(e, 'q', newId)]
    const moved = {
      ...e,
      drawings: e.drawings.map((d) => (d.id === 'q' ? moveVertex(quarto, 1, vec(4975, -75)) : d)),
    }
    // cantos 1 e 2 → trecho de cima fica 5050 no eixo; puxo também o canto 2
    const moved2 = {
      ...moved,
      drawings: moved.drawings.map((d) =>
        d.id === 'q' ? moveVertex(d as Wall, 2, vec(4975, 3875)) : d,
      ),
    }
    const out = syncLinkedDims(moved2)
    const top = out.find(
      (d) => d.kind === 'dimension' && d.ref?.kind === 'wall-inner' && d.ref.segment === 0,
    )
    expect(top).toMatchObject({ p1: vec(0, 0), p2: vec(4900, 0) })
    const outerTop = out.find(
      (d) => d.kind === 'chain' && d.ref?.kind === 'wall-outer' && d.ref.segment === 0,
    )
    expect(outerTop && 'points' in outerTop && outerTop.points).toEqual([
      vec(-150, -150),
      vec(5050, -150),
    ])
  })

  it('apagar a parede apaga as cotas dela', () => {
    const e = env()
    e.drawings = [quarto, ...createWallDims(e, 'q', newId)]
    expect(syncLinkedDims({ ...e, drawings: e.drawings.filter((d) => d.id !== 'q') })).toEqual([])
  })

  it('sem mudança, devolve o MESMO array (não dispara salvamento à toa)', () => {
    const e = env()
    e.drawings = [quarto, ...createWallDims(e, 'q', newId)]
    expect(syncLinkedDims(e)).toBe(e.drawings)
  })
})

describe('cotas dos móveis até as paredes', () => {
  it('folga de cada lado até a face interna', () => {
    const e = env({ items: [cama] })
    // cama 160 × 200 centrada em (2200, 1000): x 1400..3000, y 0..2000
    expect(itemSideGap(e, cama, 0)?.gap).toBeCloseTo(0) // encostada em cima
    expect(itemSideGap(e, cama, 1)?.gap).toBe(1400) // direita: 3000 → 4400
    expect(itemSideGap(e, cama, 2)?.gap).toBe(1800) // baixo: 2000 → 3800
    expect(itemSideGap(e, cama, 3)?.gap).toBe(1400) // esquerda: 0 ← 1400
  })

  it('Cotar posição cria só os lados com folga, e elas seguem o móvel', () => {
    const e = env({ items: [cama] })
    const dims = createItemDims(e, 'c', newId)
    expect(dims.map((d) => d.kind === 'dimension' && d.ref)).toEqual([
      { kind: 'item', itemId: 'c', side: 1 },
      { kind: 'item', itemId: 'c', side: 2 },
      { kind: 'item', itemId: 'c', side: 3 },
    ])
    const moved: Environment = {
      ...e,
      drawings: [...e.drawings, ...dims],
      items: [{ ...cama, position: vec(2000, 1000) }],
    }
    const out = syncLinkedDims(moved)
    const left = out.find(
      (d) => d.kind === 'dimension' && d.ref?.kind === 'item' && d.ref.side === 3,
    )
    expect(left).toMatchObject({ p1: vec(1200, 1000), p2: vec(0, 1000) })
  })

  it('móvel apagado leva as cotas dele', () => {
    const e = env({ items: [cama] })
    e.drawings = [quarto, ...createItemDims(e, 'c', newId)]
    expect(syncLinkedDims({ ...e, items: [] }).filter((d) => d.kind === 'dimension')).toEqual([])
  })
})

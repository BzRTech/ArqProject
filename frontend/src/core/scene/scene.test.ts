import { describe, expect, it } from 'vitest'
import { ITEM_DEFAULTS, newEnvironment, type Item } from '../project/schema'
import { DEFAULT_RULE_PROFILE as rules } from '../joinery/rules'
import { solveJoinery } from '../joinery/solve'
import { environmentScene, itemGroup } from './environment'
import { joineryBoxes } from './joinery'
import { CATALOG } from '../blocks/catalog'

const rack: Item = {
  ...ITEM_DEFAULTS,
  id: 'rack',
  blockId: 'rack',
  blockVersion: 1,
  name: 'Rack',
  position: { x: 2000, y: 1000 },
  rotationDeg: 90,
  mirrored: true,
  sizeMm: { w: 1800, d: 450 },
  joinery: {
    grain: 'horizontal',
    finishes: {
      frentes: { materialId: 'freijo', name: 'Freijó', kind: 'madeirado', hex: '#b88a5a' },
    },
    design: {
      heightMm: 400,
      base: { kind: 'suspended', heightMm: 100 },
      handle: 'touch',
      modules: [
        { widthMm: 900, front: 'door2', shelves: 1, drawers: 2 },
        { widthMm: 900, front: 'drawers', shelves: 0, drawers: 2 },
      ],
    },
  },
}

describe('3D do documento', () => {
  it.each(CATALOG)('gera um modelo composto para $id nas medidas padrão e mínimas', (block) => {
    for (const size of [block.defaultSize, { ...block.defaultSize, ...block.minSize }]) {
      const item = {
        ...rack,
        blockId: block.id,
        blockVersion: block.version,
        sizeMm: size,
        joinery: undefined,
      }
      const before = JSON.stringify(item)
      for (const open of [false, true]) {
        const group = itemGroup(item, rules, open)
        expect(group.boxes.length).toBeGreaterThan(1)
        expect(group.boxes.every((b) => b.size.every((n) => Number.isFinite(n) && n > 0))).toBe(
          true,
        )
        expect(group.boxes.every((b) => b.center.every(Number.isFinite))).toBe(true)
      }
      expect(JSON.stringify(item)).toBe(before)
    }
  })
  it.each([
    ['cama-solteiro', 880, 1880, 1],
    ['cama-casal', 1580, 2000, 2],
    ['cama-king', 1930, 2030, 2],
  ] as const)(
    'representa %s com colchão, cabeceira e travesseiros dentro da planta',
    (blockId, w, d, pillows) => {
      const item = { ...rack, blockId, joinery: undefined, sizeMm: { w, d, h: 500 } }
      const group = itemGroup(item, rules, false)
      expect(group.boxes.filter((b) => b.name === 'Travesseiro')).toHaveLength(pillows)
      expect(group.boxes.map((b) => b.name)).toEqual(
        expect.arrayContaining(['Colchão', 'Base estofada', 'Cabeceira estofada', 'Edredom']),
      )
      for (const box of group.boxes) {
        expect(Math.abs(box.center[0]) + box.size[0] / 2).toBeLessThanOrEqual(w / 2)
        expect(Math.abs(box.center[2]) + box.size[2] / 2).toBeLessThanOrEqual(d / 2)
        expect(box.radiusMm).toBeGreaterThan(0)
        expect(box.center[1] - box.size[1] / 2).toBeGreaterThanOrEqual(0)
      }
      expect(group).toMatchObject({
        center: [2000, 0, 1000],
        mirrored: true,
        rotationY: -Math.PI / 2,
      })
    },
  )
  it('usa as dimensões e a quantidade das peças do motor, com elevação e acabamentos', () => {
    const boxes = joineryBoxes(rack, rules, false)
    const solved = solveJoinery(rack.sizeMm, rack.joinery!.design!, rules)
    expect(boxes).toHaveLength(solved.panels.reduce((n, p) => n + p.qty, 0))
    expect(boxes.find((b) => b.name === 'Lateral esquerda')).toMatchObject({
      size: [18, 400, 450],
      center: [-891, 300, 0],
    })
    expect(boxes.filter((b) => b.name === 'Porta').map((b) => b.size[0])).toEqual(
      solved.doors.map((d) => d.w),
    )
    expect(boxes.find((b) => b.name === 'Porta')).toMatchObject({
      finish: rack.joinery!.finishes.frentes,
      grain: 'horizontal',
    })
    expect(itemGroup(rack, rules, false)).toMatchObject({
      center: [2000, 0, 1000],
      rotationY: -Math.PI / 2,
      mirrored: true,
    })
  })
  it('abre as duas portas para a frente e desloca as gavetas, preservando o corpo', () => {
    const closed = joineryBoxes(rack, rules, false),
      opened = joineryBoxes(rack, rules, true)
    const doors = opened.filter((b) => b.name === 'Porta')
    expect(doors.map((b) => b.rotationY)).toEqual([-Math.PI / 2, Math.PI / 2])
    expect(doors.every((b) => b.center[2] > rack.sizeMm.d / 2)).toBe(true)
    const drawer = opened.find((b) => b.name === 'Frente de gaveta')!
    expect(drawer.center[2] - closed.find((b) => b.name === 'Frente de gaveta')!.center[2]).toBe(
      450 * 0.65,
    )
    expect(opened.filter((b) => !['Porta', 'Frente de gaveta'].includes(b.name))).toEqual(
      closed.filter((b) => !['Porta', 'Frente de gaveta'].includes(b.name)),
    )
  })
  it('recorta a janela somente entre o peitoril e a verga', () => {
    const env = newEnvironment('e', 'Sala')
    env.drawings.push({
      id: 'w',
      kind: 'wall',
      points: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
      ],
      closed: false,
      thicknessMm: 150,
    })
    env.openings.push({
      id: 'o',
      wallId: 'w',
      segment: 0,
      offsetMm: 2000,
      widthMm: 1200,
      heightMm: 1000,
      sillMm: 900,
      type: 'janela-fixa',
      hinge: 'start',
      side: 'left',
    })
    const slabs = environmentScene(env, rules, false).slabs
    expect(slabs.filter((s) => s.bottom === 0)).toHaveLength(1)
    expect(slabs.filter((s) => s.bottom === 900)).toHaveLength(2)
    expect(slabs.filter((s) => s.bottom === 1900)).toHaveLength(1)
    expect(slabs.every((s) => s.bottom + s.height <= env.ceilingHeightMm)).toBe(true)
  })
  it('aceita ambientes vazios e móveis antigos sem detalhamento', () => {
    expect(environmentScene(newEnvironment('e', 'Sala'), rules, false)).toEqual({
      groups: [],
      slabs: [],
    })
    const old = { ...rack, joinery: undefined }
    expect(itemGroup(old, rules, true).boxes.length).toBeGreaterThan(1)
    expect(old.joinery).toBeUndefined()
  })
})

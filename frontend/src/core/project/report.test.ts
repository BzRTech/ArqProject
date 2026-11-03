import { describe, expect, it } from 'vitest'
import { ITEM_DEFAULTS, newProject, type Item } from './schema'
import { ProjectReportSchema, projectReport } from './report'

const item = (id: string, blockId: string, over: Partial<Item> = {}): Item => ({
  ...ITEM_DEFAULTS,
  id,
  blockId,
  blockVersion: 1,
  name: blockId === 'sofa' ? 'Sofá' : 'Rack',
  position: { x: 0, y: 0 },
  rotationDeg: 0,
  mirrored: false,
  sizeMm: { w: 2100, d: 900 },
  ...over,
})

describe('relatório do memorial', () => {
  it('agrupa como a legenda, com marcador, disciplina, preço e totais', () => {
    const p = newProject('e1')
    p.environments[0]!.name = 'Sala'
    p.environments[0]!.items.push(
      item('a', 'sofa', { unitPriceCents: 450000, supplier: 'Loja X', approved: true }),
      item('b', 'sofa', { unitPriceCents: 450000, supplier: 'Loja X', approved: false }),
      item('c', 'rack', { name: 'Rack', unitPriceCents: 300000, notes: 'Rasgo para fiação' }),
    )
    const r = projectReport(p)
    expect(ProjectReportSchema.safeParse(r).success).toBe(true)
    const [sofa, rack] = r.environments[0]!.lines
    expect(sofa).toMatchObject({
      label: '1',
      discipline: 'layout',
      name: 'Sofá',
      qty: 2,
      supplier: 'Loja X',
      unitPriceCents: 450000,
      totalCents: 900000,
      approved: false,
      itemIds: ['a', 'b'],
    })
    expect(rack).toMatchObject({
      label: 'M01',
      discipline: 'marcenaria',
      detail: 'Rasgo para fiação',
    })
    expect(r.environments[0]!.totalCents).toBe(1200000)
    expect(r.totalCents).toBe(1200000)
  })
})

import { describe, expect, it } from 'vitest'
import { ITEM_DEFAULTS, newProject, type Item } from '@/core/project/schema'
import { projectItemsCsv } from './export-csv'

const item = (patch: Partial<Item>): Item => ({
  id: Math.random().toString(36),
  blockId: 'cadeira',
  blockVersion: 1,
  name: 'Cadeira',
  position: { x: 0, y: 0 },
  rotationDeg: 0,
  mirrored: false,
  sizeMm: { w: 450, d: 500 },
  ...ITEM_DEFAULTS,
  ...patch,
})

describe('planilha de itens (CSV pt-BR)', () => {
  it('BOM, ";" como separador, vírgula decimal, marcador e total', () => {
    const p = newProject('e')
    p.environments[0]!.name = 'Jantar'
    p.environments[0]!.items.push(
      item({ qty: 6, unitPriceCents: 45990, supplier: 'Loja; Centro' }),
      item({ blockId: 'rack', name: 'Rack', sizeMm: { w: 3180, d: 450 }, unitPriceCents: 1250000 }),
    )
    const csv = projectItemsCsv(p)
    expect(csv.startsWith('﻿Ambiente;Marcador;Item;Qtd')).toBe(true)
    const lines = csv.trim().split('\r\n')
    expect(lines[1]).toBe('Jantar;1;Cadeira;6;un;45;50;;"Loja; Centro";459,90;2759,40;não;não;;')
    expect(lines[2]).toContain('Jantar;M01;Rack;1;un;318;45')
    expect(lines.at(-1)).toContain('TOTAL;;;;;;;;15259,40')
  })
})

describe('planilha — marcenaria', () => {
  it('coluna de acabamento e observações do marceneiro', async () => {
    const { newProject } = await import('@/core/project/schema')
    const { applyFinish } = await import('@/core/joinery/finish')
    const { getMaterial } = await import('@/core/joinery/materials')
    const p = newProject('e')
    p.environments[0]!.items.push({
      id: 'r',
      blockId: 'rack',
      blockVersion: 1,
      name: 'Rack',
      position: { x: 0, y: 0 },
      rotationDeg: 0,
      mirrored: false,
      sizeMm: { w: 1800, d: 450 },
      qty: 1,
      unit: 'un',
      showMarker: true,
      inLegend: true,
      existing: false,
      approved: false,
      joinery: { ...applyFinish(undefined, 'all', getMaterial('grafite')!), notes: 'Puxador cava' },
    })
    const [head, row] = projectItemsCsv(p).replace('﻿', '').split('\r\n')
    expect(head!.split(';').at(-1)).toBe('Acabamento (marcenaria)')
    const cells = row!.split(';')
    expect(cells.at(-1)).toBe('Frentes: Grafite · Corpo: Grafite · Tamponamento: Grafite')
    expect(cells.at(-2)).toBe('Puxador cava')
  })
})

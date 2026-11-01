import { describe, expect, it } from 'vitest'
import { entitiesBBox } from '../drawing/bounds'
import { compileView } from '../drawing/compile'
import { walk } from '../drawing/primitives'
import { vec } from '../geometry/vec'
import { buildPlanSheet } from '../sheets/plan-sheet'
import { areaEntities, areaM2Text, innerFacePolygon } from './areas'
import { budgetSummary, computeLegend, environmentMarkers, itemTotalCents } from './markers'
import { environmentEntities } from './render'
import { ITEM_DEFAULTS, newProject, type Item, type Wall } from './schema'

let seq = 0
const item = (blockId: string, patch: Partial<Item> = {}): Item => ({
  id: `i${++seq}`,
  blockId,
  blockVersion: 1,
  name: blockId,
  position: vec(1000, 1000),
  rotationDeg: 0,
  mirrored: false,
  sizeMm: { w: 450, d: 400 },
  ...ITEM_DEFAULTS,
  ...patch,
})

describe('legenda e marcadores', () => {
  it('itens iguais dividem o número e somam a quantidade', () => {
    const items = [
      item('cama-casal', { name: 'Cama', sizeMm: { w: 1580, d: 2000 } }),
      item('criado-mudo', { name: 'Criado' }),
      item('criado-mudo', { name: 'Criado' }),
      item('criado-mudo', { name: 'Criado', sizeMm: { w: 500, d: 400 } }), // medida diferente → outro número
    ]
    const { rows, labelOf } = computeLegend({ items })
    expect(rows.map((r) => [r.label, r.name, r.qty])).toEqual([
      ['1', 'Cama', 1],
      ['2', 'Criado', 2],
      ['3', 'Criado', 1],
    ])
    expect(labelOf.get(items[2]!.id)).toBe('2')
  })

  it('marcenaria tem sequência própria M01, M02…', () => {
    const items = [item('rack'), item('sofa'), item('guarda-roupa'), item('cadeira')]
    expect(computeLegend({ items }).rows.map((r) => r.label)).toEqual(['M01', '1', 'M02', '2'])
  })

  it('fora da legenda não tem número nem balão', () => {
    const items = [item('sofa', { inLegend: false }), item('cadeira')]
    const { rows, labelOf } = computeLegend({ items })
    expect(rows.map((r) => r.label)).toEqual(['1'])
    expect(labelOf.has(items[0]!.id)).toBe(false)
  })

  it('"sem marcador" continua na legenda, mas não desenha o balão', () => {
    const items = [item('sofa', { showMarker: false }), item('cadeira')]
    expect(computeLegend({ items }).rows).toHaveLength(2)
    const circles = environmentMarkers({ items }, 50).filter((e) => e.kind === 'circle')
    expect(circles).toHaveLength(1)
  })

  it('balão com 2,6 mm de raio no papel, em qualquer escala', () => {
    const [c] = environmentMarkers({ items: [item('sofa')] }, 25)
    expect(c).toMatchObject({ kind: 'circle', radius: 2.6 * 25 })
  })
})

describe('orçamento (centavos)', () => {
  it('total = qtd × preço; existente e sem preço não somam', () => {
    const items = [
      item('cadeira', { qty: 6, unitPriceCents: 45990 }),
      item('tapete', { qty: 2.5, unit: 'm²', unitPriceCents: 18990 }),
      item('sofa', { existing: true, unitPriceCents: 999900 }),
      item('poltrona', { approved: true }),
    ]
    expect(itemTotalCents(items[1]!)).toBe(47475)
    expect(budgetSummary(items)).toEqual({
      totalCents: 6 * 45990 + 47475,
      itemCount: 4,
      approvedCount: 1,
      missingPrice: 1,
    })
  })

  it('linha da legenda: preço único só se todos iguais', () => {
    const items = [
      item('cadeira', { name: 'C', unitPriceCents: 100 }),
      item('cadeira', { name: 'C', unitPriceCents: 200 }),
    ]
    const [row] = computeLegend({ items }).rows
    expect(row!.unitPriceCents).toBeUndefined()
    expect(row!.totalCents).toBe(300)
  })
})

describe('áreas', () => {
  const room: Wall = {
    id: 'w',
    kind: 'wall',
    points: [vec(-75, -75), vec(4475, -75), vec(4475, 3875), vec(-75, 3875)],
    closed: true,
    thicknessMm: 150,
  }

  it('polígono das faces internas de um ambiente fechado', () => {
    const poly = innerFacePolygon(room)!
    const bb = entitiesBBox([{ kind: 'polyline', points: poly, closed: true }])
    expect(bb).toEqual({ minX: 0, minY: 0, maxX: 4400, maxY: 3800 })
    expect(areaM2Text({ points: poly })).toBe('16,72 m²')
  })

  it('parede aberta não tem área', () => {
    expect(innerFacePolygon({ ...room, closed: false })).toBeNull()
  })

  it('rótulo: nome em maiúsculas e m²', () => {
    const es = areaEntities(
      {
        id: 'a',
        kind: 'area',
        name: 'Quarto',
        points: [vec(0, 0), vec(4400, 0), vec(4400, 3800), vec(0, 3800)],
      },
      50,
    )
    const texts = es.flatMap((e) => (e.kind === 'text' ? [e.text] : []))
    expect(texts).toEqual(['16,72 m²', 'QUARTO'])
  })
})

describe('prancha com legenda', () => {
  it('desenha a legenda e reserva espaço para ela', () => {
    const p = newProject('e')
    const env = p.environments[0]!
    env.items.push(
      item('cama-casal', { name: 'Cama de casal', sizeMm: { w: 1580, d: 2000 } }),
      item('rack', { name: 'Rack' }),
    )
    const legend = computeLegend(env).rows.map((r) => ({
      label: r.label,
      text: r.name,
      qty: `${r.qty} ${r.unit}`,
    }))
    const sheet = buildPlanSheet({
      title: 'Quarto',
      subtitle: 'P',
      build: (s) => environmentEntities(env, { scale: s }),
      legend,
    })
    const texts = [...walk(sheet.primitives)].flatMap((x) => (x.kind === 'text' ? [x.text] : []))
    expect(texts).toEqual(
      expect.arrayContaining(['LEGENDA', '1', 'Cama de casal', '1 un', 'M01', 'Rack']),
    )
    const roles = [...walk(sheet.primitives)].flatMap((x) => (x.kind === 'group' ? [x.role] : []))
    expect(roles).toContain('legenda')
    expect(roles).toContain('marcadores')
    expect(() => compileView([], { scale: 1, origin: vec(0, 0) })).not.toThrow()
  })
})

describe('balões e rótulos arrastáveis', () => {
  it('marcador e rótulo de área seguem o deslocamento, sem mexer no item/área', () => {
    const it0 = item('sofa', { position: vec(1000, 1000), markerOffset: vec(0, 600) })
    const [circle] = environmentMarkers({ items: [it0] }, 50)
    expect(circle).toMatchObject({ kind: 'circle', center: { x: 1000, y: 1600 } })
    const es = areaEntities(
      {
        id: 'a',
        kind: 'area',
        name: '',
        points: [vec(0, 0), vec(1000, 0), vec(1000, 1000)],
        labelOffset: vec(100, 0),
      },
      50,
    )
    const text = es.find((e) => e.kind === 'text')
    expect(text).toMatchObject({ at: { x: 2000 / 3 + 100 } })
  })
})

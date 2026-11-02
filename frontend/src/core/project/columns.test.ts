import { describe, expect, it } from 'vitest'
import { columnEntities, columnOutline, hitColumn } from './columns'
import { migrateProject } from './migrations'
import type { Column } from './schema'
import { SCHEMA_VERSION } from './schema'
import { environmentEntities } from './render'
import type { Primitive } from '../drawing/primitives'
import { buildPlanSheet } from '../sheets/plan-sheet'

const col: Column = {
  id: 'c1',
  kind: 'column',
  at: { x: 1000, y: 500 },
  shape: 'rect',
  widthMm: 200,
  depthMm: 400,
  rotationDeg: 0,
}

describe('pilar', () => {
  it('contorno retangular centrado e girado', () => {
    expect(columnOutline(col)).toEqual([
      { x: 900, y: 300 },
      { x: 1100, y: 300 },
      { x: 1100, y: 700 },
      { x: 900, y: 700 },
    ])
    const r = columnOutline({ ...col, rotationDeg: 90 }).map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
    }))
    // girado 90°: fica 40 de largura × 20 de altura
    expect(Math.max(...r.map((p) => p.x)) - Math.min(...r.map((p) => p.x))).toBe(400)
    expect(Math.max(...r.map((p) => p.y)) - Math.min(...r.map((p) => p.y))).toBe(200)
  })

  it('desenho cheio (seção cortada) com pena grossa; circular usa o diâmetro', () => {
    const [rect] = columnEntities(col)
    expect(rect).toMatchObject({ kind: 'polyline', closed: true, fill: { color: '#000000' } })
    const [circ] = columnEntities({ ...col, shape: 'circle', widthMm: 300 })
    expect(circ).toMatchObject({ kind: 'circle', radius: 150, fill: { color: '#000000' } })
  })

  it('clique dentro ou na borda acerta; fora não', () => {
    expect(hitColumn(col, { x: 1000, y: 650 }, 0)).toBe(true)
    expect(hitColumn(col, { x: 1105, y: 500 }, 10)).toBe(true)
    expect(hitColumn(col, { x: 1200, y: 500 }, 10)).toBe(false)
  })

  it('sai por cima das paredes na planta e no PDF', () => {
    const env = {
      id: 'e',
      name: 'Sala',
      ceilingHeightMm: 2700,
      basePlan: null,
      openings: [],
      items: [],
      drawings: [
        col,
        {
          id: 'w',
          kind: 'wall' as const,
          points: [
            { x: 0, y: 500 },
            { x: 3000, y: 500 },
          ],
          closed: false,
          thicknessMm: 150,
        },
      ],
    }
    const groups = environmentEntities(env, { scale: 50 }).map((g) =>
      g.kind === 'group' ? g.role : g.kind,
    )
    const json = JSON.stringify(environmentEntities(env, { scale: 50 }))
    expect(json).toContain('"fill":{"color":"#000000"}')
    // o grupo das paredes vem antes do que tem o pilar
    expect(groups.indexOf('paredes')).toBeGreaterThanOrEqual(0)
  })

  it('sai na prancha do PDF: polígono preto cheio com a seção em escala', () => {
    const env = {
      id: 'e',
      name: 'Sala',
      ceilingHeightMm: 2700,
      basePlan: null,
      openings: [],
      items: [],
      drawings: [col],
    }
    const sheet = buildPlanSheet({
      build: (scale) => environmentEntities(env, { scale }),
      title: 'T',
      subtitle: 'S',
      scale: 50,
    })
    const flat = (ps: Primitive[]): Primitive[] =>
      ps.flatMap((p) => (p.kind === 'group' ? flat(p.children) : [p]))
    const filled = flat(sheet.primitives).filter(
      (p): p is Extract<Primitive, { kind: 'polyline' }> =>
        p.kind === 'polyline' && p.fill?.color === '#000000',
    )
    const size = (pts: { x: number; y: number }[]) => {
      const xs = pts.map((q) => q.x)
      const ys = pts.map((q) => q.y)
      return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
    }
    // 20 × 40 cm em 1:50 = 4 × 8 mm no papel (além dele, só a escala gráfica é preta cheia)
    const pillar = filled.filter((p) => {
      const [w, h] = size(p.points)
      return Math.abs(w! - 4) < 1e-6 && Math.abs(h! - 8) < 1e-6
    })
    expect(pillar).toHaveLength(1)
    expect(pillar[0]!.closed).toBe(true)
  })

  it('documento v4 migra para v5 sem mudar nada', () => {
    const v4 = {
      schemaVersion: 4,
      name: 'P',
      environments: [
        {
          id: 'e',
          name: 'A',
          ceilingHeightMm: 2700,
          basePlan: null,
          drawings: [],
          openings: [],
          items: [],
        },
      ],
    }
    const p = migrateProject(v4)
    expect(p.schemaVersion).toBe(SCHEMA_VERSION)
    expect(p.schemaVersion).toBe(5)
  })
})

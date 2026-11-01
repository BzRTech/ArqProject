import { describe, expect, it } from 'vitest'
import { entitiesBBox } from '../drawing/bounds'
import { walk } from '../drawing/primitives'
import { vec } from '../geometry/vec'
import { buildPlanSheet } from '../sheets/plan-sheet'
import { chooseScale } from '../sheets/fit'
import { snapPoint } from '../editor/snap'
import { calibrateBasePlan } from './base-plan'
import { hitItem, itemCorners, itemEntities } from './items'
import { environmentEntities } from './render'
import { ITEM_DEFAULTS, newProject, ProjectSchema, type Item } from './schema'
import { hitWall, wallOutline } from './walls'

const bed: Item = {
  id: 'i1',
  blockId: 'cama-casal',
  blockVersion: 1,
  name: 'Cama de casal',
  position: vec(2000, 1500),
  rotationDeg: 0,
  mirrored: false,
  sizeMm: { w: 1600, d: 2000 },
  ...ITEM_DEFAULTS,
}

describe('schema do projeto', () => {
  it('projeto novo é válido', () => {
    expect(ProjectSchema.safeParse(newProject('e1')).success).toBe(true)
  })
  it('rejeita mm fracionário', () => {
    const p = newProject('e1')
    p.environments[0]!.items.push({ ...bed, position: vec(10.5, 0) })
    expect(ProjectSchema.safeParse(p).success).toBe(false)
  })
})

describe('itens', () => {
  it('cantos no modelo, centrados em position', () => {
    expect(itemCorners(bed)).toEqual([
      vec(1200, 500),
      vec(2800, 500),
      vec(2800, 2500),
      vec(1200, 2500),
    ])
  })
  it('girado 90°: troca largura e profundidade na caixa', () => {
    const b = entitiesBBox(itemEntities({ ...bed, rotationDeg: 90 }))
    expect(b.maxX - b.minX).toBeCloseTo(2000)
    expect(b.maxY - b.minY).toBeCloseTo(1600)
  })
  it('acerto por clique respeita a rotação', () => {
    const r = { ...bed, rotationDeg: 90 }
    expect(hitItem(r, vec(2000 + 950, 1500))).toBe(true) // dentro (meia-profundidade 1000)
    expect(hitItem(r, vec(2000, 1500 + 950))).toBe(false) // fora (meia-largura 800)
  })
})

describe('paredes', () => {
  it('parede reta de 15 cm vira retângulo em volta do eixo', () => {
    const o = wallOutline([vec(0, 0), vec(4000, 0)], 150, false)!
    expect(o.rings[0]).toEqual([vec(0, -75), vec(4000, -75), vec(4000, 75), vec(0, 75)])
  })
  it('canto em L com meia-esquadria', () => {
    const o = wallOutline([vec(0, 0), vec(4000, 0), vec(4000, 3000)], 150, false)!
    const ring = o.rings[0]!
    expect(ring).toContainEqual(vec(4075, -75)) // canto externo
    expect(ring).toContainEqual(vec(3925, 75)) // canto interno
  })
  it('ambiente fechado gera dois anéis (externo e interno)', () => {
    const o = wallOutline([vec(0, 0), vec(4000, 0), vec(4000, 3000), vec(0, 3000)], 150, true)!
    expect(o.rings).toHaveLength(2)
    const xs = o.rings.flat().map((p) => p.x)
    expect(Math.min(...xs)).toBe(-75)
    expect(Math.max(...xs)).toBe(4075)
  })
  it('clique sobre a parede', () => {
    const w = {
      id: 'w',
      kind: 'wall' as const,
      points: [vec(0, 0), vec(4000, 0)],
      closed: false,
      thicknessMm: 150,
    }
    expect(hitWall(w, vec(2000, 70))).toBe(true)
    expect(hitWall(w, vec(2000, 120))).toBe(false)
    expect(hitWall(w, vec(2000, 120), 50)).toBe(true)
  })
})

describe('snap', () => {
  const base = { grid: 50, endpoints: [vec(1000, 1000)], tolerance: 40 }
  it('extremidade tem prioridade', () => {
    expect(snapPoint(vec(1030, 990), base)).toEqual({ point: vec(1000, 1000), kind: 'endpoint' })
  })
  it('ponto médio quando não há extremidade por perto; extremidade vence', () => {
    const mid = { ...base, midpoints: [vec(2000, 1000)] }
    expect(snapPoint(vec(2020, 990), mid)).toEqual({ point: vec(2000, 1000), kind: 'midpoint' })
    expect(snapPoint(vec(1010, 1000), { ...mid, midpoints: [vec(1020, 1000)] }).kind).toBe(
      'endpoint',
    )
  })
  it('grade', () => {
    expect(snapPoint(vec(1234, 2278), base)).toEqual({ point: vec(1250, 2300), kind: 'grid' })
  })
  it('ortogonal trava no eixo dominante', () => {
    expect(snapPoint(vec(3012, 140), { ...base, orthoFrom: vec(0, 100) })).toEqual({
      point: vec(3000, 100),
      kind: 'ortho',
    })
  })
})

describe('calibração da planta base', () => {
  it('reescala mantendo o primeiro ponto', () => {
    const bp = {
      assetId: 'a',
      x: 0,
      y: 0,
      widthMm: 1000,
      heightMm: 500,
      opacity: 0.5,
      locked: false,
      visible: true,
      calibrated: false,
    }
    const c = calibrateBasePlan(bp, vec(100, 100), vec(300, 100), 4000)
    expect(c.widthMm).toBe(20000)
    expect(c.heightMm).toBe(10000)
    expect(c.x).toBe(100 - 100 * 20)
    expect(c.calibrated).toBe(true)
  })
})

describe('prancha da planta', () => {
  it('escolhe a maior escala que cabe', () => {
    expect(
      chooseScale({ minX: 0, minY: 0, maxX: 4400, maxY: 3800 }, { width: 300, height: 200 }),
    ).toBe(20)
    expect(
      chooseScale({ minX: 0, minY: 0, maxX: 12000, maxY: 8000 }, { width: 300, height: 200 }),
    ).toBe(50)
  })

  it('monta a A3 com o ambiente, carimbo e escala gráfica', () => {
    const p = newProject('e1')
    const env = p.environments[0]!
    env.items.push(bed)
    env.drawings.push({
      id: 'w',
      kind: 'wall',
      points: [vec(0, 0), vec(4000, 0), vec(4000, 3000), vec(0, 3000)],
      closed: true,
      thicknessMm: 150,
    })
    const sheet = buildPlanSheet({
      title: 'Quarto',
      subtitle: 'PROJETO TESTE',
      build: (scale) => environmentEntities(env, { scale }),
    })
    expect(sheet.widthMm).toBe(420)
    expect(sheet.scale).toBe(20)
    const roles = [...walk(sheet.primitives)].flatMap((x) => (x.kind === 'group' ? [x.role] : []))
    expect(roles).toEqual(expect.arrayContaining(['vista', 'itens', 'paredes', 'graphic-scale']))
    const texts = [...walk(sheet.primitives)].flatMap((x) => (x.kind === 'text' ? [x.text] : []))
    expect(texts).toContain('1:20')
  })
})

import { describe, expect, it } from 'vitest'
import { clipSegment } from '../geometry/polygon'
import { vec } from '../geometry/vec'
import { migrateProject } from '../project/migrations'
import { environmentEntities } from '../project/render'
import { newProject, SCHEMA_VERSION, type Floor, type Opening, type Wall } from '../project/schema'
import { walk } from '../drawing/primitives'
import { compileView } from '../drawing/compile'
import { floorRows } from './budget'
import { FLOOR_FINISHES, floorFinish } from './catalog'
import { floorJoints } from './layout'
import { ceilM2, floorQuantities, skirtingLengthMm } from './quantities'

const rect = (w: number, h: number, x = 0, y = 0) => [
  vec(x, y),
  vec(x + w, y),
  vec(x + w, y + h),
  vec(x, y + h),
]

const floor = (id: string, patch: Partial<Floor> = {}): Floor => {
  const f = floorFinish(id)!
  return {
    finishId: f.id,
    name: f.name,
    material: f.material,
    pieceAMm: f.pieceAMm,
    pieceBMm: f.pieceBMm,
    jointMm: f.jointMm,
    pattern: f.pattern,
    angleDeg: 0,
    origin: 'corner',
    wastePct: f.wastePct,
    color: f.color,
    ...patch,
  }
}

describe('recorte de segmento em polígono', () => {
  it('em L, a linha que cruza o recorte vira dois trechos', () => {
    const L = [
      vec(0, 0),
      vec(3000, 0),
      vec(3000, 1000),
      vec(1000, 1000),
      vec(1000, 3000),
      vec(0, 3000),
    ]
    const segs = clipSegment([L], vec(-100, 2000), vec(4000, 2000))
    expect(segs).toHaveLength(1)
    expect(segs[0]!.a.x).toBeCloseTo(0)
    expect(segs[0]!.b.x).toBeCloseTo(1000)
    expect(clipSegment([L], vec(-100, 500), vec(4000, 500))).toHaveLength(1)
  })
})

describe('paginação', () => {
  it('porcelanato 60×60 a partir do canto num quarto 3,00 × 2,40: juntas inteiras a cada 60,2 cm', () => {
    const segs = floorJoints(rect(3000, 2400), floor('porcelanato-60'))
    const vertical = segs
      .filter((s) => Math.abs(s.a.x - s.b.x) < 1e-6)
      .map((s) => Math.round(s.a.x))
    const horizontal = segs
      .filter((s) => Math.abs(s.a.y - s.b.y) < 1e-6)
      .map((s) => Math.round(s.a.y))
    expect(vertical).toEqual([602, 1204, 1806, 2408])
    expect(horizontal).toEqual([602, 1204, 1806])
  })

  it('centralizado: uma peça inteira no meio da área', () => {
    const segs = floorJoints(
      rect(3000, 3000),
      floor('porcelanato-60', { origin: 'center', jointMm: 0 }),
    )
    const xs = segs.filter((s) => Math.abs(s.a.x - s.b.x) < 1e-6).map((s) => Math.round(s.a.x))
    expect(xs).toContain(1200)
    expect(xs).toContain(1800) // peça de 1200 a 1800, centrada em 1500
  })

  it('régua com amarração 1/3: juntas de topo deslocam 1/3 da peça a cada fiada', () => {
    const f = floor('madeira-20x120') // 1200 × 200, junta 0
    const segs = floorJoints(rect(3600, 600), f)
    const tops = (y0: number) =>
      segs
        .filter(
          (s) =>
            Math.abs(s.a.x - s.b.x) < 1e-6 &&
            Math.min(s.a.y, s.b.y) >= y0 - 1 &&
            Math.max(s.a.y, s.b.y) <= y0 + 201,
        )
        .map((s) => Math.round(s.a.x))
    expect(tops(0)).toEqual([1200, 2400])
    expect(tops(200)).toEqual([400, 1600, 2800])
    expect(tops(400)).toEqual([800, 2000, 3200])
  })

  it('a 45° nenhuma junta sai do cômodo', () => {
    const segs = floorJoints(rect(3000, 2000), floor('porcelanato-60', { angleDeg: 45 }))
    expect(segs.length).toBeGreaterThan(5)
    for (const s of segs)
      for (const p of [s.a, s.b]) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-6)
        expect(p.x).toBeLessThanOrEqual(3000 + 1e-6)
        expect(p.y).toBeGreaterThanOrEqual(-1e-6)
        expect(p.y).toBeLessThanOrEqual(2000 + 1e-6)
      }
  })

  it('monolítico (cimento queimado) não tem juntas', () => {
    expect(floorJoints(rect(3000, 3000), floor('cimento-queimado'))).toEqual([])
  })

  it('todo revestimento do catálogo pagina sem erro', () => {
    for (const f of FLOOR_FINISHES)
      expect(() => floorJoints(rect(4400, 3800), floor(f.id))).not.toThrow()
  })
})

describe('quantidades', () => {
  const quarto: Wall = {
    id: 'q',
    kind: 'wall',
    points: rect(4550, 3950, -75, -75),
    closed: true,
    thicknessMm: 150,
  }
  const porta: Opening = {
    id: 'p',
    wallId: 'q',
    segment: 2,
    offsetMm: 3175,
    widthMm: 800,
    heightMm: 2100,
    sillMm: 0,
    type: 'porta-abrir',
    hinge: 'start',
    side: 'right',
  }
  const janela: Opening = {
    ...porta,
    id: 'j',
    segment: 0,
    type: 'janela-correr-2',
    widthMm: 1200,
    offsetMm: 2275,
  }

  it('m² com perda, sempre arredondado para cima', () => {
    expect(ceilM2(16.7201)).toBe(16.73)
    const q = floorQuantities(rect(4400, 3800), floor('porcelanato-90', { priceCentsPerM2: 12990 }))
    expect(q.areaM2).toBeCloseTo(16.72)
    expect(q.buyM2).toBe(18.4) // 16,72 × 1,10 = 18,392 → 18,40
    expect(q.floorTotalCents).toBe(Math.round(18.4 * 12990))
  })

  it('rodapé: perímetro menos a porta (janela não desconta)', () => {
    const pts = rect(4400, 3800)
    expect(skirtingLengthMm(pts, [quarto], [porta, janela])).toBe(2 * (4400 + 3800) - 800)
    const q = floorQuantities(
      pts,
      floor('porcelanato-90', { skirting: { heightMm: 70, priceCentsPerM: 3500 } }),
      [quarto],
      [porta],
    )
    expect(q.skirtingM).toBe(15.6)
    expect(q.skirtingTotalCents).toBe(54600)
  })

  it('linhas P1 de piso e rodapé no orçamento; pisos iguais somam', () => {
    const p = newProject('e')
    const env = p.environments[0]!
    env.drawings.push(quarto)
    env.openings.push(porta)
    const f = floor('porcelanato-90', {
      priceCentsPerM2: 10000,
      skirting: { heightMm: 70, priceCentsPerM: 2000 },
    })
    env.drawings.push({
      id: 'a1',
      kind: 'area',
      name: 'Quarto',
      points: rect(4400, 3800),
      floor: f,
    })
    env.drawings.push({
      id: 'a2',
      kind: 'area',
      name: 'Closet',
      points: rect(1000, 1000, 5000, 0),
      floor: f,
    })
    env.drawings.push({
      id: 'a3',
      kind: 'area',
      name: 'Banho',
      points: rect(1500, 2000, 7000, 0),
      floor: floor('ceramica-45'),
    })
    const rows = floorRows(env)
    expect(rows.map((r) => [r.label, r.unit])).toEqual([
      ['P1', 'm²'],
      ['P2', 'm²'],
      ['P1', 'm'],
    ])
    expect(rows[0]!.qty).toBe(18.4 + 1.1)
    expect(rows[0]!.totalCents).toBe(Math.round(18.4 * 10000) + Math.round(1.1 * 10000))
    expect(rows[2]!.qty).toBe(15.6 + 4)
  })

  it('o piso é desenhado por baixo dos móveis e entra no PDF', () => {
    const p = newProject('e')
    const env = p.environments[0]!
    env.drawings.push({
      id: 'a1',
      kind: 'area',
      name: 'Quarto',
      points: rect(4400, 3800),
      floor: floor('porcelanato-90'),
    })
    const es = environmentEntities(env, { scale: 50, humanized: true })
    expect(es.findIndex((e) => e.kind === 'group' && e.role === 'pisos')).toBeLessThan(
      es.findIndex((e) => e.kind === 'group' && e.role === 'itens'),
    )
    const prims = [...walk(compileView(es, { scale: 50, origin: vec(0, 0) }))]
    expect(prims.filter((x) => x.kind === 'line').length).toBeGreaterThan(5)
    expect(prims.some((x) => x.kind === 'text' && x.text === 'Porcelanato 90×90')).toBe(true)
  })
})

describe('migração v3 → v4', () => {
  it('documento v3 abre na versão atual sem mudar nada', () => {
    const v3 = { ...newProject('e'), schemaVersion: 3 }
    expect(migrateProject(v3).schemaVersion).toBe(SCHEMA_VERSION)
  })
})

import { describe, expect, it } from 'vitest'
import { entitiesBBox } from '../drawing/bounds'
import { compileView } from '../drawing/compile'
import { walk } from '../drawing/primitives'
import { area } from '../geometry/polygon'
import { vec } from '../geometry/vec'
import { wallChainDimensions } from './auto-dims'
import { migrateProject, MigrationError } from './migrations'
import { hitOpening, openingEntities, openingFrame, openingGaps, OPENING_DEFS } from './openings'
import { drawingEntities, environmentEntities } from './render'
import { newProject, ProjectSchema, type Opening, type Wall } from './schema'
import { nearestWall, wallOutline, wallPieces, wallSegments } from './walls'

// Quarto 4,40 × 3,80 m pelo eixo, desenhado no sentido horário visual.
const room: Wall = {
  id: 'w1',
  kind: 'wall',
  points: [vec(0, 0), vec(4400, 0), vec(4400, 3800), vec(0, 3800)],
  closed: true,
  thicknessMm: 150,
}

const door = (patch: Partial<Opening> = {}): Opening => ({
  id: 'o1',
  wallId: 'w1',
  segment: 2, // parede de baixo: de (4400,3800) para (0,3800)
  offsetMm: 3000, // centro em x = 1400
  widthMm: 800,
  heightMm: 2100,
  sillMm: 0,
  type: 'porta-abrir',
  hinge: 'start',
  side: 'right',
  ...patch,
})

describe('trechos e vãos', () => {
  it('segmentos com posição acumulada', () => {
    expect(wallSegments(room).map((s) => [s.index, s.length, s.start])).toEqual([
      [0, 4400, 0],
      [1, 3800, 4400],
      [2, 4400, 8200],
      [3, 3800, 12600],
    ])
  })

  it('parede fechada com uma porta vira uma peça aberta que dá a volta', () => {
    const gaps = openingGaps(room, [door()])
    expect(gaps).toEqual([{ from: 8200 + 2600, to: 8200 + 3400 }])
    const pieces = wallPieces(room, gaps)
    expect(pieces).toHaveLength(1)
    expect(pieces[0]!.closed).toBe(false)
    // começa no batente x=1000 e termina no batente x=1800, passando pelos 4 cantos
    expect(pieces[0]!.points[0]).toEqual(vec(1000, 3800))
    expect(pieces[0]!.points.at(-1)).toEqual(vec(1800, 3800))
    expect(pieces[0]!.points).toHaveLength(6)
  })

  it('área hachurada perde exatamente o vão (80 × 15 cm)', () => {
    const full = wallOutline(room.points, 150, true)!
    const fullArea = area(full.rings[0]!) - area(full.rings[1]!)
    const piece = wallPieces(room, openingGaps(room, [door()]))[0]!
    const cut = wallOutline(piece.points, 150, false)!
    expect(area(cut.rings[0]!)).toBeCloseTo(fullArea - 800 * 150, 6)
  })

  it('vão é limitado ao trecho (não atravessa canto)', () => {
    const f = openingFrame(room, door({ offsetMm: 100 }))!
    expect(f.offset).toBe(400)
    expect(f.a).toEqual(vec(4400, 3800))
  })

  it('parede aberta com duas janelas vira três peças', () => {
    const w: Wall = { ...room, closed: false, points: [vec(0, 0), vec(6000, 0)] }
    const ops = [
      door({ segment: 0, offsetMm: 1500, widthMm: 1000 }),
      door({ id: 'o2', segment: 0, offsetMm: 4500, widthMm: 1000 }),
    ]
    expect(wallPieces(w, openingGaps(w, ops))).toHaveLength(3)
  })
})

describe('símbolos', () => {
  it('porta de abrir: folha e arco com raio = largura, abrindo para dentro', () => {
    const es = openingEntities(room, door())
    const arc = es.find((e) => e.kind === 'arc')
    expect(arc).toMatchObject({ kind: 'arc', radius: 800 })
    // abre para dentro do quarto (y < 3800)
    const bb = entitiesBBox(es)
    expect(bb.minY).toBeCloseTo(3800 - 75 - 800)
    expect(bb.maxY).toBeLessThanOrEqual(3800 + 75 + 1)
  })

  it('inverter o lado leva o giro para fora', () => {
    const bb = entitiesBBox(openingEntities(room, door({ side: 'left' })))
    expect(bb.maxY).toBeCloseTo(3800 + 75 + 800)
  })

  it.each(OPENING_DEFS.map((d) => d.type))('%s desenha e compila', (type) => {
    const es = openingEntities(room, door({ type, segment: 0, offsetMm: 2200 }))
    expect(es.length).toBeGreaterThan(0)
    expect(() => compileView(es, { scale: 50, origin: vec(0, 0) })).not.toThrow()
  })

  it('parede com vão no desenho do ambiente', () => {
    const es = drawingEntities(room, 50, [door()])
    expect(es.some((e) => e.kind === 'arc')).toBe(true)
    const lines = [...walk(compileView(es, { scale: 50, origin: vec(0, 0) }))].length
    expect(lines).toBeGreaterThan(10)
  })

  it('clique no vão e no giro da porta', () => {
    expect(hitOpening(room, door(), vec(1400, 3800), 0)).toBe(true)
    expect(hitOpening(room, door(), vec(1300, 3300), 0)).toBe(true) // dentro do giro
    expect(hitOpening(room, door(), vec(2400, 3800), 0)).toBe(false)
  })

  it('encontra a parede mais próxima e o lado do cursor', () => {
    const r = nearestWall([room], vec(1400, 3700), 200)!
    expect(r).toMatchObject({ wallId: 'w1', segment: 2, along: 3000, side: 'right' })
    expect(nearestWall([room], vec(2000, 2000), 200)).toBeNull()
  })
})

describe('cotas automáticas da parede', () => {
  it('trecho de cima com janela: face externa e vãos', () => {
    const win = door({ type: 'janela-correr-2', segment: 0, offsetMm: 2400, widthMm: 1400 })
    const dims = wallChainDimensions(room, [win])
    expect(dims).toHaveLength(4)
    expect(dims[0]).toMatchObject({
      points: [vec(-75, -75), vec(1700, -75), vec(3100, -75), vec(4475, -75)],
      orientation: 'horizontal',
      total: true,
    })
    expect(dims[0]!.offsetMm).toBeGreaterThan(0) // acima (para fora)
    expect(dims[1]).toMatchObject({
      points: [vec(4475, -75), vec(4475, 3875)],
      orientation: 'vertical',
      total: false,
    })
  })

  it('ambiente desenhado no sentido anti-horário também cota por fora', () => {
    const ccw = { ...room, points: [...room.points].reverse() }
    const top = wallChainDimensions(ccw, []).find((d) => d.points.every((p) => p.y === -75))
    expect(top).toBeDefined()
  })
})

describe('migração v1 → v2', () => {
  it('acrescenta esquadrias e remove a porta-bloco antiga', () => {
    const v1 = {
      schemaVersion: 1,
      name: 'Antigo',
      environments: [
        {
          id: 'e',
          name: 'Quarto',
          ceilingHeightMm: 2700,
          basePlan: null,
          drawings: [],
          items: [
            {
              id: 'a',
              blockId: 'porta',
              blockVersion: 1,
              name: 'Porta',
              position: { x: 0, y: 0 },
              rotationDeg: 0,
              mirrored: false,
              sizeMm: { w: 800, d: 800 },
            },
            {
              id: 'b',
              blockId: 'sofa',
              blockVersion: 1,
              name: 'Sofá',
              position: { x: 0, y: 0 },
              rotationDeg: 0,
              mirrored: false,
              sizeMm: { w: 2100, d: 900 },
            },
          ],
        },
      ],
    }
    const p = migrateProject(v1)
    expect(p.schemaVersion).toBe(4)
    expect(p.environments[0]!.openings).toEqual([])
    expect(p.environments[0]!.items.map((i) => i.blockId)).toEqual(['sofa'])
    // v2 → v3: campos de legenda/orçamento com padrões neutros
    expect(p.environments[0]!.items[0]).toMatchObject({
      qty: 1,
      unit: 'un',
      showMarker: true,
      inLegend: true,
      existing: false,
      approved: false,
    })
  })

  it('documento atual passa direto; futuro é recusado', () => {
    expect(migrateProject(newProject('e')).schemaVersion).toBe(4)
    expect(() => migrateProject({ ...newProject('e'), schemaVersion: 99 })).toThrow(MigrationError)
    expect(ProjectSchema.safeParse(newProject('e')).success).toBe(true)
  })
})

describe('ambiente completo (o que vai para o PDF)', () => {
  it('environmentEntities recorta as paredes e desenha portas e janelas', () => {
    const p = newProject('e')
    const env = p.environments[0]!
    env.drawings.push(room)
    env.openings.push(
      door(),
      door({ id: 'o2', type: 'janela-correr-2', segment: 0, offsetMm: 2400, widthMm: 1400 }),
    )
    const prims = [
      ...walk(
        compileView(environmentEntities(env, { scale: 50 }), { scale: 50, origin: vec(0, 0) }),
      ),
    ]
    expect(prims.some((x) => x.kind === 'arc')).toBe(true) // giro da porta
    // Sem esquadrias, nenhum arco: a diferença vem dos vãos
    const bare = { ...env, openings: [] }
    const prims0 = [
      ...walk(
        compileView(environmentEntities(bare, { scale: 50 }), { scale: 50, origin: vec(0, 0) }),
      ),
    ]
    expect(prims0.some((x) => x.kind === 'arc')).toBe(false)
  })
})

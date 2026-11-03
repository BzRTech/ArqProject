import { afterEach, describe, expect, it } from 'vitest'
import { entitiesBBox } from '../drawing/bounds'
import { compileView } from '../drawing/compile'
import type { Entity } from '../drawing/entities'
import {
  CATALOG,
  CATALOG_BY_ID,
  catalogBlocks,
  getBlock,
  latestBlock,
  registerSnapshot,
  setCatalog,
  setSnapshots,
} from './catalog'
import { buildSymbol } from './symbol'

const count = (es: Entity[], kind: Entity['kind']) => es.filter((e) => e.kind === kind).length

describe('catálogo de blocos', () => {
  it('ids únicos e símbolos serializáveis em JSON (vão para o banco)', () => {
    expect(new Set(CATALOG.map((b) => b.id)).size).toBe(CATALOG.length)
    for (const b of CATALOG) expect(JSON.parse(JSON.stringify(b))).toEqual(b)
  })

  for (const block of CATALOG) {
    describe(block.name, () => {
      const sizes = [
        block.defaultSize,
        block.minSize,
        { w: block.defaultSize.w * 2, d: block.defaultSize.d * 1.5 },
      ]
      it.each(sizes)('desenha dentro de L×P em %o', (size) => {
        const es = buildSymbol(block.symbol, size)
        expect(es.length).toBeGreaterThan(0)
        const bb = entitiesBBox(es)
        expect(bb.minX).toBeGreaterThanOrEqual(-0.5)
        expect(bb.minY).toBeGreaterThanOrEqual(-0.5)
        expect(bb.maxX).toBeLessThanOrEqual(size.w + 0.5)
        expect(bb.maxY).toBeLessThanOrEqual(size.d + 0.5)
        expect(() => compileView(es, { scale: 50, origin: { x: 0, y: 0 } })).not.toThrow()
      })
    })
  }
})

describe('parametria', () => {
  it('cama: 2 travesseiros na de casal, 1 na de solteiro', () => {
    const casal = getBlock('cama-casal')
    const solteiro = getBlock('cama-solteiro')
    expect(count(buildSymbol(casal.symbol, casal.defaultSize), 'rect')).toBe(2 + 2)
    expect(count(buildSymbol(solteiro.symbol, solteiro.defaultSize), 'rect')).toBe(2 + 1)
  })

  it('guarda-roupa: divisões de porta acompanham a largura (≈45 cm por porta)', () => {
    const g = getBlock('guarda-roupa')
    const divisions = (w: number) =>
      buildSymbol(g.symbol, { w, d: 600 }).filter(
        (e) => e.kind === 'line' && e.a.x === e.b.x && e.a.y === 600 - 18,
      ).length
    expect(divisions(900)).toBe(1) // 2 portas
    expect(divisions(1800)).toBe(3) // 4 portas
    expect(divisions(2700)).toBe(5) // 6 portas
  })

  it('sofá: assentos acompanham a largura', () => {
    const s = getBlock('sofa')
    const seats = (w: number) =>
      buildSymbol(s.symbol, { w, d: 900 }).filter(
        (e) => e.kind === 'rect' && e.y === 200 && e.x >= 180 && e.x < w - 180,
      ).length
    expect(seats(1500)).toBe(2)
    expect(seats(2100)).toBe(3)
    expect(seats(3000)).toBe(4)
  })
})

describe('registro de blocos (banco + cópias do projeto)', () => {
  afterEach(() => {
    setCatalog(null)
    setSnapshots([])
  })

  it('sem banco usa o embutido; com banco, o painel lista o banco', () => {
    expect(catalogBlocks()).toBe(CATALOG)
    const custom = { ...CATALOG_BY_ID.get('sofa')!, id: 'sofa-ilha', name: 'Sofá ilha' }
    setCatalog([custom])
    expect(catalogBlocks().map((b) => b.id)).toEqual(['sofa-ilha'])
    expect(getBlock('sofa-ilha').name).toBe('Sofá ilha')
    // Bloco fora do banco continua resolvendo pelo embutido
    expect(getBlock('cama-casal').id).toBe('cama-casal')
  })

  it('o item é desenhado pela cópia da versão dele, não pela mais nova do banco', () => {
    const v1 = { ...CATALOG_BY_ID.get('sofa')!, name: 'Sofá v1 (cópia do projeto)' }
    const v2 = { ...CATALOG_BY_ID.get('sofa')!, version: 2, name: 'Sofá v2 (banco)' }
    setCatalog([v2])
    setSnapshots([v1])
    expect(getBlock('sofa', 1).name).toBe('Sofá v1 (cópia do projeto)')
    expect(getBlock('sofa', 2).name).toBe('Sofá v2 (banco)')
    expect(getBlock('sofa').name).toBe('Sofá v2 (banco)')
    expect(latestBlock('sofa')!.version).toBe(2)
  })

  it('bloco que só existe na cópia do projeto (excluído do banco) ainda resolve', () => {
    const own = { ...CATALOG_BY_ID.get('sofa')!, id: 'sofa-do-escritorio', version: 3 }
    registerSnapshot(own)
    expect(getBlock('sofa-do-escritorio', 3)).toBe(own)
    expect(getBlock('sofa-do-escritorio')).toBe(own)
    expect(() => getBlock('nao-existe')).toThrow('Bloco desconhecido')
  })
})

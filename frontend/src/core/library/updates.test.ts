import { describe, expect, it } from 'vitest'
import { blockKey, CATALOG_BY_ID } from '../blocks/catalog'
import type { BlockDef } from '../blocks/types'
import { DEFAULT_RULE_PROFILE } from '../joinery/rules'
import { migrateProject } from '../project/migrations'
import { ITEM_DEFAULTS, newProject, type Item, type Project } from '../project/schema'
import {
  applyBlockUpdate,
  applyRules,
  outdatedBlocks,
  pruneSnapshots,
  rulesOutdated,
  snapshotBlock,
} from './updates'

const sofa = CATALOG_BY_ID.get('sofa')!
const sofaV2: BlockDef = { ...sofa, version: 2, name: 'Sofá (desenho novo)' }

function item(id: string, blockId: string, blockVersion = 1): Item {
  return {
    ...ITEM_DEFAULTS,
    id,
    blockId,
    blockVersion,
    name: blockId,
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    mirrored: false,
    sizeMm: { w: 2300, d: 950 },
  }
}

function project(): Project {
  const p = newProject('e1')
  p.environments[0]!.items.push(item('a', 'sofa'), item('b', 'sofa'), item('c', 'poltrona'))
  snapshotBlock(p, sofa)
  snapshotBlock(p, CATALOG_BY_ID.get('poltrona')!)
  return p
}

describe('cópias do banco no projeto', () => {
  it('migração v8 → v9 copia os blocos usados e as regras padrão', () => {
    const v8 = { ...project(), schemaVersion: 8 } as Record<string, unknown>
    delete v8.librarySnapshots
    const p = migrateProject(v8)
    expect(Object.keys(p.librarySnapshots.blocks).sort()).toEqual(['poltrona@1', 'sofa@1'])
    expect(p.librarySnapshots.rules).toEqual(DEFAULT_RULE_PROFILE)
  })

  it('acha os blocos com versão nova no banco', () => {
    const p = project()
    const latest = (id: string) => (id === 'sofa' ? sofaV2 : CATALOG_BY_ID.get(id))
    const ups = outdatedBlocks(p, latest)
    expect(ups).toHaveLength(1)
    expect(ups[0]).toMatchObject({ blockId: 'sofa', from: [1], to: 2, count: 2 })
  })

  it('atualizar troca a versão (o desenho), mantém o tamanho e limpa a cópia antiga', () => {
    const p = project()
    expect(applyBlockUpdate(p, sofaV2)).toBe(2)
    const items = p.environments[0]!.items
    expect(items.map((i) => i.blockVersion)).toEqual([2, 2, 1])
    expect(items[0]!.sizeMm).toEqual({ w: 2300, d: 950 })
    expect(Object.keys(p.librarySnapshots.blocks).sort()).toEqual(['poltrona@1', 'sofa@2'])
    expect(p.librarySnapshots.blocks[blockKey('sofa', 2)]!.name).toBe('Sofá (desenho novo)')
  })

  it('pruneSnapshots tira cópias sem uso', () => {
    const p = project()
    p.environments[0]!.items.splice(2, 1)
    pruneSnapshots(p)
    expect(Object.keys(p.librarySnapshots.blocks)).toEqual(['sofa@1'])
  })

  it('regras: avisa quando o banco tem outro perfil ou versão nova', () => {
    const p = project()
    expect(rulesOutdated(p, DEFAULT_RULE_PROFILE)).toBe(false)
    expect(rulesOutdated(p, undefined)).toBe(false)
    const office = { ...DEFAULT_RULE_PROFILE, version: 2, front: { thicknessMm: 18, gapMm: 2 } }
    expect(rulesOutdated(p, office)).toBe(true)
    applyRules(p, office)
    expect(p.librarySnapshots.rules.front.gapMm).toBe(2)
    expect(rulesOutdated(p, office)).toBe(false)
  })
})

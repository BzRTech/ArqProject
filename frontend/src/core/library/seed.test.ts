import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { LIBRARY_KIND_LIST, LIBRARY_KINDS } from './schemas'
import { LIBRARY_SEED } from './seed'

const dir = (sub: string) => fileURLToPath(new URL(`../../../../backend/${sub}/`, import.meta.url))
const update = process.env.UPDATE_SCHEMA === '1'

describe('seed do banco global', () => {
  it('toda entrada é válida pelo schema do banco e os ids são únicos', () => {
    for (const kind of LIBRARY_KIND_LIST) {
      const schema = LIBRARY_KINDS[kind]
      const ids = new Set<string>()
      for (const e of LIBRARY_SEED[kind]) {
        const r = schema.safeParse(e)
        expect(r.success, `${kind}/${(e as { id: string }).id}: ${r.error?.message}`).toBe(true)
        expect(ids.has(e.id), `${kind}: id repetido ${e.id}`).toBe(false)
        ids.add(e.id)
      }
    }
  })

  it('tem o volume previsto no PLANO (Fase 3)', () => {
    expect(LIBRARY_SEED.items.length).toBeGreaterThanOrEqual(30)
    expect(LIBRARY_SEED.materials.length).toBeGreaterThanOrEqual(20)
    expect(LIBRARY_SEED.handles.length).toBe(10)
    expect(LIBRARY_SEED['joinery-types'].length).toBe(5)
    expect(LIBRARY_SEED.rules.length).toBe(1)
    expect(LIBRARY_SEED['sheet-templates'].length).toBe(1)
  })

  it('todo bloco de marcenaria aponta para um tipo de móvel existente', () => {
    const types = new Set(LIBRARY_SEED['joinery-types'].map((t) => t.id))
    for (const b of LIBRARY_SEED.items)
      if (b.joineryType) expect(types.has(b.joineryType)).toBe(true)
  })

  it('backend/library_seed e os JSON Schemas dos bancos estão atualizados (npm run export:schema)', () => {
    if (update) {
      mkdirSync(dir('library_seed'), { recursive: true })
      mkdirSync(dir('apps/library/schema'), { recursive: true })
    }
    for (const kind of LIBRARY_KIND_LIST) {
      const seedFile = `${dir('library_seed')}${kind}.json`
      const schemaFile = `${dir('apps/library/schema')}${kind}.schema.json`
      const seed = LIBRARY_SEED[kind]
      const schema = z.toJSONSchema(LIBRARY_KINDS[kind], { target: 'draft-2020-12', io: 'input' })
      if (update) {
        writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n')
        writeFileSync(schemaFile, JSON.stringify(schema, null, 2) + '\n')
      }
      expect(JSON.parse(readFileSync(seedFile, 'utf8')), seedFile).toEqual(
        JSON.parse(JSON.stringify(seed)),
      )
      expect(JSON.parse(readFileSync(schemaFile, 'utf8')), schemaFile).toEqual(
        JSON.parse(JSON.stringify(schema)),
      )
    }
  })
})

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { projectJsonSchema, projectJsonSchemaText } from './json-schema'
import { SCHEMA_VERSION } from './schema'

const target = fileURLToPath(
  new URL('../../../../backend/apps/projects/schema/project.schema.json', import.meta.url),
)

describe('JSON Schema exportado para o backend', () => {
  it('traz a versão do documento como constante', () => {
    const s = projectJsonSchema() as { properties: { schemaVersion: { const: number } } }
    expect(s.properties.schemaVersion.const).toBe(SCHEMA_VERSION)
  })

  it('o arquivo do backend está atualizado (rode `npm run export:schema`)', () => {
    const text = projectJsonSchemaText()
    if (process.env.UPDATE_SCHEMA === '1') writeFileSync(target, text)
    // Compara o conteúdo (formatação do arquivo não importa).
    expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual(JSON.parse(text))
  })
})

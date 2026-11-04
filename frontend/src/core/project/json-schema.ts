import { z } from 'zod'
import { ProjectSchema, SCHEMA_VERSION } from './schema'

/**
 * JSON Schema do documento do projeto, gerado do schema zod (fonte única da verdade).
 * O Django valida o JSONB com ele (`backend/apps/projects/schema/project.schema.json`).
 * Atualizar: `npm run export:schema` (o teste `json-schema.test.ts` falha se o arquivo
 * do backend estiver desatualizado).
 */
export function projectJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(ProjectSchema, { target: 'draft-2020-12', io: 'input' })
  return {
    ...schema,
    $id: `https://prancheta.local/schema/project.v${SCHEMA_VERSION}.json`,
    title: `Projeto Prancheta (schema v${SCHEMA_VERSION})`,
  }
}

/** Texto do arquivo exportado (estável: mesma entrada → mesmo texto). */
export const projectJsonSchemaText = () => JSON.stringify(projectJsonSchema(), null, 2) + '\n'

import { ProjectSchema, SCHEMA_VERSION, type Project } from './schema'

/**
 * Migrações do documento. Cada função leva da versão N para N+1 e trabalha sobre JSON
 * cru (o formato antigo não tem tipo próprio). Ao abrir, aplica as que faltarem e valida.
 */
type Raw = Record<string, unknown>

const MIGRATIONS: Record<number, (p: Raw) => Raw> = {
  // v1 → v2: esquadrias viram vãos na parede. A antiga "porta" como bloco solto é removida
  // (não dá para saber em que parede estava); o usuário reinsere como vão.
  1: (p) => ({
    ...p,
    schemaVersion: 2,
    environments: ((p.environments as Raw[]) ?? []).map((e) => ({
      ...e,
      openings: [],
      items: ((e.items as Raw[]) ?? []).filter((it) => it.blockId !== 'porta'),
    })),
  }),
  // v2 → v3: legenda e orçamento nos itens (padrões neutros).
  2: (p) => ({
    ...p,
    schemaVersion: 3,
    environments: ((p.environments as Raw[]) ?? []).map((e) => ({
      ...e,
      items: ((e.items as Raw[]) ?? []).map((it) => ({
        qty: 1,
        unit: 'un',
        showMarker: true,
        inLegend: true,
        existing: false,
        approved: false,
        ...it,
      })),
    })),
  }),
}

export class MigrationError extends Error {}

export function migrateProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new MigrationError('Documento vazio ou inválido')
  let doc = raw as Raw
  let v = Number(doc.schemaVersion)
  if (!Number.isInteger(v) || v < 1) throw new MigrationError('Versão do documento desconhecida')
  if (v > SCHEMA_VERSION)
    throw new MigrationError(`Documento v${v} é mais novo que o sistema (v${SCHEMA_VERSION})`)
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v]
    if (!step) throw new MigrationError(`Falta migração da v${v}`)
    doc = step(doc)
    v = Number(doc.schemaVersion)
  }
  const parsed = ProjectSchema.safeParse(doc)
  if (!parsed.success) throw new MigrationError(`Documento inválido: ${parsed.error.message}`)
  return parsed.data
}

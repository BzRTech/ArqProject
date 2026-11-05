import { blockKey, CATALOG_BY_ID } from '../blocks/catalog'
import { DEFAULT_RULE_PROFILE } from '../joinery/rules'
import { SHEET_TEMPLATE_SEED } from '../library/seed'
import { ProjectSchema, SCHEMA_VERSION, type Project } from './schema'

/**
 * Migrações do documento. Cada função leva da versão N para N+1 e trabalha sobre JSON
 * cru (o formato antigo não tem tipo próprio). Ao abrir, aplica as que faltarem e valida.
 */
type Raw = Record<string, unknown>

const MIGRATIONS: Record<number, (p: Raw) => Raw> = {
  // v10 → v11: perspectivas opcionais por ambiente; nenhuma captura é inventada.
  10: (p) => ({ ...p, schemaVersion: 11 }),
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
  // v3 → v4: piso opcional nas áreas (nada a converter; documentos v3 continuam válidos).
  3: (p) => ({ ...p, schemaVersion: 4 }),
  // v4 → v5: pilares (novo tipo de desenho; nada a converter).
  4: (p) => ({ ...p, schemaVersion: 5 }),
  // v5 → v6: cotas ligadas (`ref` opcional nas cotas; nada a converter).
  5: (p) => ({ ...p, schemaVersion: 6 }),
  // v6 → v7: acabamento de marcenaria opcional nos itens (nada a converter).
  6: (p) => ({ ...p, schemaVersion: 7 }),
  // v7 → v8: desenho do móvel (módulos) opcional no detalhamento (nada a converter).
  7: (p) => ({ ...p, schemaVersion: 8 }),
  // v8 → v9: cópias do banco no documento. Até a v8 só existiam os blocos embutidos (v1) e as
  // regras padrão: copia os blocos usados e as regras padrão.
  8: (p) => {
    const blocks: Record<string, unknown> = {}
    for (const e of (p.environments as Raw[]) ?? [])
      for (const it of (e.items as Raw[]) ?? []) {
        const def = CATALOG_BY_ID.get(String(it.blockId))
        if (def) blocks[blockKey(def.id, Number(it.blockVersion ?? def.version))] = def
      }
    return {
      ...p,
      schemaVersion: 9,
      librarySnapshots: { blocks, rules: DEFAULT_RULE_PROFILE },
    }
  },
  // v9 → v10: modelo de folha nas cópias do banco (A3 paisagem, como era); folha por ambiente
  // é opcional.
  9: (p) => ({
    ...p,
    schemaVersion: 10,
    librarySnapshots: {
      ...(p.librarySnapshots as Raw),
      sheetTemplate: SHEET_TEMPLATE_SEED[0],
    },
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

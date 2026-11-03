import type { BlockDef } from '../blocks/types'
import type { FloorFinishDef } from '../finishes/types'
import type { RuleProfile } from '../joinery/rules'
import { LIBRARY_KIND_LIST, LIBRARY_KINDS, type LibraryEntryOf, type LibraryKind } from './schemas'
import { LIBRARY_SEED } from './seed'

/**
 * Bancos em uso no editor, já validados. Vêm do bundle da API (global + escritório) ou, sem
 * servidor, do seed embutido. Entradas inválidas são deixadas de fora (e listadas).
 */
export type Library = { [K in LibraryKind]: LibraryEntryOf<K>[] }

export interface ParsedLibrary {
  library: Library
  /** `banco/id: motivo` das entradas recusadas. */
  rejected: string[]
}

export function parseLibrary(raw: Partial<Record<string, unknown>>): ParsedLibrary {
  const rejected: string[] = []
  const library = {} as Record<LibraryKind, unknown[]>
  for (const kind of LIBRARY_KIND_LIST) {
    const list = Array.isArray(raw[kind]) ? (raw[kind] as unknown[]) : []
    library[kind] = list.flatMap((e) => {
      const r = LIBRARY_KINDS[kind].safeParse(e)
      if (r.success) return [r.data]
      const id = (e as { id?: unknown })?.id
      rejected.push(`${kind}/${String(id)}: ${r.error.issues[0]?.message ?? 'inválida'}`)
      return []
    })
  }
  return { library: library as Library, rejected }
}

/** Bancos embutidos (rascunho local, ou sem conexão e sem cache). */
export const BUILTIN_LIBRARY: Library = parseLibrary(LIBRARY_SEED).library

/** Perfil de regras do escritório: o "padrao" (personalizado ou global) ou o primeiro. */
export function officeRules(lib: Library): RuleProfile | undefined {
  return lib.rules.find((r) => r.id === 'padrao') ?? lib.rules[0]
}

export const blocksOf = (lib: Library): BlockDef[] => lib.items as BlockDef[]
export const floorsOf = (lib: Library): FloorFinishDef[] => lib.floors as FloorFinishDef[]

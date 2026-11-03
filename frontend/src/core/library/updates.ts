import { blockKey } from '../blocks/catalog'
import type { BlockDef } from '../blocks/types'
import type { RuleProfile } from '../joinery/rules'
import type { Project } from '../project/schema'

/**
 * Cópias do banco no projeto: guardar ao usar, descobrir o que tem versão nova no banco e
 * atualizar quando o usuário pedir. Funções puras sobre o documento (o store as usa dentro do
 * immer). Ver ADR 005.
 */

/** Guarda a cópia do bloco no projeto (se ainda não houver). */
export function snapshotBlock(project: Project, def: BlockDef): void {
  const key = blockKey(def.id, def.version)
  if (!project.librarySnapshots.blocks[key]) project.librarySnapshots.blocks[key] = def
}

/** Tira as cópias de blocos que nenhum item usa mais. */
export function pruneSnapshots(project: Project): void {
  const used = new Set<string>()
  for (const e of project.environments)
    for (const it of e.items) used.add(blockKey(it.blockId, it.blockVersion))
  for (const k of Object.keys(project.librarySnapshots.blocks))
    if (!used.has(k)) delete project.librarySnapshots.blocks[k]
}

export interface BlockUpdate {
  blockId: string
  name: string
  /** Versões em uso no projeto (pode haver mais de uma). */
  from: number[]
  to: number
  /** Quantos itens mudam. */
  count: number
  latest: BlockDef
}

/** Blocos do projeto com versão mais nova no banco. */
export function outdatedBlocks(
  project: Project,
  latest: (id: string) => BlockDef | undefined,
): BlockUpdate[] {
  const byId = new Map<string, BlockUpdate>()
  for (const e of project.environments)
    for (const it of e.items) {
      const def = latest(it.blockId)
      if (!def || def.version <= it.blockVersion) continue
      const u = byId.get(it.blockId) ?? {
        blockId: it.blockId,
        name: def.name,
        from: [],
        to: def.version,
        count: 0,
        latest: def,
      }
      if (!u.from.includes(it.blockVersion)) u.from.push(it.blockVersion)
      u.count++
      byId.set(it.blockId, u)
    }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/**
 * Passa os itens do bloco para a versão do banco: o desenho muda; tamanho, posição, preço e
 * demais dados do item ficam como o usuário deixou.
 */
export function applyBlockUpdate(project: Project, def: BlockDef): number {
  let n = 0
  for (const e of project.environments)
    for (const it of e.items)
      if (it.blockId === def.id && it.blockVersion !== def.version) {
        it.blockVersion = def.version
        n++
      }
  snapshotBlock(project, def)
  pruneSnapshots(project)
  return n
}

/** As regras do banco são outras (outro perfil ou versão nova)? */
export function rulesOutdated(project: Project, bank: RuleProfile | undefined): boolean {
  if (!bank) return false
  const mine = project.librarySnapshots.rules
  return mine.id !== bank.id || bank.version > mine.version
}

export function applyRules(project: Project, rules: RuleProfile): void {
  project.librarySnapshots.rules = rules
}

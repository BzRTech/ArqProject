import type { BlockSymbol } from './symbol'

export type Discipline = 'layout' | 'marcenaria' | 'eletrica' | 'revestimentos' | 'hidraulica'

export interface BlockSize {
  w: number
  d: number
  h?: number
}

/** Definição de bloco do catálogo (vira `CatalogItem` no banco na Fase 3). */
export interface BlockDef {
  id: string
  /** Versão do conteúdo do bloco (snapshot no projeto). */
  version: number
  name: string
  category: string
  discipline: Discipline
  defaultSize: BlockSize
  minSize: { w: number; d: number }
  /** Bloco detalhável no assistente de marcenaria (Fase 8). */
  joinery?: boolean
  symbol: BlockSymbol
}

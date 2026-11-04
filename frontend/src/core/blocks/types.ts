import type { BlockSymbol } from './symbol'

export type Discipline = 'layout' | 'marcenaria' | 'eletrica' | 'revestimentos' | 'hidraulica'

export interface BlockSize {
  w: number
  d: number
  h?: number
}

/** Definição de bloco do catálogo (= `CatalogItem` do banco; o projeto guarda uma cópia). */
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
  /** Tipo de móvel (banco `JoineryType`): padrões do detalhamento (base, puxador…). */
  joineryType?: string
  /** Fica POR BAIXO dos outros móveis (tapetes): desenhado primeiro e clicado por último. */
  underlay?: boolean
  /** Preço de referência (centavos), sugerido ao inserir. */
  refPriceCents?: number
  symbol: BlockSymbol
}

import type { Vec2 } from '../geometry/vec'
import type { DimStyle } from './style'

export type DimOrientation = 'aligned' | 'horizontal' | 'vertical'

/** Cota simples entre dois pontos do modelo. */
export interface LinearDimension {
  kind: 'dimension'
  p1: Vec2
  p2: Vec2
  orientation?: DimOrientation
  /**
   * Distância (mm de papel) entre p1 e a linha de cota, medida na normal à ESQUERDA de
   * quem vai de p1 para p2 (visualmente). Ex.: p1 à esquerda de p2 → positivo = acima.
   */
  offset: number
  /** Substitui o texto calculado. */
  text?: string
  style?: Partial<DimStyle>
}

/** Cota em cadeia: vãos consecutivos na mesma linha + (opcional) linha de total. */
export interface ChainDimension {
  kind: 'chain'
  /** Pontos do modelo; são ordenados pela projeção na direção da cota. */
  points: Vec2[]
  orientation?: DimOrientation
  offset: number
  /** Desenha a cota total numa linha mais afastada do objeto. */
  total?: boolean
  style?: Partial<DimStyle>
}

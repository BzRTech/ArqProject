/** Revestimento de piso aplicado a uma área (cópia dos dados do catálogo, editável). */
export type FloorMaterial =
  'porcelanato' | 'ceramica' | 'madeira' | 'vinilico' | 'laminado' | 'pedra' | 'cimento' | 'carpete'

/** grade = juntas alinhadas; meia/terço = amarração (cada fiada desloca 1/2 ou 1/3 da peça). */
export type FloorPattern = 'grid' | 'half' | 'third'

export interface FloorFinishDef {
  id: string
  name: string
  material: FloorMaterial
  /** Comprimento da peça (ao longo da direção de assentamento), mm. 0 = monolítico. */
  pieceAMm: number
  /** Largura da peça, mm. */
  pieceBMm: number
  /** Espessura da junta (rejunte), mm. */
  jointMm: number
  pattern: FloorPattern
  /** Perda sugerida (%), maior em diagonal e em réguas. */
  wastePct: number
  /** Cor do modo humanizado. */
  color: string
}

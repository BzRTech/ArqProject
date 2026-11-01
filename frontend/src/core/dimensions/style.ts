import { PEN } from '../drawing/styles'

/** Estilo de cota, tudo em mm de papel. Futuro: vem do SheetTemplate do banco. */
export interface DimStyle {
  color: string
  textSize: number
  /** Afastamento entre a linha de cota e o texto. */
  textGap: number
  /** Folga mínima de cada lado do texto para ele caber no vão. */
  textPadding: number
  /** Comprimento total do traço oblíquo. */
  tickLength: number
  /** Distância entre o objeto e o início da linha de chamada. */
  extGap: number
  /** Quanto a linha de chamada passa da linha de cota. */
  extOvershoot: number
  /** Quanto a linha de cota passa do último traço. */
  lineExtension: number
  /** Distância entre linhas de cota paralelas (cadeia → total). */
  rowGap: number
  lineWeight: number
  tickWeight: number
}

export const DEFAULT_DIM_STYLE: DimStyle = {
  color: '#000000',
  textSize: 2.2,
  textGap: 0.8,
  textPadding: 0.4,
  tickLength: 2,
  extGap: 1,
  extOvershoot: 1.5,
  lineExtension: 1.2,
  rowGap: 6,
  lineWeight: PEN.extraFine,
  tickWeight: PEN.medium,
}

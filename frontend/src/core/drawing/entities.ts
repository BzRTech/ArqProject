import type { ChainDimension, LinearDimension } from '../dimensions/types'
import type { Vec2 } from '../geometry/vec'
import type { TextAnchor } from './primitives'
import type { FillStyle, StrokeStyle } from './styles'

/**
 * Entidades de desenho no espaço do MODELO (mm, y para baixo).
 * Tamanhos "de papel" (texto, espaçamento de hachura, pena) ficam em mm de papel.
 */

export type HatchPattern =
  | { kind: 'lines'; angleDeg: number; spacing: number }
  | { kind: 'cross'; angleDeg: number; spacing: number }
  | { kind: 'solid' }

export type TextVAlign = 'baseline' | 'middle' | 'top' | 'bottom'

export type Entity =
  | { kind: 'line'; a: Vec2; b: Vec2; style?: StrokeStyle }
  | {
      kind: 'polyline'
      points: Vec2[]
      closed?: boolean
      style?: StrokeStyle | null
      fill?: FillStyle
    }
  | {
      kind: 'rect'
      x: number
      y: number
      width: number
      height: number
      style?: StrokeStyle | null
      fill?: FillStyle
    }
  | { kind: 'circle'; center: Vec2; radius: number; style?: StrokeStyle | null; fill?: FillStyle }
  | {
      kind: 'arc'
      center: Vec2
      radius: number
      /** Graus; 0° = +x, positivo = horário visual. */
      startDeg: number
      /** Abertura em graus; positivo = horário visual. */
      sweepDeg: number
      style?: StrokeStyle
    }
  | {
      kind: 'text'
      at: Vec2
      text: string
      /** Altura do corpo, mm de papel. */
      size: number
      anchor?: TextAnchor
      vAlign?: TextVAlign
      rotationDeg?: number
      weight?: 'normal' | 'bold'
      color?: string
    }
  | {
      kind: 'hatch'
      /** Contorno externo + furos opcionais. */
      boundary: Vec2[]
      holes?: Vec2[][]
      pattern: HatchPattern
      style?: StrokeStyle
      fill?: FillStyle
    }
  | {
      kind: 'image'
      x: number
      y: number
      width: number
      height: number
      href: string
      opacity?: number
    }
  | LinearDimension
  | ChainDimension
  | { kind: 'group'; role: string; children: Entity[] }

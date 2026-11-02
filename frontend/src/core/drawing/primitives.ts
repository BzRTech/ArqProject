import type { Vec2 } from '../geometry/vec'

/**
 * Primitivas finais, em MILÍMETROS DE PAPEL, prontas para os renderizadores.
 * Tudo que é cálculo (escala, cotas, hachura, arco, posição de texto, traço) já foi feito.
 */

export interface Stroke {
  color: string
  /** Espessura da pena, mm de papel. */
  width: number
  /** Padrão de traço em mm de papel; `null` = contínuo. */
  dash: number[] | null
  cap: 'butt' | 'round' | 'square'
}

export interface Fill {
  color: string
  opacity: number
}

export type TextAnchor = 'start' | 'middle' | 'end'

export type Primitive =
  | { kind: 'line'; a: Vec2; b: Vec2; stroke: Stroke }
  | { kind: 'polyline'; points: Vec2[]; closed: boolean; stroke: Stroke | null; fill: Fill | null }
  | { kind: 'circle'; center: Vec2; r: number; stroke: Stroke | null; fill: Fill | null }
  | {
      kind: 'arc'
      from: Vec2
      to: Vec2
      r: number
      largeArc: boolean
      /** Sentido horário visual (y para baixo). */
      clockwise: boolean
      stroke: Stroke
    }
  | {
      kind: 'text'
      /** Ponto da LINHA DE BASE, já ajustado para o alinhamento vertical pedido. */
      at: Vec2
      text: string
      /** Altura do corpo da fonte, mm de papel. */
      size: number
      anchor: TextAnchor
      rotationDeg: number
      weight: 'normal' | 'bold'
      color: string
    }
  | {
      kind: 'image'
      x: number
      y: number
      width: number
      height: number
      href: string
      opacity: number
    }
  | { kind: 'group'; role: string; children: Primitive[] }

/** Percorre todas as primitivas (inclusive dentro de grupos). */
export function* walk(prims: readonly Primitive[]): Generator<Primitive> {
  for (const p of prims) {
    yield p
    if (p.kind === 'group') yield* walk(p.children)
  }
}

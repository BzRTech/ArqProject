import { layoutChainDimension, layoutLinearDimension } from '../dimensions/layout'
import { hatchLines } from '../geometry/polygon'
import { add, polar, scale, type Vec2 } from '../geometry/vec'
import type { Entity, TextVAlign } from './entities'
import type { Fill, Primitive } from './primitives'
import { PEN, resolveStroke, type FillStyle } from './styles'
import { CAP_HEIGHT, DESCENT } from './text-metrics'

/** Como o modelo é posto no papel: escala 1:`scale` e onde cai a origem do modelo. */
export interface View {
  scale: number
  /** Posição (mm de papel) do ponto (0,0) do modelo. */
  origin: Vec2
}

/** Vista identidade: as entidades já estão em mm de papel. */
export const PAPER_VIEW: View = { scale: 1, origin: { x: 0, y: 0 } }

const toFill = (f: FillStyle | undefined): Fill | null =>
  f ? { color: f.color, opacity: f.opacity ?? 1 } : null

/** Deslocamento da linha de base para o alinhamento vertical pedido, em múltiplos do corpo. */
function baselineShift(v: TextVAlign): number {
  switch (v) {
    case 'baseline':
      return 0
    case 'middle':
      return CAP_HEIGHT / 2
    case 'top':
      return CAP_HEIGHT
    case 'bottom':
      return -DESCENT
  }
}

/** Converte entidades do modelo em primitivas de papel. Toda a geometria é resolvida aqui. */
export function compileView(entities: readonly Entity[], view: View): Primitive[] {
  const k = 1 / view.scale
  const P = (p: Vec2): Vec2 => ({ x: p.x * k + view.origin.x, y: p.y * k + view.origin.y })

  const compile = (e: Entity): Primitive | Primitive[] => {
    switch (e.kind) {
      case 'line':
        return { kind: 'line', a: P(e.a), b: P(e.b), stroke: resolveStroke(e.style) }

      case 'polyline':
        return {
          kind: 'polyline',
          points: e.points.map(P),
          closed: e.closed ?? false,
          stroke: e.style === null ? null : resolveStroke(e.style),
          fill: toFill(e.fill),
        }

      case 'rect': {
        const pts = [
          { x: e.x, y: e.y },
          { x: e.x + e.width, y: e.y },
          { x: e.x + e.width, y: e.y + e.height },
          { x: e.x, y: e.y + e.height },
        ]
        return {
          kind: 'polyline',
          points: pts.map(P),
          closed: true,
          stroke: e.style === null ? null : resolveStroke(e.style),
          fill: toFill(e.fill),
        }
      }

      case 'circle':
        return {
          kind: 'circle',
          center: P(e.center),
          r: e.radius * k,
          stroke: e.style === null ? null : resolveStroke(e.style),
          fill: toFill(e.fill),
        }

      case 'arc': {
        const stroke = resolveStroke(e.style)
        if (Math.abs(e.sweepDeg) >= 360) {
          return { kind: 'circle', center: P(e.center), r: e.radius * k, stroke, fill: null }
        }
        return {
          kind: 'arc',
          from: P(polar(e.center, e.radius, e.startDeg)),
          to: P(polar(e.center, e.radius, e.startDeg + e.sweepDeg)),
          r: e.radius * k,
          largeArc: Math.abs(e.sweepDeg) > 180,
          clockwise: e.sweepDeg > 0,
          stroke,
        }
      }

      case 'text': {
        const rot = e.rotationDeg ?? 0
        const rad = (rot * Math.PI) / 180
        // "Para cima" do texto girado (y para baixo).
        const up: Vec2 = { x: Math.sin(rad), y: -Math.cos(rad) }
        const shift = baselineShift(e.vAlign ?? 'baseline') * e.size
        return {
          kind: 'text',
          at: add(P(e.at), scale(up, -shift)),
          text: e.text,
          size: e.size,
          anchor: e.anchor ?? 'start',
          rotationDeg: rot,
          weight: e.weight ?? 'normal',
          color: e.color ?? '#000000',
        }
      }

      case 'hatch': {
        const rings = [e.boundary, ...(e.holes ?? [])].map((r) => r.map(P))
        const children: Primitive[] = []
        if (e.pattern.kind === 'solid' || e.fill) {
          // Furos via contorno único não são suportados no preenchimento sólido simples.
          children.push({
            kind: 'polyline',
            points: rings[0]!,
            closed: true,
            stroke: null,
            fill: toFill(e.fill) ?? { color: e.style?.color ?? '#000000', opacity: 1 },
          })
        }
        if (e.pattern.kind !== 'solid') {
          const stroke = resolveStroke({ weight: PEN.extraFine, ...e.style })
          const angles =
            e.pattern.kind === 'cross'
              ? [e.pattern.angleDeg, e.pattern.angleDeg + 90]
              : [e.pattern.angleDeg]
          for (const ang of angles) {
            // Meio espaçamento de deslocamento: evita linha sobre o contorno de medidas redondas.
            for (const s of hatchLines(rings, ang, e.pattern.spacing, e.pattern.spacing / 2)) {
              children.push({ kind: 'line', a: s.a, b: s.b, stroke })
            }
          }
        }
        return { kind: 'group', role: 'hatch', children }
      }

      case 'image': {
        const tl = P({ x: e.x, y: e.y })
        return {
          kind: 'image',
          x: tl.x,
          y: tl.y,
          width: e.width * k,
          height: e.height * k,
          href: e.href,
          opacity: e.opacity ?? 1,
        }
      }

      case 'dimension':
        return layoutLinearDimension(e, P)

      case 'chain':
        return layoutChainDimension(e, P)

      case 'group':
        return { kind: 'group', role: e.role, children: compileView(e.children, view) }
    }
  }

  return entities.flatMap((e) => compile(e))
}

import type { Primitive, Stroke } from '../drawing/primitives'
import { CAP_HEIGHT, textWidth } from '../drawing/text-metrics'
import { add, angleDeg, dot, leftNormal, normalize, scale, sub, type Vec2 } from '../geometry/vec'
import { formatCm, roundMm } from '../units'
import { DEFAULT_DIM_STYLE, type DimStyle } from './style'
import type { ChainDimension, DimOrientation, LinearDimension } from './types'

export type ToPaper = (p: Vec2) => Vec2

interface RowInput {
  points: Vec2[]
  orientation: DimOrientation
  offset: number
  style: DimStyle
  toPaper: ToPaper
  texts?: (string | undefined)[]
  /** Omite as linhas de chamada destes índices (já desenhadas por outra linha). */
  skipExt?: Set<number>
  /** Ponto de referência para o afastamento (padrão: o primeiro ponto). */
  reference?: Vec2
  role: string
}

/** Direção da cota no modelo. */
export function dimensionDirection(p1: Vec2, p2: Vec2, orientation: DimOrientation): Vec2 {
  const d = sub(p2, p1)
  if (orientation === 'horizontal') return { x: d.x < 0 ? -1 : 1, y: 0 }
  if (orientation === 'vertical') return { x: 0, y: d.y < 0 ? -1 : 1 }
  return normalize(d)
}

/** Rotação legível do texto: em [-90°, 90°) — lido de baixo ou da direita (NBR 10126). */
export function readableRotation(dir: Vec2): number {
  let a = angleDeg(dir) // [0, 360)
  if (a >= 180) a -= 360 // (-180, 180)
  if (a >= 90) a -= 180
  if (a < -90) a += 180
  return a === 0 ? 0 : a
}

/**
 * Valores em mm inteiros de cada vão, a partir das posições ACUMULADAS arredondadas:
 * a soma dos vãos é sempre igual ao total arredondado (sem "erro de 1 mm").
 */
export function chainValues(positions: number[]): number[] {
  const r = positions.map(roundMm)
  return r.slice(1).map((v, i) => v - r[i]!)
}

function stroke(color: string, width: number): Stroke {
  return { color, width, dash: null, cap: 'butt' }
}

/** Uma linha de cota (2 pontos = cota simples; n pontos = cadeia). */
function layoutRow(input: RowInput): Primitive {
  const { orientation, offset, style: st, toPaper } = input
  const first = input.points[0]!
  const last = input.points[input.points.length - 1]!
  const dir = dimensionDirection(first, last, orientation)
  const n = leftNormal(dir)

  // Ordena pela projeção (modelo) e calcula posições paralelas à cota.
  const model = input.points
    .map((p, i) => ({ p, i, s: dot(sub(p, first), dir) }))
    .sort((a, b) => a.s - b.s)
  const values = chainValues(model.map((m) => m.s))

  const P0 = toPaper(input.reference ?? first)
  const base = add(P0, scale(n, offset))
  const paper = model.map((m) => {
    const P = toPaper(m.p)
    const t = dot(sub(P, P0), dir)
    return { P, Q: add(base, scale(dir, t)), t, i: m.i }
  })

  const out: Primitive[] = []
  const lineStroke = stroke(st.color, st.lineWeight)

  // Linhas de chamada
  paper.forEach(({ P, Q }, k) => {
    if (input.skipExt?.has(k)) return
    const along = dot(sub(Q, P), n)
    if (Math.abs(along) <= st.extGap) return
    const sgn = Math.sign(along)
    out.push({
      kind: 'line',
      a: add(P, scale(n, sgn * st.extGap)),
      b: add(Q, scale(n, sgn * st.extOvershoot)),
      stroke: lineStroke,
    })
  })

  // Textos (decide posição antes para estender a linha de cota se precisar)
  const rot = readableRotation(dir)
  const rad = (rot * Math.PI) / 180
  const up: Vec2 = { x: Math.sin(rad), y: -Math.cos(rad) }
  const capH = CAP_HEIGHT * st.textSize
  const outward = Math.sign(offset) || 1 // lado oposto ao objeto
  const nOut = scale(n, outward)
  let tMin = paper[0]!.t
  let tMax = paper[paper.length - 1]!.t
  let staggerLevel = 0
  const texts: Primitive[] = []

  for (let k = 0; k + 1 < paper.length; k++) {
    const a = paper[k]!
    const b = paper[k + 1]!
    const label = input.texts?.[k] ?? formatCm(values[k]!)
    const w = textWidth(label, st.textSize)
    const len = b.t - a.t
    let centerT = (a.t + b.t) / 2
    let level = 0
    if (w + 2 * st.textPadding > len) {
      const isLast = k + 1 === paper.length - 1
      const isFirst = k === 0
      if (isLast) {
        centerT = b.t + st.lineExtension + st.textPadding + w / 2
        tMax = Math.max(tMax, centerT + w / 2)
      } else if (isFirst) {
        centerT = a.t - st.lineExtension - st.textPadding - w / 2
        tMin = Math.min(tMin, centerT - w / 2)
      } else {
        staggerLevel = staggerLevel === 1 ? 2 : 1
        level = staggerLevel
      }
    }
    if (level === 0) staggerLevel = 0
    const lift = st.textGap + capH / 2 + level * (capH + st.textGap)
    const center = add(add(base, scale(dir, centerT)), scale(nOut, lift))
    const baseline = sub(center, scale(up, capH / 2))
    texts.push({
      kind: 'text',
      at: baseline,
      text: label,
      size: st.textSize,
      anchor: 'middle',
      rotationDeg: rot,
      weight: 'normal',
      color: st.color,
    })
  }

  // Linha de cota
  out.push({
    kind: 'line',
    a: add(base, scale(dir, tMin - st.lineExtension)),
    b: add(base, scale(dir, tMax + st.lineExtension)),
    stroke: lineStroke,
  })

  // Traços oblíquos (45° em relação à linha de cota)
  const tick = scale(normalize(add(dir, n)), st.tickLength / 2)
  for (const { Q } of paper) {
    out.push({
      kind: 'line',
      a: sub(Q, tick),
      b: add(Q, tick),
      stroke: stroke(st.color, st.tickWeight),
    })
  }

  return { kind: 'group', role: input.role, children: [...out, ...texts] }
}

export function layoutLinearDimension(dim: LinearDimension, toPaper: ToPaper): Primitive {
  return layoutRow({
    points: [dim.p1, dim.p2],
    orientation: dim.orientation ?? 'aligned',
    offset: dim.offset,
    style: { ...DEFAULT_DIM_STYLE, ...dim.style },
    toPaper,
    texts: [dim.text],
    role: 'dimension',
  })
}

export function layoutChainDimension(dim: ChainDimension, toPaper: ToPaper): Primitive {
  if (dim.points.length < 2) throw new Error('Cota em cadeia precisa de pelo menos 2 pontos')
  const style = { ...DEFAULT_DIM_STYLE, ...dim.style }
  const orientation = dim.orientation ?? 'aligned'
  const n = dim.points.length
  const rows: Primitive[] = [
    layoutRow({
      points: dim.points,
      orientation,
      offset: dim.offset,
      style,
      toPaper,
      // As extremidades ficam a cargo da linha de total, que é mais longa.
      skipExt: dim.total && n > 2 ? new Set([0, n - 1]) : undefined,
      role: 'chain-row',
    }),
  ]
  if (dim.total && n > 2) {
    const dir = dimensionDirection(dim.points[0]!, dim.points[n - 1]!, orientation)
    const sorted = [...dim.points].sort((a, b) => dot(a, dir) - dot(b, dir))
    const outward = Math.sign(dim.offset) || 1
    rows.push(
      layoutRow({
        points: [sorted[0]!, sorted[sorted.length - 1]!],
        orientation,
        offset: dim.offset + outward * style.rowGap,
        style,
        toPaper,
        reference: dim.points[0],
        role: 'chain-total',
      }),
    )
  }
  return { kind: 'group', role: 'chain-dimension', children: rows }
}

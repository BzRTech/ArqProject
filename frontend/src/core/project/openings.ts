import type { Entity } from '../drawing/entities'
import { PEN, type StrokeStyle } from '../drawing/styles'
import { add, angleDeg, cross, dot, leftNormal, scale, sub, type Vec2 } from '../geometry/vec'
import type { Opening, OpeningType, Wall } from './schema'
import { wallSegments, type AxisInterval } from './walls'

export interface OpeningDef {
  type: OpeningType
  kind: 'door' | 'window'
  name: string
  widthMm: number
  heightMm: number
  sillMm: number
}

/** Tipos de esquadria e medidas padrão (viram banco na Fase 3). */
export const OPENING_DEFS: OpeningDef[] = [
  {
    type: 'porta-abrir',
    kind: 'door',
    name: 'Porta de abrir',
    widthMm: 800,
    heightMm: 2100,
    sillMm: 0,
  },
  {
    type: 'porta-correr',
    kind: 'door',
    name: 'Porta de correr',
    widthMm: 900,
    heightMm: 2100,
    sillMm: 0,
  },
  {
    type: 'porta-pivotante',
    kind: 'door',
    name: 'Porta pivotante',
    widthMm: 1200,
    heightMm: 2400,
    sillMm: 0,
  },
  {
    type: 'janela-correr-2',
    kind: 'window',
    name: 'Janela de correr 2 folhas',
    widthMm: 1200,
    heightMm: 1200,
    sillMm: 1000,
  },
  {
    type: 'janela-correr-4',
    kind: 'window',
    name: 'Janela de correr 4 folhas',
    widthMm: 2000,
    heightMm: 1200,
    sillMm: 1000,
  },
  {
    type: 'janela-maxim-ar',
    kind: 'window',
    name: 'Janela maxim-ar',
    widthMm: 600,
    heightMm: 600,
    sillMm: 1500,
  },
  {
    type: 'janela-basculante',
    kind: 'window',
    name: 'Janela basculante',
    widthMm: 600,
    heightMm: 600,
    sillMm: 1500,
  },
  {
    type: 'janela-fixa',
    kind: 'window',
    name: 'Janela fixa',
    widthMm: 1000,
    heightMm: 1000,
    sillMm: 1000,
  },
]

export const openingDef = (type: OpeningType): OpeningDef =>
  OPENING_DEFS.find((d) => d.type === type)!

/** Geometria do vão no modelo. */
export interface OpeningFrame {
  /** Extremidades do vão no eixo da parede (a = lado do início do trecho). */
  a: Vec2
  b: Vec2
  center: Vec2
  dir: Vec2
  /** Normal à esquerda do trecho. */
  n: Vec2
  /** Normal para o lado `side` (abertura da porta / lado externo da janela). */
  ns: Vec2
  halfThickness: number
  width: number
  /** Centro já limitado ao trecho. */
  offset: number
  /** Posição do centro ao longo de toda a parede (para recortar). */
  axisPosition: number
}

export function openingFrame(wall: Wall, o: Opening): OpeningFrame | null {
  const seg = wallSegments(wall).find((s) => s.index === o.segment)
  if (!seg) return null
  const width = Math.min(o.widthMm, seg.length)
  const offset = Math.min(seg.length - width / 2, Math.max(width / 2, o.offsetMm))
  const center = add(seg.a, scale(seg.dir, offset))
  const n = leftNormal(seg.dir)
  return {
    a: add(center, scale(seg.dir, -width / 2)),
    b: add(center, scale(seg.dir, width / 2)),
    center,
    dir: seg.dir,
    n,
    ns: o.side === 'left' ? n : scale(n, -1),
    halfThickness: wall.thicknessMm / 2,
    width,
    offset,
    axisPosition: seg.start + offset,
  }
}

/** Intervalos do eixo a recortar de cada parede. */
export function openingGaps(wall: Wall, openings: readonly Opening[]): AxisInterval[] {
  return openings
    .filter((o) => o.wallId === wall.id)
    .flatMap((o) => {
      const f = openingFrame(wall, o)
      return f ? [{ from: f.axisPosition - f.width / 2, to: f.axisPosition + f.width / 2 }] : []
    })
}

const thin = { weight: PEN.fine }
const fine = { weight: PEN.extraFine }
const LEAF = 35 // espessura da folha da porta, mm

function rect(
  p: Vec2,
  u: Vec2,
  v: Vec2,
  lu: number,
  lv: number,
  style: StrokeStyle = { weight: PEN.medium },
  filled = true,
): Entity {
  return {
    kind: 'polyline',
    points: [
      p,
      add(p, scale(u, lu)),
      add(add(p, scale(u, lu)), scale(v, lv)),
      add(p, scale(v, lv)),
    ],
    closed: true,
    style,
    ...(filled ? { fill: { color: '#ffffff' } } : {}),
  }
}

function seg(
  a: Vec2,
  b: Vec2,
  style: { weight: number; lineType?: 'hidden' | 'dashed' } = thin,
): Entity {
  return { kind: 'line', a, b, style }
}

/** Arco de `center`, raio r, saindo da direção `from` e girando 90° em direção a `to`. */
function quarter(center: Vec2, r: number, from: Vec2, to: Vec2): Entity {
  return {
    kind: 'arc',
    center,
    radius: r,
    startDeg: angleDeg(from),
    sweepDeg: cross(from, to) >= 0 ? 90 : -90,
    style: thin,
  }
}

/** Símbolo da esquadria em planta (o recorte da parede é feito em wallEntities). */
export function openingEntities(wall: Wall, o: Opening): Entity[] {
  const f = openingFrame(wall, o)
  if (!f) return []
  const { a, b, center, dir, n, ns, halfThickness: h, width: w } = f
  const at = (p: Vec2, across: number) => add(p, scale(n, across))
  // Sentido da dobradiça para o outro batente
  const hingeJamb = o.hinge === 'start' ? a : b
  const u = o.hinge === 'start' ? dir : scale(dir, -1)
  const out: Entity[] = []

  switch (o.type) {
    case 'porta-abrir': {
      const hinge = add(hingeJamb, scale(ns, h))
      out.push(rect(hinge, ns, u, w, LEAF))
      out.push(quarter(hinge, w, ns, u))
      break
    }
    case 'porta-correr': {
      // Folha aparente correndo pelo lado `side`; tracejado = posição aberta.
      const base = add(add(hingeJamb, scale(ns, h + 10)), scale(u, -40))
      out.push(rect(base, u, ns, w + 80, LEAF))
      out.push(
        rect(add(base, scale(u, -w)), u, ns, w + 80, LEAF, { ...fine, lineType: 'hidden' }, false),
      )
      break
    }
    case 'porta-pivotante': {
      const pivot = add(hingeJamb, scale(u, w * 0.2))
      const long = w * 0.8
      const short = w * 0.2
      out.push(
        rect(add(add(pivot, scale(ns, -short)), scale(u, -LEAF / 2)), ns, u, long + short, LEAF),
      )
      out.push(quarter(pivot, long, ns, u))
      out.push(quarter(pivot, short, scale(ns, -1), scale(u, -1)))
      break
    }
    default: {
      // Janela: peitoril visto nas duas faces + caixilhos no meio da parede.
      out.push(seg(at(a, h), at(b, h), fine), seg(at(a, -h), at(b, -h), fine))
      const sash = (from: number, to: number, across: number) =>
        out.push(
          seg(
            add(add(a, scale(dir, from)), scale(n, across)),
            add(add(a, scale(dir, to)), scale(n, across)),
            thin,
          ),
        )
      const glass = () => {
        sash(0, w, 8)
        sash(0, w, -8)
      }
      if (o.type === 'janela-correr-2') {
        sash(0, w / 2 + 40, 15)
        sash(w / 2 - 40, w, -15)
      } else if (o.type === 'janela-correr-4') {
        sash(0, w / 4 + 30, -15)
        sash(w / 4 - 30, w / 2, 15)
        sash(w / 2, (3 * w) / 4 + 30, 15)
        sash((3 * w) / 4 - 30, w, -15)
      } else if (o.type === 'janela-maxim-ar') {
        glass()
        const out1 = (p: Vec2) => add(p, scale(ns, h))
        out.push({
          kind: 'polyline',
          points: [out1(a), add(out1(center), scale(ns, w * 0.3)), out1(b)],
          style: { ...fine, lineType: 'hidden' },
        })
      } else if (o.type === 'janela-basculante') {
        glass()
        for (const side of [ns, scale(ns, -1)]) {
          const f1 = (p: Vec2) => add(p, scale(side, h))
          out.push({
            kind: 'polyline',
            points: [f1(a), add(f1(center), scale(side, w * 0.15)), f1(b)],
            style: { ...fine, lineType: 'hidden' },
          })
        }
      } else {
        glass()
      }
    }
  }
  return out
}

/** Clique sobre o vão (e sobre o giro da porta de abrir). */
export function hitOpening(wall: Wall, o: Opening, p: Vec2, tol: number): boolean {
  const f = openingFrame(wall, o)
  if (!f) return false
  const rel = sub(p, f.center)
  const along = dot(rel, f.dir)
  const across = dot(rel, f.ns)
  if (Math.abs(along) > f.width / 2 + tol) return false
  const reach = o.type === 'porta-abrir' ? f.width : o.type === 'porta-correr' ? LEAF + 20 : 0
  return across >= -f.halfThickness - tol && across <= f.halfThickness + reach + tol
}

/** Pontos notáveis do vão (batentes nas duas faces), para snap e cotas. */
export function openingJambs(wall: Wall, o: Opening): Vec2[] {
  const f = openingFrame(wall, o)
  if (!f) return []
  const h = f.halfThickness
  return [
    add(f.a, scale(f.n, h)),
    add(f.a, scale(f.n, -h)),
    add(f.b, scale(f.n, h)),
    add(f.b, scale(f.n, -h)),
  ]
}

/** Centro do trecho (ao longo do eixo), para centralizar portas e janelas. */
export function segmentCenterOffset(wall: Wall, segment: number): number | null {
  const s = wallSegments(wall).find((x) => x.index === segment)
  return s ? s.length / 2 : null
}

/**
 * Distâncias LIVRES do vão até as faces internas das paredes vizinhas (o que se mede na
 * obra), dos dois lados. Nos cantos desconta meia espessura; ponta solta não desconta.
 */
export function openingClearances(wall: Wall, o: Opening): { start: number; end: number } | null {
  const f = openingFrame(wall, o)
  const segs = wallSegments(wall)
  const k = segs.findIndex((x) => x.index === o.segment)
  if (!f || k < 0) return null
  const s = segs[k]!
  const h = f.halfThickness
  const cornerStart = wall.closed || k > 0
  const cornerEnd = wall.closed || k < segs.length - 1
  return {
    start: f.offset - f.width / 2 - (cornerStart ? h : 0),
    end: s.length - (f.offset + f.width / 2) - (cornerEnd ? h : 0),
  }
}

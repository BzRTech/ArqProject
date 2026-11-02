import { dimensionDirection } from '../dimensions/layout'
import { centroid } from '../geometry/polygon'
import { add, cross, distance, dot, leftNormal, scale, sub, type Vec2 } from '../geometry/vec'
import { roundMm } from '../units'
import { innerFacePolygon } from './areas'
import { wallChainDimensions } from './auto-dims'
import { itemCorners } from './items'
import type {
  ChainDrawing,
  DimensionDrawing,
  DimRef,
  Drawing,
  Environment,
  Item,
  Wall,
} from './schema'
import { wallOutline } from './walls'

/**
 * Cotas LIGADAS: cada uma guarda o que mede (`ref`) e é recalculada a partir da parede ou do
 * móvel sempre que eles mudam (`syncLinkedDims`). Continuam sendo cotas comuns no documento:
 * dá para selecionar, afastar e apagar.
 */

/** Afastamento da cota interna em relação à face interna, mm do modelo (para dentro). */
export const INNER_DIM_OFFSET = 400
/** Folga mínima para cotar a posição de um móvel (encostado = sem cota). */
export const MIN_ITEM_GAP = 10
/** Distância máxima procurada até uma parede. */
const MAX_ITEM_GAP = 15000

type Orientation = DimensionDrawing['orientation']
const r = (p: Vec2): Vec2 => ({ x: roundMm(p.x), y: roundMm(p.y) })
const orientationOf = (d: Vec2): Orientation =>
  Math.abs(d.y) < 1e-9 ? 'horizontal' : Math.abs(d.x) < 1e-9 ? 'vertical' : 'aligned'

/** Afastamento (com sinal, na convenção de `DimensionDrawing`) para ir na direção `toward`. */
function offsetToward(p1: Vec2, p2: Vec2, o: Orientation, toward: Vec2, amount: number) {
  const dir = dimensionDirection(p1, p2, o)
  return (Math.sign(dot(toward, leftNormal(dir))) || 1) * amount
}

export interface InnerDim {
  segment: number
  p1: Vec2
  p2: Vec2
  orientation: Orientation
  offsetMm: number
}

/** Medidas internas (área útil) de uma parede fechada: uma por trecho, de face a face. */
export function wallInnerDimensions(wall: Wall, offset = INNER_DIM_OFFSET): InnerDim[] {
  const face = innerFacePolygon(wall)
  if (!face || face.length < 3) return []
  const c = centroid(face)
  return face.map((a, k) => {
    const b = face[(k + 1) % face.length]!
    const orientation = orientationOf(sub(b, a))
    return {
      segment: k,
      p1: a,
      p2: b,
      orientation,
      offsetMm: offsetToward(a, b, orientation, sub(c, a), offset),
    }
  })
}

/** Cotas novas da parede: cadeias externas (com vãos) + medidas internas sem repetição. */
export function createWallDims(env: Environment, wallId: string, newId: () => string): Drawing[] {
  const wall = env.drawings.find((d): d is Wall => d.id === wallId && d.kind === 'wall')
  if (!wall) return []
  const outer: ChainDrawing[] = wallChainDimensions(wall, env.openings).map((c, segment) => ({
    id: newId(),
    kind: 'chain',
    ref: { kind: 'wall-outer', wallId, segment },
    ...c,
  }))
  // Internas: num retângulo, largura e profundidade (os lados opostos iguais não repetem).
  const kept: InnerDim[] = []
  for (const d of wallInnerDimensions(wall)) {
    const v = sub(d.p2, d.p1)
    const len = distance(d.p1, d.p2)
    const twin = kept.some((k) => {
      const w = sub(k.p2, k.p1)
      return Math.abs(cross(v, w)) <= 1e-6 * len * len && Math.abs(distance(k.p1, k.p2) - len) <= 1
    })
    if (!twin) kept.push(d)
  }
  const inner: DimensionDrawing[] = kept.map((d) => ({
    id: newId(),
    kind: 'dimension',
    ref: { kind: 'wall-inner', wallId, segment: d.segment },
    p1: d.p1,
    p2: d.p2,
    orientation: d.orientation,
    offsetMm: d.offsetMm,
  }))
  return [...outer, ...inner]
}

// --- Móveis -------------------------------------------------------------------------

/** Faces de todas as paredes (os dois contornos), para medir até elas. */
function wallFaces(env: Environment): [Vec2, Vec2][] {
  return env.drawings.flatMap((d) => {
    if (d.kind !== 'wall') return []
    const o = wallOutline(d.points, d.thicknessMm, d.closed)
    if (!o) return []
    return o.rings.flatMap((ring) =>
      ring.map((a, i): [Vec2, Vec2] => [a, ring[(i + 1) % ring.length]!]),
    )
  })
}

/** Raio m + t·n contra o segmento [a, b]: t (≥ 0) ou null. */
function rayHit(m: Vec2, n: Vec2, a: Vec2, b: Vec2): number | null {
  const s = sub(b, a)
  const den = cross(n, s)
  if (Math.abs(den) < 1e-9) return null
  const w = sub(a, m)
  const t = cross(w, s) / den
  const u = cross(w, n) / den
  return t >= -1e-6 && u >= -1e-6 && u <= 1 + 1e-6 ? t : null
}

/**
 * Folga do lado `side` do móvel (0 = fundo, 1, 2 = frente, 3, no sentido dos cantos) até a
 * parede mais próxima naquela direção, medida a partir do meio do lado.
 */
export function itemSideGap(env: Environment, item: Item, side: number) {
  const c = itemCorners(item)
  const a = c[side]!
  const b = c[(side + 1) % 4]!
  const m = scale(add(a, b), 0.5)
  const center = scale(add(c[0]!, c[2]!), 0.5)
  const out = sub(m, center)
  const len = Math.hypot(out.x, out.y)
  if (!len) return null
  const n = scale(out, 1 / len)
  let best: number | null = null
  for (const [p, q] of wallFaces(env)) {
    const t = rayHit(m, n, p, q)
    if (t !== null && t <= MAX_ITEM_GAP && (best === null || t < best)) best = t
  }
  return best === null ? null : { from: m, to: add(m, scale(n, best)), gap: roundMm(best) }
}

function itemDim(env: Environment, item: Item, side: number) {
  const g = itemSideGap(env, item, side)
  if (!g || g.gap < MIN_ITEM_GAP) return null
  const p1 = r(g.from)
  const p2 = r(g.to)
  return { p1, p2, orientation: orientationOf(sub(p2, p1)) }
}

/** Cotas novas da posição do móvel: um lado por direção que tenha folga até a parede. */
export function createItemDims(env: Environment, itemId: string, newId: () => string): Drawing[] {
  const item = env.items.find((i) => i.id === itemId)
  if (!item) return []
  return [0, 1, 2, 3].flatMap((side): Drawing[] => {
    const d = itemDim(env, item, side)
    return d
      ? [{ id: newId(), kind: 'dimension', ref: { kind: 'item', itemId, side }, offsetMm: 0, ...d }]
      : []
  })
}

// --- Sincronização ----------------------------------------------------------------

const samePts = (a: readonly Vec2[], b: readonly Vec2[]) =>
  a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y)

/** Cota ligada recalculada; null se o que ela mede sumiu (parede, trecho ou móvel). */
function resolve(env: Environment, d: Drawing): Drawing | null {
  if (d.kind !== 'chain' && d.kind !== 'dimension') return d
  const ref: DimRef | undefined = d.ref
  if (!ref) return d
  if (ref.kind === 'item') {
    if (d.kind !== 'dimension') return d
    const item = env.items.find((i) => i.id === ref.itemId)
    const g = item && itemDim(env, item, ref.side)
    if (!g) return null
    return samePts([d.p1, d.p2], [g.p1, g.p2]) && d.orientation === g.orientation
      ? d
      : { ...d, ...g }
  }
  const wall = env.drawings.find((w): w is Wall => w.id === ref.wallId && w.kind === 'wall')
  if (!wall) return null
  if (ref.kind === 'wall-outer') {
    if (d.kind !== 'chain') return d
    const c = wallChainDimensions(wall, env.openings)[ref.segment]
    if (!c) return null
    if (samePts(d.points, c.points) && d.orientation === c.orientation && d.total === c.total)
      return d
    // Mantém o afastamento escolhido pelo usuário (o lado pode ter virado: usa o sinal novo).
    const offsetMm = Math.sign(c.offsetMm) * Math.abs(d.offsetMm)
    return { ...d, points: c.points, orientation: c.orientation, total: c.total, offsetMm }
  }
  if (d.kind !== 'dimension') return d
  const inner = wallInnerDimensions(wall).find((x) => x.segment === ref.segment)
  if (!inner) return null
  if (samePts([d.p1, d.p2], [inner.p1, inner.p2]) && d.orientation === inner.orientation) return d
  const offsetMm = Math.sign(inner.offsetMm) * Math.abs(d.offsetMm)
  return { ...d, p1: inner.p1, p2: inner.p2, orientation: inner.orientation, offsetMm }
}

/**
 * Recalcula as cotas ligadas do ambiente. Devolve o MESMO array quando nada mudou (assim o
 * store não marca o projeto como alterado à toa).
 */
export function syncLinkedDims(env: Environment): Drawing[] {
  let changed = false
  const out: Drawing[] = []
  for (const d of env.drawings) {
    const x = resolve(env, d)
    if (x !== d) changed = true
    if (x) out.push(x)
  }
  return changed ? out : env.drawings
}

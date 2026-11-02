import { add, distance, dot, leftNormal, scale, sub, type Vec2 } from '../geometry/vec'
import { roundMm } from '../units'
import { openingFrame } from './openings'
import type { Opening, Wall } from './schema'
import { wallPoints, wallSegments } from './walls'

/**
 * Edição de paredes (funções puras). Toda edição devolve uma parede nova; depois,
 * `reattachOpenings` reencaixa portas e janelas no trecho mais próximo, mantendo a posição
 * delas no mundo (empurrar a parede da direita não arrasta a porta da parede de baixo).
 */

const r = (p: Vec2): Vec2 => ({ x: roundMm(p.x), y: roundMm(p.y) })
const withPoints = (w: Wall, points: Vec2[]): Wall => ({ ...w, points: points.map(r) })

/** Pontos limpos (parede fechada sem o ponto repetido no fim). */
const pts = (w: Wall) => wallPoints(w)

export function moveVertex(w: Wall, index: number, to: Vec2): Wall {
  const p = pts(w)
  if (!p[index]) return w
  p[index] = to
  return withPoints(w, p)
}

/** Empurra o trecho `seg` na direção da sua normal à esquerda (positivo) ou direita. */
export function pushSegment(w: Wall, seg: number, amount: number): Wall {
  const p = pts(w)
  const s = wallSegments(w).find((x) => x.index === seg)
  if (!s) return w
  const d = scale(leftNormal(s.dir), amount)
  const i = seg
  const j = (seg + 1) % p.length
  p[i] = add(p[i]!, d)
  p[j] = add(p[j]!, d)
  return withPoints(w, p)
}

/**
 * Muda o comprimento (eixo) do trecho `seg`. Parede fechada: o trecho seguinte é empurrado
 * paralelo (um retângulo continua retângulo). Parede aberta: tudo depois do trecho anda junto.
 */
export function setSegmentLength(w: Wall, seg: number, length: number): Wall {
  const p = pts(w)
  const s = wallSegments(w).find((x) => x.index === seg)
  if (!s || length <= 0) return w
  const delta = scale(s.dir, length - s.length)
  if (w.closed) {
    const j = (seg + 1) % p.length
    const k = (seg + 2) % p.length
    p[j] = add(p[j]!, delta)
    if (k !== seg) p[k] = add(p[k]!, delta)
  } else {
    for (let k = seg + 1; k < p.length; k++) p[k] = add(p[k]!, delta)
  }
  return withPoints(w, p)
}

/** Cria um canto no trecho `seg`, no ponto do eixo mais próximo de `at`. */
export function insertVertex(w: Wall, seg: number, at: Vec2): Wall {
  const p = pts(w)
  const s = wallSegments(w).find((x) => x.index === seg)
  if (!s) return w
  const t = Math.max(1, Math.min(s.length - 1, dot(sub(at, s.a), s.dir)))
  p.splice(seg + 1, 0, add(s.a, scale(s.dir, t)))
  return withPoints(w, p)
}

/** Remove um canto (se a parede continuar válida: 2 pontos aberta, 3 fechada). */
export function removeVertex(w: Wall, index: number): Wall {
  const p = pts(w)
  if (p.length <= (w.closed ? 3 : 2) || !p[index]) return w
  p.splice(index, 1)
  return withPoints(w, p)
}

/** Índice do canto perto de `at` (ou -1). */
export function vertexAt(w: Wall, at: Vec2, tol: number): number {
  return pts(w).findIndex((q) => distance(q, at) <= tol)
}

/** Recoloca as esquadrias da parede editada no trecho mais próximo do centro antigo delas. */
export function reattachOpenings(
  before: Wall,
  after: Wall,
  openings: readonly Opening[],
): Opening[] {
  const segs = wallSegments(after)
  return openings.map((o) => {
    if (o.wallId !== before.id) return o
    const f = openingFrame(before, o)
    if (!f || !segs.length) return o
    let best = { seg: o.segment, along: o.offsetMm, d: Infinity }
    for (const s of segs) {
      const t = Math.max(0, Math.min(s.length, dot(sub(f.center, s.a), s.dir)))
      const d = distance(f.center, add(s.a, scale(s.dir, t)))
      if (d < best.d) best = { seg: s.index, along: t, d }
    }
    return { ...o, segment: best.seg, offsetMm: roundMm(best.along) }
  })
}

// --- Edições LIGADAS: paredes encostadas acompanham --------------------------------
// Quarto e banheiro dividindo uma parede são duas paredes sobrepostas. Empurrar o trecho
// de uma deve empurrar o trecho coincidente da outra; mover um canto move os cantos
// que coincidem com ele.

const LINK_TOL = 1 // mm

/** Trecho `s` de outra parede está sobre a mesma reta de (a,b) e se sobrepõe a ele? */
function coincident(a: Vec2, b: Vec2, p: Vec2, q: Vec2): boolean {
  const d = sub(b, a)
  const len = Math.hypot(d.x, d.y)
  if (len < LINK_TOL) return false
  const u = scale(d, 1 / len)
  const n = leftNormal(u)
  if (Math.abs(dot(sub(p, a), n)) > LINK_TOL || Math.abs(dot(sub(q, a), n)) > LINK_TOL) return false
  const tp = dot(sub(p, a), u)
  const tq = dot(sub(q, a), u)
  return Math.min(Math.max(tp, tq), len) - Math.max(Math.min(tp, tq), 0) > LINK_TOL
}

function translateIndices(w: Wall, idx: Iterable<number>, d: Vec2): Wall {
  const p = pts(w)
  for (const i of new Set(idx)) if (p[i]) p[i] = add(p[i]!, d)
  return withPoints(w, p)
}

/** Translada o trecho `seg` da parede `wallId` por `d`, levando os trechos coincidentes. */
export function translateSegmentLinked(
  walls: readonly Wall[],
  wallId: string,
  seg: number,
  d: Vec2,
): Wall[] {
  const host = walls.find((w) => w.id === wallId)
  const s = host && wallSegments(host).find((x) => x.index === seg)
  if (!host || !s) return [...walls]
  return walls.map((w) => {
    if (w.id === wallId) {
      const n = pts(w).length
      return translateIndices(w, [seg, (seg + 1) % n], d)
    }
    const n = pts(w).length
    const idx = wallSegments(w)
      .filter((o) => coincident(s.a, s.b, o.a, o.b))
      .flatMap((o) => [o.index, (o.index + 1) % n])
    return idx.length ? translateIndices(w, idx, d) : w
  })
}

/** Empurra o trecho na normal à esquerda (positivo), levando paredes encostadas. */
export function pushSegmentLinked(
  walls: readonly Wall[],
  wallId: string,
  seg: number,
  amount: number,
): Wall[] {
  const host = walls.find((w) => w.id === wallId)
  const s = host && wallSegments(host).find((x) => x.index === seg)
  if (!s) return [...walls]
  return translateSegmentLinked(walls, wallId, seg, scale(leftNormal(s.dir), amount))
}

/** Move um canto e os cantos de outras paredes que estavam no mesmo ponto. */
export function moveVertexLinked(
  walls: readonly Wall[],
  wallId: string,
  index: number,
  to: Vec2,
): Wall[] {
  const host = walls.find((w) => w.id === wallId)
  const from = host && pts(host)[index]
  if (!host || !from) return [...walls]
  const d = sub(to, from)
  return walls.map((w) => {
    if (w.id === wallId) return moveVertex(w, index, to)
    const idx = pts(w).flatMap((q, i) => (distance(q, from) <= LINK_TOL ? [i] : []))
    return idx.length ? translateIndices(w, idx, d) : w
  })
}

/** A edição mexeu em alguma parede além da `wallId`? */
const touchesOthers = (before: readonly Wall[], after: readonly Wall[], wallId: string) =>
  after.some((w, i) => w.id !== wallId && w !== before[i])

/**
 * Comprimento de um trecho, com paredes ligadas. Muda pelo lado que NÃO mexe em outros
 * cômodos: se o trecho seguinte (ou a ponta seguinte, na parede aberta) é compartilhado com
 * outra parede, quem anda é o trecho anterior (ou a outra ponta). Só quando os dois lados são
 * compartilhados o vizinho vai junto.
 * Fechada: o trecho empurrado anda paralelo (um retângulo continua retângulo). Aberta: os
 * cantos daquele lado andam juntos.
 */
export function setSegmentLengthLinked(
  walls: readonly Wall[],
  wallId: string,
  seg: number,
  length: number,
): Wall[] {
  const host = walls.find((w) => w.id === wallId)
  const s = host && wallSegments(host).find((x) => x.index === seg)
  if (!host || !s || length <= 0) return [...walls]
  const delta = scale(s.dir, length - s.length)
  const p = pts(host)
  const n = p.length
  let forward: Wall[]
  let backward: Wall[]
  if (host.closed) {
    forward = translateSegmentLinked(walls, wallId, (seg + 1) % n, delta)
    backward = translateSegmentLinked(walls, wallId, (seg - 1 + n) % n, scale(delta, -1))
  } else {
    forward = shiftPointsLinked(walls, host, p.slice(seg + 1), seg + 1, n, delta)
    backward = shiftPointsLinked(walls, host, p.slice(0, seg + 1), 0, seg + 1, scale(delta, -1))
  }
  if (!touchesOthers(walls, forward, wallId)) return forward
  if (!touchesOthers(walls, backward, wallId)) return backward
  return forward
}

/** Parede aberta: anda os cantos [from, to) e os cantos de outras paredes no mesmo ponto. */
function shiftPointsLinked(
  walls: readonly Wall[],
  host: Wall,
  moved: Vec2[],
  from: number,
  to: number,
  d: Vec2,
): Wall[] {
  return walls.map((w) => {
    if (w.id === host.id)
      return translateIndices(
        w,
        Array.from({ length: to - from }, (_, k) => from + k),
        d,
      )
    const idx = pts(w).flatMap((q, i) => (moved.some((m) => distance(m, q) <= LINK_TOL) ? [i] : []))
    return idx.length ? translateIndices(w, idx, d) : w
  })
}

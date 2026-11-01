/** Consultas geométricas do editor sobre o documento (acerto por clique, pontos de snap). */
import { dimensionDirection } from '@/core/dimensions/layout'
import { textWidth } from '@/core/drawing/text-metrics'
import { add, distance, dot, leftNormal, scale, sub, vec, type Vec2 } from '@/core/geometry/vec'
import { shapeInRect, type BBox, type PickShape } from '@/core/geometry/bbox'
import { signedArea } from '@/core/geometry/polygon'
import { hitItem, itemCorners } from '@/core/project/items'
import { areaLabelCenter, areaM2Text } from '@/core/project/areas'
import { computeLegend, markerPosition } from '@/core/project/markers'
import { hitOpening, openingClearances, openingFrame, openingJambs } from '@/core/project/openings'
import type {
  ChainDrawing,
  DimensionDrawing,
  Environment,
  Opening,
  Wall,
} from '@/core/project/schema'
import {
  distanceToSegment,
  hitWall,
  wallOutline,
  wallPoints,
  wallSegments,
} from '@/core/project/walls'
import type { Entity } from '@/core/drawing/entities'
import type { SelRef, Selection } from './store'

export const DISPLAY_SCALE = 50

/** Linha de cota no modelo (onde o usuário a vê). Para cadeias, do primeiro ao último ponto. */
export function dimensionLine(d: DimensionDrawing | ChainDrawing): [Vec2, Vec2] {
  const p1 = d.kind === 'dimension' ? d.p1 : d.points[0]!
  const p2 = d.kind === 'dimension' ? d.p2 : d.points[d.points.length - 1]!
  const dir = dimensionDirection(p1, p2, d.orientation)
  const base = add(p1, scale(leftNormal(dir), d.offsetMm))
  if (d.kind === 'dimension') return [base, add(base, scale(dir, dot(sub(p2, p1), dir)))]
  const ts = d.points.map((p) => dot(sub(p, p1), dir))
  return [add(base, scale(dir, Math.min(...ts))), add(base, scale(dir, Math.max(...ts)))]
}

/** Retângulo aproximado de um texto (alinhado à esquerda, centrado na vertical). */
export function textBox(
  at: Vec2,
  text: string,
  sizeMm: number,
): { x: number; y: number; w: number; h: number } {
  const w = textWidth(text, sizeMm) * DISPLAY_SCALE
  const h = sizeMm * DISPLAY_SCALE
  return { x: at.x, y: at.y - h / 2, w, h }
}

export const wallsOf = (env: Environment): Wall[] =>
  env.drawings.filter((d): d is Wall => d.kind === 'wall')

/** O que está sob o ponteiro: itens, portas/janelas, textos, cotas e, por fim, paredes. */
export function hitTest(env: Environment, p: Vec2, tol: number): Selection {
  for (let i = env.items.length - 1; i >= 0; i--) {
    const it = env.items[i]!
    if (hitItem(it, p)) return { kind: 'item', id: it.id }
  }
  const walls = new Map(wallsOf(env).map((w) => [w.id, w]))
  for (let i = env.openings.length - 1; i >= 0; i--) {
    const o = env.openings[i]!
    const w = walls.get(o.wallId)
    if (w && hitOpening(w, o, p, tol)) return { kind: 'opening', id: o.id }
  }
  for (let i = env.drawings.length - 1; i >= 0; i--) {
    const d = env.drawings[i]!
    if (d.kind === 'text') {
      const b = textBox(d.at, d.text, d.sizeMm)
      if (
        p.x >= b.x - tol &&
        p.x <= b.x + b.w + tol &&
        p.y >= b.y - tol &&
        p.y <= b.y + b.h + tol
      ) {
        return { kind: 'drawing', id: d.id }
      }
    } else if (d.kind === 'dimension' || d.kind === 'chain') {
      const [a, b] = dimensionLine(d)
      if (distanceToSegment(p, a, b) <= tol * 2) return { kind: 'drawing', id: d.id }
    }
  }
  for (let i = env.drawings.length - 1; i >= 0; i--) {
    const d = env.drawings[i]!
    if (d.kind === 'wall' && hitWall(d, p, tol)) return { kind: 'drawing', id: d.id }
  }
  // Área: só pelo rótulo ou pela borda (o miolo fica livre para mover a vista).
  for (let i = env.drawings.length - 1; i >= 0; i--) {
    const d = env.drawings[i]!
    if (d.kind !== 'area') continue
    const c = areaLabelCenter(d)
    const w = Math.max(textBox(c, areaM2Text(d), 2.2).w, textBox(c, d.name.toUpperCase(), 2.6).w)
    const h = 6 * DISPLAY_SCALE
    if (Math.abs(p.x - c.x) <= w / 2 + tol && Math.abs(p.y - c.y) <= h / 2 + tol) {
      return { kind: 'drawing', id: d.id }
    }
    const n = d.points.length
    for (let k = 0; k < n; k++) {
      if (distanceToSegment(p, d.points[k]!, d.points[(k + 1) % n]!) <= tol)
        return { kind: 'drawing', id: d.id }
    }
  }
  return null
}

/** Parte "pegável" que tem prioridade: balão de marcador ou rótulo de área. */
export type Handle = { kind: 'marker'; itemId: string } | { kind: 'area-label'; areaId: string }

export function hitHandle(env: Environment, p: Vec2, tol: number): Handle | null {
  const { labelOf } = computeLegend(env)
  for (let i = env.items.length - 1; i >= 0; i--) {
    const it = env.items[i]!
    if (!it.showMarker || !labelOf.has(it.id)) continue
    const c = markerPosition(it)
    const r = (labelOf.get(it.id)!.startsWith('M') ? 4 : 2.6) * DISPLAY_SCALE
    if (Math.abs(p.x - c.x) <= r + tol && Math.abs(p.y - c.y) <= r + tol)
      return { kind: 'marker', itemId: it.id }
  }
  for (let i = env.drawings.length - 1; i >= 0; i--) {
    const d = env.drawings[i]!
    if (d.kind !== 'area') continue
    const c = areaLabelCenter(d)
    const w = Math.max(textBox(c, areaM2Text(d), 2.2).w, textBox(c, d.name.toUpperCase(), 2.6).w)
    if (Math.abs(p.x - c.x) <= w / 2 + tol && Math.abs(p.y - c.y) <= 3 * DISPLAY_SCALE + tol) {
      return { kind: 'area-label', areaId: d.id }
    }
  }
  return null
}

/** Pontos notáveis para o snap. */
export function snapPoints(env: Environment): Vec2[] {
  const pts: Vec2[] = []
  const walls = new Map(wallsOf(env).map((w) => [w.id, w]))
  for (const d of env.drawings) {
    if (d.kind === 'wall') {
      pts.push(...d.points)
      // Cantos das faces (para cotar e desenhar áreas pelas faces internas).
      const o = wallOutline(d.points, d.thicknessMm, d.closed)
      if (o) pts.push(...o.rings.flat())
    } else if (d.kind === 'dimension') pts.push(d.p1, d.p2)
    else if (d.kind === 'area') pts.push(...d.points)
  }
  for (const o of env.openings) {
    const w = walls.get(o.wallId)
    if (w) pts.push(...openingJambs(w, o))
  }
  for (const it of env.items) pts.push(...itemCorners(it))
  return pts
}

/** Meio dos trechos de parede (eixo e as duas faces), para o snap de ponto médio. */
export function snapMidpoints(env: Environment): Vec2[] {
  const out: Vec2[] = []
  for (const w of wallsOf(env)) {
    const h = w.thicknessMm / 2
    for (const s of wallSegments(w)) {
      const m = add(s.a, scale(s.dir, s.length / 2))
      const n = leftNormal(s.dir)
      out.push(m, add(m, scale(n, h)), add(m, scale(n, -h)))
    }
  }
  return out
}

/** Canto de parede mais próximo (de qualquer parede), dentro da tolerância. */
export function nearestWallVertex(env: Environment, p: Vec2, tol: number, prefer?: string) {
  let best: { wallId: string; index: number; at: Vec2; d: number } | null = null
  for (const w of wallsOf(env)) {
    wallPoints(w).forEach((v, index) => {
      const d = distance(v, p) - (w.id === prefer ? 0.001 : 0)
      if (d <= tol && (!best || d < best.d)) best = { wallId: w.id, index, at: v, d }
    })
  }
  return best as { wallId: string; index: number; at: Vec2; d: number } | null
}

/**
 * Guias ao posicionar uma porta/janela: marca no CENTRO do trecho (laranja quando a peça está
 * centralizada) e cotas provisórias das folgas até as faces internas, do lado `side`.
 */
export function openingGuides(
  w: Wall,
  o: Opening,
  side: 'left' | 'right',
  color: string,
): Entity[] {
  const f = openingFrame(w, o)
  const seg = wallSegments(w).find((x) => x.index === o.segment)
  const c = openingClearances(w, o)
  if (!f || !seg || !c) return []
  const h = f.halfThickness
  const nn = side === 'left' ? f.n : scale(f.n, -1)
  const center = add(seg.a, scale(seg.dir, seg.length / 2))
  const centered = Math.abs(f.offset - seg.length / 2) < 1
  const tick = h + 3 * DISPLAY_SCALE
  const markColor = centered ? '#e0a43a' : color
  const out: Entity[] = [
    {
      kind: 'line',
      a: add(center, scale(f.n, tick)),
      b: add(center, scale(f.n, -tick)),
      style: { color: markColor, weight: centered ? 0.35 : 0.18, lineType: 'dashdot' },
    },
  ]
  // Pontos na face interna (lado do cursor): do canto até o batente, e do batente ao outro canto.
  const onFace = (p: Vec2) => add(p, scale(nn, h))
  const startFace = onFace(add(f.a, scale(f.dir, -c.start)))
  const endFace = onFace(add(f.b, scale(f.dir, c.end)))
  const off = side === 'left' ? 4 : -4
  const style = { color }
  if (c.start > 1)
    out.push({
      kind: 'dimension',
      p1: startFace,
      p2: onFace(f.a),
      orientation: 'aligned',
      offset: off,
      style,
    })
  if (c.end > 1)
    out.push({
      kind: 'dimension',
      p1: onFace(f.b),
      p2: endFace,
      orientation: 'aligned',
      offset: off,
      style,
    })
  return out
}

// --- Seleção por janela -----------------------------------------------------------

/** Contorno usado pela seleção por janela/cruzamento, por tipo de objeto. */
export function pickShape(env: Environment, ref: SelRef): PickShape | null {
  if (ref.kind === 'item') {
    const it = env.items.find((i) => i.id === ref.id)
    return it ? { points: itemCorners(it), closed: true } : null
  }
  if (ref.kind === 'opening') {
    const o = env.openings.find((x) => x.id === ref.id)
    const w = o && wallsOf(env).find((x) => x.id === o.wallId)
    const f = o && w && openingFrame(w, o)
    if (!f) return null
    const h = f.halfThickness
    return {
      points: [
        add(f.a, scale(f.n, h)),
        add(f.b, scale(f.n, h)),
        add(f.b, scale(f.n, -h)),
        add(f.a, scale(f.n, -h)),
      ],
      closed: true,
    }
  }
  const d = env.drawings.find((x) => x.id === ref.id)
  if (!d) return null
  switch (d.kind) {
    case 'wall': {
      const o = wallOutline(d.points, d.thicknessMm, d.closed)
      return o ? { points: o.rings[0]!, closed: true } : null
    }
    case 'area':
      return { points: d.points, closed: true }
    case 'dimension':
    case 'chain': {
      const [a, b] = dimensionLine(d)
      const pts = d.kind === 'dimension' ? [d.p1, d.p2] : d.points
      return { points: [...pts, a, b], closed: false }
    }
    case 'text': {
      const b = textBox(d.at, d.text, d.sizeMm)
      return {
        points: [
          vec(b.x, b.y),
          vec(b.x + b.w, b.y),
          vec(b.x + b.w, b.y + b.h),
          vec(b.x, b.y + b.h),
        ],
        closed: true,
      }
    }
  }
}

export function allRefs(env: Environment): SelRef[] {
  return [
    ...env.items.map((i): SelRef => ({ kind: 'item', id: i.id })),
    ...env.openings.map((o): SelRef => ({ kind: 'opening', id: o.id })),
    ...env.drawings.map((d): SelRef => ({ kind: 'drawing', id: d.id })),
  ]
}

/** Objetos dentro (janela) ou tocados (cruzamento) pelo retângulo. */
export function refsInRect(env: Environment, r: BBox, mode: 'window' | 'crossing'): SelRef[] {
  return allRefs(env).filter((ref) => {
    const sh = pickShape(env, ref)
    return !!sh && shapeInRect(r, sh, mode)
  })
}

/** Rótulo do tipo, para o painel de seleção múltipla. */
export function refKindLabel(env: Environment, ref: SelRef): string {
  if (ref.kind === 'item') return 'Móveis'
  if (ref.kind === 'opening') return 'Portas e janelas'
  const d = env.drawings.find((x) => x.id === ref.id)
  if (!d) return 'Outros'
  return { wall: 'Paredes', dimension: 'Cotas', chain: 'Cotas', text: 'Textos', area: 'Áreas' }[
    d.kind
  ]
}

// --- Medidas ao editar parede -------------------------------------------------------

/**
 * Cotas provisórias enquanto um canto é arrastado (trechos que chegam e saem dele) ou um
 * trecho é empurrado (ele e os vizinhos). Pelo eixo, como na lista de trechos do painel,
 * do lado de FORA do cômodo.
 */
export function wallEditGuides(
  w: Wall,
  focus: { vertex?: number; segment?: number },
  color: string,
): Entity[] {
  const segs = wallSegments(w)
  const n = wallPoints(w).length
  const want = new Set<number>()
  if (focus.vertex !== undefined) {
    want.add((focus.vertex - 1 + n) % n)
    want.add(focus.vertex)
  }
  if (focus.segment !== undefined) {
    want.add((focus.segment - 1 + n) % n)
    want.add(focus.segment)
    want.add((focus.segment + 1) % n)
  }
  // Parede fechada no sentido horário visual: a esquerda aponta para fora.
  const outSign = w.closed && signedArea(wallPoints(w)) < 0 ? -1 : 1
  return segs
    .filter((s) => want.has(s.index))
    .map((s): Entity => ({
      kind: 'dimension',
      p1: s.a,
      p2: s.b,
      orientation: 'aligned',
      offset: outSign * (w.thicknessMm / 2 / DISPLAY_SCALE + 5),
      style: { color },
    }))
}

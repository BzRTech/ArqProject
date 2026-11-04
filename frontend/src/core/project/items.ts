import { getBlock } from '../blocks/catalog'
import { buildSymbol } from '../blocks/symbol'
import type { Entity } from '../drawing/entities'
import { placeEntity, placePoint, type Placement } from '../drawing/transform-entities'
import { containsPoint } from '../geometry/polygon'
import { vec, type Vec2 } from '../geometry/vec'
import { planFinish, shade } from '../joinery/finish'
import { joineryPlanSymbol } from '../joinery/plan-symbol'
import type { RuleProfile } from '../joinery/rules'
import { solveJoinery } from '../joinery/solve'
import type { Item } from './schema'

/** Local (origem no canto) → modelo: centraliza, espelha, gira e leva ao `position`. */
function placement(item: Item): Placement {
  return { translate: item.position, rotationDeg: item.rotationDeg, mirrorX: item.mirrored }
}

const centered = (item: Item) => (p: Vec2) => vec(p.x - item.sizeMm.w / 2, p.y - item.sizeMm.d / 2)

/** Os quatro cantos do item no modelo (atrás-esq, atrás-dir, frente-dir, frente-esq). */
export function itemCorners(item: Item): Vec2[] {
  const { w, d } = item.sizeMm
  const c = centered(item)
  return [vec(0, 0), vec(w, 0), vec(w, d), vec(0, d)].map((p) => placePoint(c(p), placement(item)))
}

export function hitItem(item: Item, p: Vec2): boolean {
  return containsPoint(itemCorners(item), p)
}

/**
 * Entidades do bloco já posicionadas no modelo. Humanizado: a marcenaria com acabamento é
 * pintada com a cor do MDF (e, se madeirado, ganha o veio em tom mais escuro).
 */
export function itemEntities(
  item: Item,
  opts: { humanized?: boolean; rules?: RuleProfile } = {},
): Entity[] {
  const block = getBlock(item.blockId, item.blockVersion)
  const { w, d, h } = item.sizeMm
  // Móvel detalhado: o símbolo sai do detalhamento (módulos, portas e giro), não do catálogo.
  const design = item.joinery?.design
  const local =
    design && opts.rules
      ? joineryPlanSymbol(solveJoinery({ w, d }, design, opts.rules), opts.rules)
      : buildSymbol(block.symbol, { w, d, h })
  const pl = placement(item)
  const shift = { translate: vec(-w / 2, -d / 2), rotationDeg: 0, mirrorX: false }
  const placed = local.map((e) => placeEntity(placeEntity(e, shift), pl))
  const finish = opts.humanized ? planFinish(item.joinery) : undefined
  if (!finish) return placed
  const painted = placed.map((e): Entity =>
    'fill' in e && e.fill ? { ...e, fill: { ...e.fill, color: finish.hex } } : e,
  )
  if (finish.kind !== 'madeirado') return painted
  const grain: Entity = {
    kind: 'hatch',
    boundary: itemCorners(item),
    pattern: {
      kind: 'lines',
      angleDeg: item.rotationDeg + (item.joinery?.grain === 'vertical' ? 90 : 0),
      spacing: 0.9,
    },
    style: { color: shade(finish.hex, 0.78), weight: 0.08 },
  }
  // O veio vai logo depois da primeira peça cheia, por baixo dos contornos internos.
  const k = painted.findIndex((e) => 'fill' in e && !!e.fill)
  return k < 0 ? [...painted, grain] : [...painted.slice(0, k + 1), grain, ...painted.slice(k + 1)]
}

/** Ordem de desenho: tapetes (blocos `underlay`) primeiro, depois o resto, mantendo a ordem. */
export function itemsInDrawOrder<T extends Pick<Item, 'blockId'> & { blockVersion?: number }>(
  items: readonly T[],
): T[] {
  const under = (it: T) => !!getBlock(it.blockId, it.blockVersion).underlay
  return [...items.filter(under), ...items.filter((it) => !under(it))]
}

import { getBlock } from '../blocks/catalog'
import { buildSymbol } from '../blocks/symbol'
import type { Entity } from '../drawing/entities'
import { placeEntity, placePoint, type Placement } from '../drawing/transform-entities'
import { containsPoint } from '../geometry/polygon'
import { vec, type Vec2 } from '../geometry/vec'
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

/** Entidades do bloco já posicionadas no modelo. */
export function itemEntities(item: Item): Entity[] {
  const block = getBlock(item.blockId)
  const { w, d, h } = item.sizeMm
  const local = buildSymbol(block.symbol, { w, d, h })
  const pl = placement(item)
  const shift = { translate: vec(-w / 2, -d / 2), rotationDeg: 0, mirrorX: false }
  return local.map((e) => placeEntity(placeEntity(e, shift), pl))
}

/** Ordem de desenho: tapetes (blocos `underlay`) primeiro, depois o resto, mantendo a ordem. */
export function itemsInDrawOrder<T extends Pick<Item, 'blockId'>>(items: readonly T[]): T[] {
  const under = (it: T) => !!getBlock(it.blockId).underlay
  return [...items.filter(under), ...items.filter((it) => !under(it))]
}

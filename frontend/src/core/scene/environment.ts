import { getBlock } from '../blocks/catalog'
import { itemCorners } from '../project/items'
import type { Environment, Item } from '../project/schema'
import { wallsShape } from '../project/wall-union'
import type { RuleProfile } from '../joinery/rules'
import { joineryBoxes } from './joinery'
import { furnitureBoxes } from './furniture'
import { FURNITURE_HEIGHTS } from './catalog-furniture'
import { defaultDesign } from '../joinery/sheet'
import { JOINERY_TYPE_SEED } from '../library/seed'
import type { JoineryTypeDef } from '../library/schemas'
import type { Scene, SceneGroup } from './model'

export function itemGroup(
  item: Item,
  rules: RuleProfile,
  open: boolean,
  types: readonly JoineryTypeDef[] = JOINERY_TYPE_SEED,
): SceneGroup {
  const block = getBlock(item.blockId, item.blockVersion)
  const height =
    item.sizeMm.h ??
    block.defaultSize.h ??
    FURNITURE_HEIGHTS[item.blockId] ??
    (block.underlay ? 10 : 750)
  const design =
    item.joinery?.design ??
    (block.joinery
      ? defaultDesign(
          item,
          types.find((t) => t.id === block.joineryType),
        )
      : undefined)
  const joineryItem = design
    ? { ...item, joinery: { finishes: {}, grain: 'vertical' as const, ...item.joinery, design } }
    : item
  return {
    id: item.id,
    center: [item.position.x, 0, item.position.y],
    rotationY: (-item.rotationDeg * Math.PI) / 180,
    mirrored: item.mirrored,
    boxes: design ? joineryBoxes(joineryItem, rules, open) : furnitureBoxes(item, height),
  }
}

/** Horizontal wall slices preserve window sills and lintels, including overlapping walls. */
export function environmentScene(
  env: Environment,
  rules: RuleProfile,
  open: boolean,
  types: readonly JoineryTypeDef[] = JOINERY_TYPE_SEED,
): Scene {
  const walls = env.drawings.filter((d) => d.kind === 'wall')
  const levels = [
    ...new Set([
      0,
      env.ceilingHeightMm,
      ...env.openings.flatMap((o) =>
        [o.sillMm, o.sillMm + o.heightMm].map((h) => Math.min(env.ceilingHeightMm, h)),
      ),
    ]),
  ].sort((a, b) => a - b)
  const slabs: Scene['slabs'] = []
  for (let i = 1; i < levels.length; i++) {
    const bottom = levels[i - 1]!
    const top = levels[i]!
    const cuts = env.openings.filter((o) => o.sillMm <= bottom && o.sillMm + o.heightMm >= top)
    for (const rings of wallsShape(walls, cuts))
      slabs.push({ rings, bottom, height: top - bottom, color: '#e8e3da' })
  }
  for (const d of env.drawings) {
    if (d.kind === 'area')
      slabs.push({
        rings: [d.points.map((p) => [p.x, p.y])],
        bottom: -20,
        height: 20,
        color: d.floor?.color ?? '#d8d0c3',
      })
    if (d.kind === 'column') {
      const angle = (d.rotationDeg * Math.PI) / 180
      const points: [number, number][] =
        d.shape === 'circle'
          ? Array.from({ length: 48 }, (_, i) => [
              (Math.cos((i * Math.PI) / 24) * d.widthMm) / 2,
              (Math.sin((i * Math.PI) / 24) * d.widthMm) / 2,
            ])
          : [
              [-d.widthMm / 2, -d.depthMm / 2],
              [d.widthMm / 2, -d.depthMm / 2],
              [d.widthMm / 2, d.depthMm / 2],
              [-d.widthMm / 2, d.depthMm / 2],
            ]
      slabs.push({
        rings: [
          points.map(([x, y]) => [
            d.at.x + x * Math.cos(angle) - y * Math.sin(angle),
            d.at.y + x * Math.sin(angle) + y * Math.cos(angle),
          ]),
        ],
        bottom: 0,
        height: env.ceilingHeightMm,
        color: '#c5bfb5',
      })
    }
  }
  return { groups: env.items.map((it) => itemGroup(it, rules, open, types)), slabs }
}

export function sceneFrame(env: Environment) {
  const points = [
    ...env.drawings.flatMap((d) => ('points' in d ? d.points : d.kind === 'column' ? [d.at] : [])),
    ...env.items.flatMap(itemCorners),
  ]
  const xs = points.map((p) => p.x),
    zs = points.map((p) => p.y)
  const minX = xs.length ? Math.min(...xs) : 0,
    maxX = xs.length ? Math.max(...xs) : 1000
  const minZ = zs.length ? Math.min(...zs) : 0,
    maxZ = zs.length ? Math.max(...zs) : 1000
  return {
    target: [(minX + maxX) / 2, env.ceilingHeightMm / 3, (minZ + maxZ) / 2] as [
      number,
      number,
      number,
    ],
    span: Math.max(maxX - minX, maxZ - minZ, env.ceilingHeightMm),
  }
}

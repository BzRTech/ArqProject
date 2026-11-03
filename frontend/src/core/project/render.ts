import { columnEntities } from './columns'
import type { Entity } from '../drawing/entities'
import { itemEntities, itemsInDrawOrder } from './items'
import { floorEntities } from '../finishes/layout'
import { areaEntities } from './areas'
import { environmentMarkers } from './markers'
import { openingEntities, openingGaps } from './openings'
import type { Drawing, Environment, Opening, Wall } from './schema'
import { wallsShape, wallsShapeEntities } from './wall-union'
import { wallEntities } from './walls'

/**
 * Entidades de um desenho do usuário. `scale` converte afastamentos do modelo em papel.
 * Paredes recebem as esquadrias do ambiente: são recortadas e desenham os símbolos.
 */
export function drawingEntities(
  d: Drawing,
  scale: number,
  openings: readonly Opening[] = [],
): Entity[] {
  switch (d.kind) {
    case 'wall': {
      const own = openings.filter((o) => o.wallId === d.id)
      return [
        ...wallEntities(d, '#000000', openingGaps(d, own)),
        ...own.flatMap((o) => openingEntities(d, o)),
      ]
    }
    case 'area':
      return areaEntities(d, scale)
    case 'chain':
      return [
        {
          kind: 'chain',
          points: d.points,
          orientation: d.orientation,
          offset: d.offsetMm / scale,
          total: d.total,
        },
      ]
    case 'dimension':
      return [
        {
          kind: 'dimension',
          p1: d.p1,
          p2: d.p2,
          orientation: d.orientation,
          offset: d.offsetMm / scale,
        },
      ]
    case 'text':
      return [{ kind: 'text', at: d.at, text: d.text, size: d.sizeMm, vAlign: 'middle' }]
    case 'column':
      return columnEntities(d)
  }
}

export interface EnvironmentRenderOptions {
  scale: number
  /** URL da imagem da planta base (resolvida fora do núcleo). */
  basePlanHref?: string
  /** Modo humanizado: pisos com cor. */
  humanized?: boolean
}

/** Tudo o que o ambiente desenha, na ordem de empilhamento (planta base → itens → paredes → anotações). */
export function environmentEntities(env: Environment, o: EnvironmentRenderOptions): Entity[] {
  const out: Entity[] = []
  const bp = env.basePlan
  if (bp && bp.visible && o.basePlanHref) {
    out.push({
      kind: 'group',
      role: 'planta-base',
      children: [
        {
          kind: 'image',
          x: bp.x,
          y: bp.y,
          width: bp.widthMm,
          height: bp.heightMm,
          href: o.basePlanHref,
          opacity: bp.opacity,
        },
      ],
    })
  }
  // Pisos por baixo de tudo (móveis e paredes cobrem as juntas).
  out.push({
    kind: 'group',
    role: 'pisos',
    children: env.drawings.flatMap((d) =>
      d.kind === 'area' && d.floor ? floorEntities(d.points, d.floor, o.humanized ?? false) : [],
    ),
  })
  out.push({
    kind: 'group',
    role: 'itens',
    children: itemsInDrawOrder(env.items).flatMap((it) =>
      itemEntities(it, { humanized: o.humanized }),
    ),
  })
  const walls = env.drawings.filter((d) => d.kind === 'wall')
  const notes = env.drawings.filter((d) => d.kind !== 'wall')
  // Paredes como UMA figura (união menos vãos) + símbolos das esquadrias.
  const wallList = walls.filter((d): d is Wall => d.kind === 'wall')
  const byId = new Map(wallList.map((w) => [w.id, w]))
  out.push({
    kind: 'group',
    role: 'paredes',
    children: [
      ...wallsShapeEntities(wallsShape(wallList, env.openings)),
      ...env.openings.flatMap((op) => {
        const w = byId.get(op.wallId)
        return w ? openingEntities(w, op) : []
      }),
    ],
  })
  out.push({
    kind: 'group',
    role: 'anotacoes',
    children: notes.flatMap((d) => drawingEntities(d, o.scale)),
  })
  out.push({ kind: 'group', role: 'marcadores', children: environmentMarkers(env, o.scale) })
  return out
}

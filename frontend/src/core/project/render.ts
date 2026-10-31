import type { Entity } from '../drawing/entities'
import { itemEntities } from './items'
import { openingEntities, openingGaps } from './openings'
import type { Drawing, Environment, Opening } from './schema'
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
  }
}

export interface EnvironmentRenderOptions {
  scale: number
  /** URL da imagem da planta base (resolvida fora do núcleo). */
  basePlanHref?: string
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
  out.push({ kind: 'group', role: 'itens', children: env.items.flatMap(itemEntities) })
  const walls = env.drawings.filter((d) => d.kind === 'wall')
  const notes = env.drawings.filter((d) => d.kind !== 'wall')
  out.push({
    kind: 'group',
    role: 'paredes',
    children: walls.flatMap((d) => drawingEntities(d, o.scale, env.openings)),
  })
  out.push({
    kind: 'group',
    role: 'anotacoes',
    children: notes.flatMap((d) => drawingEntities(d, o.scale)),
  })
  return out
}

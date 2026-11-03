import { getBlock } from '../blocks/catalog'
import { entitiesBBox } from '../drawing/bounds'
import type { Entity } from '../drawing/entities'
import { placeEntity } from '../drawing/transform-entities'
import { isEmpty } from '../geometry/bbox'
import { vec } from '../geometry/vec'
import { computeLegend } from '../project/markers'
import type { Environment, Item, JoineryDesign, Project } from '../project/schema'
import { buildPlanSheet, type PlanSheet } from '../sheets/plan-sheet'
import type { RuleProfile } from './rules'
import { solveJoinery, type SolvedJoinery } from './solve'
import { joinerySpecs } from './specs'
import { frontExternalView, frontInternalView, planView } from './views'

/** Escalas da prancha de detalhe (a maior que couber). */
export const DETAIL_SCALES = [10, 15, 20, 25, 50] as const

/** Desenho inicial de um móvel: módulos de ~90 cm, portas, base conforme o tipo. */
export function defaultDesign(item: Pick<Item, 'blockId' | 'sizeMm'>): JoineryDesign {
  const W = item.sizeMm.w
  const H = item.sizeMm.h ?? getBlock(item.blockId).defaultSize.h ?? 700
  const n = Math.max(1, Math.round(W / 900))
  const base = Math.floor(W / n)
  const isRack = item.blockId === 'rack'
  return {
    heightMm: H,
    base: isRack ? { kind: 'suspended', heightMm: 100 } : { kind: 'plinth', heightMm: 100 },
    modules: Array.from({ length: n }, (_, i) => {
      const w = base + (i === n - 1 ? W - base * n : 0)
      return {
        widthMm: w,
        front: w >= 600 ? 'door2' : 'door1',
        shelves: H < 900 ? 1 : 3,
        drawers: 3,
      }
    }),
    handle: isRack ? 'touch' : 'profile',
  }
}

/** O móvel resolvido a partir do item (largura e profundidade da planta). */
export function solveItem(item: Item, rules: RuleProfile): SolvedJoinery | null {
  const design = item.joinery?.design
  return design ? solveJoinery({ w: item.sizeMm.w, d: item.sizeMm.d }, design, rules) : null
}

const move = (es: Entity[], dx: number, dy: number) =>
  es.map((e) => placeEntity(e, { translate: vec(dx, dy), rotationDeg: 0, mirrorX: false }))

/**
 * Prancha de detalhe do móvel: vista frontal (portas), vista interna e planta, empilhadas na
 * mesma escala, com as especificações numeradas na coluna da direita.
 */
export function joinerySheet(
  project: Pick<Project, 'name'>,
  env: Environment,
  item: Item,
  rules: RuleProfile,
  o: { dateText?: string } = {},
): PlanSheet | null {
  const s = solveItem(item, rules)
  if (!s) return null
  const code = computeLegend(env).labelOf.get(item.id) ?? 'M'
  const views: [string, Entity[]][] = [
    ['VISTA FRONTAL', frontExternalView(s)],
    ['VISTA INTERNA (SEM AS FRENTES)', frontInternalView(s)],
    ['PLANTA', planView(s, rules)],
  ]
  return buildPlanSheet({
    title: `${code} · ${item.name}`,
    subtitle: `${env.name.toUpperCase()} — ${project.name.toUpperCase()}`,
    dateText: o.dateText,
    scales: DETAIL_SCALES,
    legendTitle: 'ESPECIFICAÇÕES',
    legend: joinerySpecs(s, item.joinery, rules).map((text, i) => ({
      label: String(i + 1),
      text,
      qty: '',
    })),
    build: (scale) => {
      // Empilha as vistas: cada uma começa 14 mm de papel abaixo da anterior (título no meio).
      const out: Entity[] = []
      let y = 0
      for (const [title, es] of views) {
        const bb = entitiesBBox(es, scale)
        if (isEmpty(bb)) continue
        const dy = y - bb.minY
        out.push(...move(es, 0, dy))
        const bottom = bb.maxY + dy
        out.push({
          kind: 'text',
          at: vec(s.W / 2, bottom + 5 * scale),
          text: `${title} · ESC. 1:${scale}`,
          size: 2.4,
          anchor: 'middle',
          vAlign: 'middle',
          weight: 'bold',
        })
        y = bottom + 14 * scale
      }
      return out
    },
  })
}

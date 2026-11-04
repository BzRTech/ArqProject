import { getBlock } from '../blocks/catalog'
import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import { vec } from '../geometry/vec'
import type { Environment, Item, ItemUnit } from './schema'

/**
 * Marcadores e legenda. Itens IGUAIS (mesmo bloco, nome e medidas) dividem o número e
 * somam a quantidade. Marcenaria usa código próprio (M01, M02…); o resto, 1, 2, 3…
 */

export interface LegendRow {
  key: string
  label: string
  name: string
  qty: number
  unit: ItemUnit
  itemIds: string[]
  marcenaria: boolean
  existing: boolean
  /** Preço unitário, se todos os itens do grupo tiverem o mesmo. */
  unitPriceCents?: number
  /** Soma de qty × preço dos itens com preço (existentes não entram). */
  totalCents: number
}

export interface Legend {
  rows: LegendRow[]
  /** Rótulo do marcador por id de item (só itens que entram na legenda). */
  labelOf: Map<string, string>
}

export const legendKey = (it: Item): string =>
  `${it.blockId}|${it.name.trim().toLowerCase()}|${it.sizeMm.w}x${it.sizeMm.d}|${it.existing ? 'e' : 'n'}`

/** Total do item em centavos (existente ou sem preço = 0). */
export function itemTotalCents(it: Item): number {
  if (it.existing || it.unitPriceCents === undefined) return 0
  return Math.round(it.qty * it.unitPriceCents)
}

export function computeLegend(env: Pick<Environment, 'items'>): Legend {
  const rows: LegendRow[] = []
  const byKey = new Map<string, LegendRow>()
  const labelOf = new Map<string, string>()
  let n = 0
  let m = 0
  for (const it of env.items) {
    if (!it.inLegend) continue
    const key = legendKey(it)
    let row = byKey.get(key)
    if (!row) {
      const marcenaria = getBlock(it.blockId, it.blockVersion).discipline === 'marcenaria'
      const label = marcenaria ? `M${String(++m).padStart(2, '0')}` : String(++n)
      row = {
        key,
        label,
        name: it.name,
        qty: 0,
        unit: it.unit,
        itemIds: [],
        marcenaria,
        existing: it.existing,
        unitPriceCents: it.unitPriceCents,
        totalCents: 0,
      }
      byKey.set(key, row)
      rows.push(row)
    } else if (row.unitPriceCents !== it.unitPriceCents) {
      row.unitPriceCents = undefined
    }
    row.qty += it.qty
    row.itemIds.push(it.id)
    row.totalCents += itemTotalCents(it)
    labelOf.set(it.id, row.label)
  }
  return { rows, labelOf }
}

export interface BudgetSummary {
  totalCents: number
  itemCount: number
  approvedCount: number
  /** Itens novos sem preço informado. */
  missingPrice: number
}

export function budgetSummary(items: readonly Item[]): BudgetSummary {
  return {
    totalCents: items.reduce((s, it) => s + itemTotalCents(it), 0),
    itemCount: items.length,
    approvedCount: items.filter((it) => it.approved).length,
    missingPrice: items.filter((it) => !it.existing && it.unitPriceCents === undefined).length,
  }
}

/** Balão do marcador no centro do item. Tamanhos em mm de papel (convertidos por `scale`). */
export const markerPosition = (item: Item) =>
  vec(item.position.x + (item.markerOffset?.x ?? 0), item.position.y + (item.markerOffset?.y ?? 0))

export function markerEntities(item: Item, label: string, scale: number): Entity[] {
  const c = markerPosition(item)
  const text: Entity = {
    kind: 'text',
    at: c,
    text: label,
    size: 2,
    anchor: 'middle',
    vAlign: 'middle',
    weight: 'bold',
  }
  const style = { weight: PEN.fine }
  const fill = { color: '#ffffff' }
  if (label.startsWith('M')) {
    // Marcenaria: etiqueta retangular (mais larga para "M01").
    const w = 8 * scale
    const h = 4.2 * scale
    return [
      { kind: 'rect', x: c.x - w / 2, y: c.y - h / 2, width: w, height: h, style, fill },
      text,
    ]
  }
  return [{ kind: 'circle', center: vec(c.x, c.y), radius: 2.6 * scale, style, fill }, text]
}

/** Marcadores de todos os itens do ambiente que mostram balão. */
export function environmentMarkers(env: Pick<Environment, 'items'>, scale: number): Entity[] {
  const { labelOf } = computeLegend(env)
  return env.items.flatMap((it) => {
    const label = labelOf.get(it.id)
    return label && it.showMarker ? markerEntities(it, label, scale) : []
  })
}

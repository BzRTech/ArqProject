import { wallsOf } from '../project/walls-of'
import type { Environment } from '../project/schema'
import { floorQuantities } from './quantities'

/** Linha de revestimento para legenda/orçamento: um piso (P1…) ou o rodapé dele. */
export interface FloorRow {
  key: string
  label: string
  name: string
  /** Quantidade a comprar: m² (piso, já com perda) ou m (rodapé). */
  qty: number
  unit: 'm²' | 'm'
  unitPriceCents?: number
  totalCents: number
  areaIds: string[]
}

/**
 * Pisos iguais (mesmo revestimento e peça) em várias áreas viram uma linha (P1, P2…),
 * somando os m² com perda; cada piso com rodapé ganha uma linha de rodapé (m).
 */
export function floorRows(env: Pick<Environment, 'drawings' | 'openings'>): FloorRow[] {
  const walls = wallsOf(env)
  const rows: FloorRow[] = []
  const byKey = new Map<string, FloorRow>()
  const skirtByKey = new Map<string, FloorRow>()
  let n = 0
  for (const d of env.drawings) {
    if (d.kind !== 'area' || !d.floor) continue
    const f = d.floor
    const q = floorQuantities(d.points, f, walls, env.openings)
    const key = `${f.finishId}|${f.name}|${f.pieceAMm}x${f.pieceBMm}|${f.priceCentsPerM2 ?? ''}`
    let row = byKey.get(key)
    if (!row) {
      row = {
        key,
        label: `P${++n}`,
        name: f.name,
        qty: 0,
        unit: 'm²',
        unitPriceCents: f.priceCentsPerM2,
        totalCents: 0,
        areaIds: [],
      }
      byKey.set(key, row)
      rows.push(row)
    }
    row.qty = Math.round((row.qty + q.buyM2) * 100) / 100
    row.totalCents += q.floorTotalCents
    row.areaIds.push(d.id)
    if (f.skirting) {
      const sk = `${key}|rodape|${f.skirting.heightMm}|${f.skirting.priceCentsPerM ?? ''}`
      let srow = skirtByKey.get(sk)
      if (!srow) {
        srow = {
          key: sk,
          label: row.label,
          name: `Rodapé ${Math.round(f.skirting.heightMm / 10)} cm — ${f.name}`,
          qty: 0,
          unit: 'm',
          unitPriceCents: f.skirting.priceCentsPerM,
          totalCents: 0,
          areaIds: [],
        }
        skirtByKey.set(sk, srow)
      }
      srow.qty = Math.round((srow.qty + q.skirtingM) * 100) / 100
      srow.totalCents += q.skirtingTotalCents
      srow.areaIds.push(d.id)
    }
  }
  return [...rows, ...skirtByKey.values()]
}

export const floorTotalCents = (env: Pick<Environment, 'drawings' | 'openings'>) =>
  floorRows(env).reduce((s, r) => s + r.totalCents, 0)

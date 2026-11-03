import { z } from 'zod'
import { getBlock } from '../blocks/catalog'
import { floorRows } from '../finishes/budget'
import { joineryNotes, joinerySummary } from '../joinery/finish'
import { computeLegend } from './markers'
import type { Project } from './schema'

/**
 * Relatório do projeto para o MEMORIAL: as mesmas linhas da legenda e do orçamento (marcador,
 * item, quantidade, especificação, preço), por ambiente. É calculado AQUI (o backend não
 * calcula: quantidade de piso com perda, rodapé sem as portas e numeração dos marcadores são
 * regras do núcleo) e enviado junto com cada save; o servidor só guarda, indexa e imprime.
 */
const cents = z.number().int().nonnegative()

export const ReportLineSchema = z.object({
  label: z.string(),
  discipline: z.string(),
  name: z.string(),
  /** Especificação: acabamento da marcenaria, observações. */
  detail: z.string().optional(),
  qty: z.number().nonnegative(),
  unit: z.string(),
  sizeMm: z
    .object({ w: z.number().int(), d: z.number().int(), h: z.number().int().optional() })
    .optional(),
  brandModel: z.string().optional(),
  supplier: z.string().optional(),
  unitPriceCents: cents.optional(),
  totalCents: cents,
  existing: z.boolean(),
  approved: z.boolean(),
  itemIds: z.array(z.string()),
})

export const ReportEnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  lines: z.array(ReportLineSchema),
  totalCents: cents,
})

export const ProjectReportSchema = z.object({
  version: z.literal(1),
  environments: z.array(ReportEnvironmentSchema),
  totalCents: cents,
})

export type ReportLine = z.infer<typeof ReportLineSchema>
export type ProjectReport = z.infer<typeof ProjectReportSchema>

/** Um valor comum a todos os itens do grupo (senão nenhum). */
function common<T>(values: (T | undefined)[]): T | undefined {
  const first = values[0]
  return values.every((v) => v === first) ? first : undefined
}

export function projectReport(project: Project): ProjectReport {
  const environments = project.environments.map((env) => {
    const lines: ReportLine[] = []
    for (const r of computeLegend(env).rows) {
      const items = r.itemIds.map((id) => env.items.find((it) => it.id === id)!)
      const first = items[0]!
      const detail = [joinerySummary(first.joinery), first.notes, ...joineryNotes(first.joinery)]
        .filter(Boolean)
        .join(' · ')
      const brandModel = common(items.map((i) => i.brandModel || undefined))
      const supplier = common(items.map((i) => i.supplier || undefined))
      lines.push({
        label: r.label,
        discipline: getBlock(first.blockId, first.blockVersion).discipline,
        name: r.name,
        ...(detail ? { detail } : {}),
        qty: r.qty,
        unit: r.unit,
        sizeMm: { ...first.sizeMm },
        ...(brandModel ? { brandModel } : {}),
        ...(supplier ? { supplier } : {}),
        ...(r.unitPriceCents !== undefined ? { unitPriceCents: r.unitPriceCents } : {}),
        totalCents: r.totalCents,
        existing: r.existing,
        approved: items.every((i) => i.approved),
        itemIds: r.itemIds,
      })
    }
    for (const f of floorRows(env))
      lines.push({
        label: f.label,
        discipline: 'revestimentos',
        name: f.name,
        detail: f.unit === 'm²' ? 'Quantidade já com a perda.' : 'Descontadas as portas.',
        qty: f.qty,
        unit: f.unit,
        ...(f.unitPriceCents !== undefined ? { unitPriceCents: f.unitPriceCents } : {}),
        totalCents: f.totalCents,
        existing: false,
        approved: false,
        itemIds: [],
      })
    return {
      id: env.id,
      name: env.name,
      lines,
      totalCents: lines.reduce((s, l) => s + l.totalCents, 0),
    }
  })
  return {
    version: 1,
    environments,
    totalCents: environments.reduce((s, e) => s + e.totalCents, 0),
  }
}

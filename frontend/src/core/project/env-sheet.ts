import { floorRows } from '../finishes/budget'
import { joinerySummary } from '../joinery/finish'
import type { RuleProfile } from '../joinery/rules'
import { buildPlanSheet, type LegendLine, type PlanSheet } from '../sheets/plan-sheet'
import { formatQty } from '../units'
import { computeLegend } from './markers'
import { environmentEntities } from './render'
import type { Environment, Project } from './schema'

/** Linhas da legenda do ambiente: itens (marcenaria com o acabamento embaixo) e revestimentos. */
export function environmentLegend(env: Environment): LegendLine[] {
  return [
    ...computeLegend(env).rows.map((r) => {
      const first = env.items.find((it) => it.id === r.itemIds[0])
      const detail = joinerySummary(first?.joinery)
      return {
        label: r.label,
        text: r.existing ? `${r.name} (existente)` : r.name,
        qty: `${formatQty(r.qty)} ${r.unit}`,
        ...(detail ? { detail } : {}),
      }
    }),
    ...floorRows(env).map((r) => ({
      label: r.label,
      text: r.name,
      qty: `${formatQty(r.qty)} ${r.unit}`,
    })),
  ]
}

/** Prancha A3 do ambiente — a MESMA para a prévia na tela e para o PDF. */
export function environmentSheet(
  project: Pick<Project, 'name'>,
  env: Environment,
  o: { dateText?: string; basePlanHref?: string; humanized?: boolean; rules?: RuleProfile } = {},
): PlanSheet {
  return buildPlanSheet({
    title: env.name,
    subtitle: project.name.toUpperCase(),
    dateText: o.dateText,
    legend: environmentLegend(env),
    build: (scale) =>
      environmentEntities(env, {
        scale,
        basePlanHref: o.basePlanHref,
        humanized: o.humanized,
        rules: o.rules,
      }),
  })
}

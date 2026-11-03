import { floorRows } from '@/core/finishes/budget'
import { joineryNotes, joinerySummary } from '@/core/joinery/finish'
import { computeLegend, itemTotalCents } from '@/core/project/markers'
import type { Project } from '@/core/project/schema'
import { formatCm, formatDecimal } from '@/core/units'

const money = (cents: number | undefined) =>
  cents === undefined ? '' : formatDecimal(cents / 100, 2)
const qty = (q: number) => (Number.isInteger(q) ? String(q) : formatDecimal(q, 2))

function cell(v: string): string {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * Lista de itens do projeto para planilha (Excel/Google Sheets em pt-BR): separador ";",
 * vírgula decimal e BOM UTF-8 para acentos.
 */
export function projectItemsCsv(project: Project): string {
  const header = [
    'Ambiente',
    'Marcador',
    'Item',
    'Qtd',
    'Unid',
    'L (cm)',
    'P (cm)',
    'Marca/modelo',
    'Fornecedor',
    'Preço unit. (R$)',
    'Total (R$)',
    'Existente',
    'Aprovado',
    'Observação',
    'Acabamento (marcenaria)',
  ]
  const lines = [header]
  let total = 0
  for (const env of project.environments) {
    const { labelOf } = computeLegend(env)
    for (const it of env.items) {
      const t = itemTotalCents(it)
      total += t
      lines.push([
        env.name,
        labelOf.get(it.id) ?? '',
        it.name,
        qty(it.qty),
        it.unit,
        formatCm(it.sizeMm.w),
        formatCm(it.sizeMm.d),
        it.brandModel ?? '',
        it.supplier ?? '',
        money(it.unitPriceCents),
        it.existing ? '' : money(it.unitPriceCents === undefined ? undefined : t),
        it.existing ? 'sim' : 'não',
        it.approved ? 'sim' : 'não',
        [it.notes, ...joineryNotes(it.joinery)].filter(Boolean).join(' · '),
        joinerySummary(it.joinery),
      ])
    }
    for (const r of floorRows(env)) {
      total += r.totalCents
      lines.push([
        env.name,
        r.label,
        r.name,
        qty(r.qty),
        r.unit,
        '',
        '',
        '',
        '',
        money(r.unitPriceCents),
        money(r.unitPriceCents === undefined ? undefined : r.totalCents),
        'não',
        'não',
        r.unit === 'm²' ? 'quantidade já com perda' : 'descontadas as portas',
        '',
      ])
    }
  }
  lines.push(['', '', 'TOTAL', '', '', '', '', '', '', '', money(total), '', '', '', ''])
  return '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n') + '\r\n'
}

export function downloadProjectCsv(project: Project) {
  const blob = new Blob([projectItemsCsv(project)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug =
    project.name
      .normalize('NFD')
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'projeto'
  a.href = url
  a.download = `${slug}-itens.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

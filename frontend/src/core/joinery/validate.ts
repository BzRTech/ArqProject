import { formatCm } from '../units'
import type { RuleProfile } from './rules'
import type { SolvedJoinery } from './solve'

export interface JoineryWarning {
  code: 'min-clear' | 'door-widths' | 'splice'
  level: 'error' | 'warning' | 'info'
  text: string
  /** Ação que resolve (o painel mostra um botão). */
  action?: 'equalize-doors'
}

/** Conferência técnica do móvel resolvido. */
export function validateJoinery(s: SolvedJoinery, rules: RuleProfile): JoineryWarning[] {
  const out: JoineryWarning[] = []
  for (const m of s.modules)
    if (m.clearWidth < rules.minClearWidthMm)
      out.push({
        code: 'min-clear',
        level: 'error',
        text: `${m.label} com vão de ${formatCm(m.clearWidth)} cm: não dá para montar (mínimo ${formatCm(rules.minClearWidthMm)} cm).`,
      })
  const widths = s.doors.map((d) => d.w)
  if (widths.length && Math.max(...widths) - Math.min(...widths) > rules.doorWidthToleranceMm) {
    const groups = new Map<number, number>()
    for (const w of widths) groups.set(w, (groups.get(w) ?? 0) + 1)
    const list = [...groups]
      .sort((a, b) => b[0] - a[0])
      .map(([w, n]) => `${n} × ${formatCm(w)}`)
      .join(' · ')
    out.push({
      code: 'door-widths',
      level: 'warning',
      text: `Portas com larguras diferentes: ${list} cm.`,
      action: 'equalize-doors',
    })
  }
  const spliced = s.panels.filter((p) => p.splitsMm.length)
  if (spliced.length)
    out.push({
      code: 'splice',
      level: 'info',
      text: `Emenda em ${spliced.map((p) => p.name.toLowerCase()).join(', ')}: passam da chapa de ${formatCm(rules.sheet.lengthMm)} cm.`,
    })
  return out
}

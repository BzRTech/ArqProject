import type { Joinery, JoineryFinish } from '../project/schema'
import { formatCm } from '../units'
import { joineryNotes } from './finish'
import { hingesFor, type RuleProfile } from './rules'
import type { SolvedJoinery } from './solve'

const HANDLE_TEXT = {
  touch: 'Abertura por fecho toque, sem puxador',
  bar: 'Puxador barra',
  profile: 'Puxador perfil de alumínio',
  cava: 'Puxador cava embutida',
  knob: 'Puxador botão',
} as const

const finishText = (f: JoineryFinish | undefined) => (f ? f.name : 'acabamento a definir')

/**
 * Especificações numeradas do móvel (saem na prancha de detalhe). Tudo calculado; as
 * observações do usuário entram no fim, uma por linha.
 */
export function joinerySpecs(
  s: SolvedJoinery,
  j: Joinery | undefined,
  rules: RuleProfile,
): string[] {
  const f = j?.finishes ?? {}
  const base =
    s.base.kind === 'suspended'
      ? `, suspenso ${formatCm(s.base.heightMm)} cm do piso`
      : s.base.kind === 'plinth'
        ? `, sobre rodapé de ${formatCm(s.base.heightMm)} cm`
        : ', apoiado no piso'
  const out = [
    `Medidas: ${formatCm(s.W)} × ${formatCm(s.D)} × ${formatCm(s.H)} cm (L × P × A)${base}.`,
    `Corpo em MDF ${s.t} mm — ${finishText(f.corpo)}.`,
    `Laterais e tampo em MDF ${s.t} mm — ${finishText(f.tamponamento)}.`,
  ]
  const fronts = s.doors.length + s.drawers.length
  if (fronts) {
    const grain = f.frentes?.kind === 'madeirado' ? `, veio ${j?.grain ?? 'vertical'}` : ''
    out.push(
      `Frentes em MDF ${rules.front.thicknessMm} mm sobrepostas, folga de ${rules.front.gapMm} mm — ${finishText(f.frentes)}${grain}.`,
    )
  }
  out.push(
    `Fundo em MDF ${rules.back.thicknessMm} mm, recuado ${formatCm(rules.back.recessMm)} cm.`,
  )
  out.push(
    `${s.modules.length} módulo(s), eixo a eixo: ${s.modules.map((m) => `${m.label} ${formatCm(m.x1 - m.x0)}`).join(' · ')} cm.`,
  )
  if (s.doors.length) {
    const perDoor = hingesFor(s.doors[0]!.h, rules)
    out.push(
      `${s.doors.length} porta(s) de abrir com ${s.hinges} dobradiças (${perDoor} por porta).`,
    )
  }
  if (s.drawers.length) out.push(`${s.drawers.length} gaveta(s) com corrediça telescópica.`)
  if (fronts) {
    const h = j?.design?.handleItem
    const name = h
      ? `Puxador: ${h.name}${h.finish ? `, ${h.finish}` : ''}${h.code ? ` (cód. ${h.code})` : ''}`
      : HANDLE_TEXT[s.handle]
    out.push(`${name}${s.handle === 'touch' ? ` (${s.touchLatches} un)` : ''}.`)
  }
  const shelves = s.modules.reduce((a, m) => a + m.shelvesZ.length, 0)
  if (shelves)
    out.push(
      `${shelves} prateleira(s) em MDF ${s.t} mm, recuadas ${formatCm(rules.shelfFrontSetbackMm)} cm da frente.`,
    )
  if (s.splicesX.length)
    out.push(
      `Tampo, base e fundo emendados sobre a divisória a ${s.splicesX.map((x) => formatCm(x)).join(' e ')} cm da esquerda.`,
    )
  out.push(...joineryNotes(j))
  out.push('Medidas em centímetros. Conferir no local antes de produzir.')
  return out
}

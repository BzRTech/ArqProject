import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import { vec } from '../geometry/vec'
import type { RuleProfile } from './rules'
import type { SolvedJoinery } from './solve'

const WHITE = { color: '#ffffff' }

/**
 * Símbolo do móvel DETALHADO na planta, em coordenadas locais do item (fundo em y = 0, frente
 * em y = P): corpo, divisórias nos eixos dos módulos, frentes sobrepostas e o giro de cada porta.
 * Assim a planta mostra exatamente o que está no detalhamento.
 */
export function joineryPlanSymbol(s: SolvedJoinery, rules: RuleProfile): Entity[] {
  const ft = rules.front.thicknessMm
  const D = s.D
  const out: Entity[] = [
    { kind: 'rect', x: 0, y: 0, width: s.W, height: D, style: { weight: PEN.medium }, fill: WHITE },
  ]
  for (const m of s.modules.slice(0, -1))
    out.push({ kind: 'line', a: vec(m.x1, 0), b: vec(m.x1, D), style: { weight: PEN.fine } })
  for (const d of s.doors) {
    out.push({
      kind: 'rect',
      x: d.x,
      y: D,
      width: d.w,
      height: ft,
      style: { weight: PEN.fine },
      fill: WHITE,
    })
    const hingeX = d.hinge === 'left' ? d.x : d.x + d.w
    const hinge = vec(hingeX, D + ft)
    const dashed = { weight: PEN.extraFine, lineType: 'dashed' as const }
    out.push(
      { kind: 'line', a: hinge, b: vec(hingeX, D + ft + d.w), style: dashed },
      {
        kind: 'arc',
        center: hinge,
        radius: d.w,
        startDeg: d.hinge === 'left' ? 0 : 180,
        sweepDeg: d.hinge === 'left' ? 90 : -90,
        style: dashed,
      },
    )
  }
  for (const d of s.drawers)
    out.push({
      kind: 'rect',
      x: d.x,
      y: D,
      width: d.w,
      height: ft,
      style: { weight: PEN.fine },
      fill: WHITE,
    })
  return out
}

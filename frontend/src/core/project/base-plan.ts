import { distance, type Vec2 } from '../geometry/vec'
import type { BasePlan } from './schema'

/**
 * Calibra a planta base: o usuário marcou p1 e p2 sobre a imagem e informou a distância
 * real. Reescala a imagem mantendo p1 fixo.
 */
export function calibrateBasePlan(plan: BasePlan, p1: Vec2, p2: Vec2, realMm: number): BasePlan {
  const measured = distance(p1, p2)
  if (measured <= 0 || realMm <= 0) throw new Error('Medida inválida para calibrar')
  const k = realMm / measured
  return {
    ...plan,
    x: p1.x + (plan.x - p1.x) * k,
    y: p1.y + (plan.y - p1.y) * k,
    widthMm: plan.widthMm * k,
    heightMm: plan.heightMm * k,
    calibrated: true,
  }
}

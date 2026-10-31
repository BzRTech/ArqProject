import { height, isEmpty, width, type BBox } from '../geometry/bbox'

/** Escalas usuais de arquitetura de interiores (denominadores). */
export const STANDARD_SCALES = [10, 20, 25, 50, 75, 100, 125, 200] as const

/** Maior escala (menor denominador) em que o desenho cabe na área de papel dada. */
export function chooseScale(
  model: BBox,
  area: { width: number; height: number },
  scales: readonly number[] = STANDARD_SCALES,
): number {
  if (isEmpty(model)) return 50
  const w = Math.max(width(model), 1)
  const h = Math.max(height(model), 1)
  for (const s of [...scales].sort((a, b) => a - b)) {
    if (w / s <= area.width && h / s <= area.height) return s
  }
  return Math.max(...scales)
}

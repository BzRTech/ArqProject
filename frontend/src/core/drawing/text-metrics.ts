/**
 * Métricas APROXIMADAS da fonte das pranchas (Roboto), em frações do corpo (em).
 * O núcleo não tem acesso a fontes; isso basta para decidir se um texto de cota
 * cabe no vão e para alinhar verticalmente. Valores das tabelas hmtx/OS2 da Roboto.
 */
export const CAP_HEIGHT = 0.711
export const DESCENT = 0.212

const ADVANCE: Record<string, number> = {
  ',': 0.197,
  '.': 0.264,
  ' ': 0.248,
  '-': 0.276,
  '/': 0.413,
  '×': 0.535,
  '²': 0.37,
  '(': 0.342,
  ')': 0.348,
}

export function charAdvance(ch: string): number {
  if (/[0-9]/.test(ch)) return 0.562
  const known = ADVANCE[ch]
  if (known !== undefined) return known
  if (/[A-ZÀ-Ý]/.test(ch)) return ch === 'M' || ch === 'W' ? 0.86 : 0.65
  if (/[a-zà-ÿ]/.test(ch))
    return ch === 'm' || ch === 'w' ? 0.84 : ch === 'i' || ch === 'l' ? 0.24 : 0.53
  return 0.6
}

/** Largura estimada do texto em mm de papel, para um corpo `size`. */
export function textWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) w += charAdvance(ch)
  return w * size
}

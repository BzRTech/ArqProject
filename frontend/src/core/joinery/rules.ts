/**
 * Regras de marcenaria (`RuleProfile`). Na Fase 3 vêm do BANCO (perfil global + perfil do
 * escritório); o motor sempre as recebe como parâmetro, nunca as lê de constantes espalhadas.
 * `DEFAULT_RULE_PROFILE` é o seed global da seção 4.6 do PLANO — validar com um marceneiro.
 */
export interface HingeRule {
  /** Até esta altura de porta (mm); null = acima de todas as anteriores. */
  maxDoorHeightMm: number | null
  count: number
}

export interface RuleProfile {
  id: string
  name: string
  version: number
  /** Chapa de MDF: peça maior que isso leva emenda. */
  sheet: { lengthMm: number; widthMm: number }
  /** Corpo: laterais, base, tampo, divisórias e prateleiras. */
  bodyThicknessMm: number
  back: { thicknessMm: number; recessMm: number }
  /** Porta/frente sobreposta: espessura e folga entre frentes. */
  front: { thicknessMm: number; gapMm: number }
  /** Recuo da prateleira em relação à frente do corpo. */
  shelfFrontSetbackMm: number
  hinges: HingeRule[]
  /** Vão livre mínimo de um módulo (abaixo disso não dá para montar). */
  minClearWidthMm: number
  /** Diferença máxima aceitável entre larguras de portas. */
  doorWidthToleranceMm: number
}

export const DEFAULT_RULE_PROFILE: RuleProfile = {
  id: 'padrao',
  name: 'Padrão',
  version: 1,
  sheet: { lengthMm: 2750, widthMm: 1840 },
  bodyThicknessMm: 18,
  back: { thicknessMm: 6, recessMm: 10 },
  front: { thicknessMm: 18, gapMm: 3 },
  shelfFrontSetbackMm: 20,
  hinges: [
    { maxDoorHeightMm: 900, count: 2 },
    { maxDoorHeightMm: 1600, count: 3 },
    { maxDoorHeightMm: null, count: 4 },
  ],
  minClearWidthMm: 100,
  doorWidthToleranceMm: 2,
}

/** Dobradiças por porta, pela altura da porta. */
export function hingesFor(doorHeightMm: number, rules: RuleProfile): number {
  const r = rules.hinges.find(
    (h) => h.maxDoorHeightMm === null || doorHeightMm <= h.maxDoorHeightMm,
  )
  return r?.count ?? rules.hinges[rules.hinges.length - 1]!.count
}

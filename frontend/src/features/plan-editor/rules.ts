import { DEFAULT_RULE_PROFILE, type RuleProfile } from '@/core/joinery/rules'

/**
 * Perfil de regras de marcenaria em uso. Hoje é o perfil global padrão (seed do PLANO 4.6);
 * na Fase 3 vem do banco (`RuleProfile` do escritório). Componentes pegam daqui, nunca de
 * constantes próprias.
 */
export function useRuleProfile(): RuleProfile {
  return DEFAULT_RULE_PROFILE
}

export const currentRuleProfile = (): RuleProfile => DEFAULT_RULE_PROFILE

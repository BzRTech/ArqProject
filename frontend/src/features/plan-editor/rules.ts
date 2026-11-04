import type { RuleProfile } from '@/core/joinery/rules'
import { useEditor } from './store'

/**
 * Perfil de regras de marcenaria em uso = a CÓPIA guardada no projeto
 * (`librarySnapshots.rules`, vinda do banco do escritório). Componentes pegam daqui, nunca de
 * constantes próprias. Mudanças no banco chegam pelo aviso "Atualizar do banco".
 */
export function useRuleProfile(): RuleProfile {
  return useEditor((s) => s.project.librarySnapshots.rules)
}

export const currentRuleProfile = (): RuleProfile =>
  useEditor.getState().project.librarySnapshots.rules

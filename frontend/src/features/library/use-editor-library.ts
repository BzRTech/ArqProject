import { useEffect } from 'react'
import { useMe } from '@/api/auth'
import type { ProjectSource } from '@/features/plan-editor/hooks'
import { useLibrary } from './library-store'

/**
 * Bancos do editor: projeto do servidor usa o banco do escritório ativo (bundle com cache);
 * rascunho local usa os embutidos (funciona sem servidor).
 */
export function useEditorLibrary(source: ProjectSource) {
  const orgId = useMe().data?.organization?.id ?? null
  const server = source.kind === 'server'
  useEffect(() => {
    const lib = useLibrary.getState()
    if (server && orgId !== null) void lib.load(orgId)
    else if (!server) lib.setBuiltin()
  }, [server, orgId])
}

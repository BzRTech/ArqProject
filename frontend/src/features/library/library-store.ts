import { create } from 'zustand'
import { fetchBundle } from '@/api/library'
import { setCatalog } from '@/core/blocks/catalog'
import type { BlockDef } from '@/core/blocks/types'
import { BUILTIN_LIBRARY, parseLibrary, type Library } from '@/core/library/bundle'

/**
 * Bancos em uso no editor. Projeto do servidor: bundle do escritório (com cache no navegador).
 * Rascunho local: os embutidos. Ao trocar, o catálogo do núcleo (`setCatalog`) acompanha.
 */
export type LibrarySource = 'embutido' | 'carregando' | 'escritorio' | 'cache'

interface LibraryState {
  source: LibrarySource
  orgId: number | null
  lib: Library
  rejected: string[]
  /** Carrega (ou recarrega) o banco do escritório. */
  load: (orgId: number) => Promise<void>
  setBuiltin: () => void
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  source: 'embutido',
  orgId: null,
  lib: BUILTIN_LIBRARY,
  rejected: [],
  load: async (orgId) => {
    if (get().orgId !== orgId) set({ source: 'carregando', orgId })
    const got = await fetchBundle(orgId)
    if (get().orgId !== orgId) return // trocou de escritório no meio
    if (!got) {
      setCatalog(null)
      set({ source: 'embutido', lib: BUILTIN_LIBRARY, rejected: [] })
      return
    }
    const { library, rejected } = parseLibrary(got.kinds)
    if (rejected.length) console.warn('Entradas do banco ignoradas:', rejected)
    setCatalog(library.items as BlockDef[])
    set({ source: got.fromCache ? 'cache' : 'escritorio', lib: library, rejected })
  },
  setBuiltin: () => {
    setCatalog(null)
    set({ source: 'embutido', orgId: null, lib: BUILTIN_LIBRARY, rejected: [] })
  },
}))

/** Recarrega o banco do escritório em uso (depois de editar na tela "Banco do escritório"). */
export function reloadLibrary() {
  const { orgId, load } = useLibrary.getState()
  if (orgId !== null) void load(orgId)
}

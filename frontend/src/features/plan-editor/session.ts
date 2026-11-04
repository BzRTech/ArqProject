import { create } from 'zustand'

/** Projeto aberto no editor (servidor) e como forçar o save — para o memorial. */
export const useEditorSession = create<{
  projectId: string | null
  /** Grava agora o que estiver pendente (o memorial usa o relatório do último save). */
  flush: () => Promise<void>
}>()(() => ({ projectId: null, flush: async () => undefined }))

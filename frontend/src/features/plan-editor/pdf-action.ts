import { create } from 'zustand'
import { exportProjectPdf, type SheetRef } from './export-pdf'
import { useEditor } from './store'
import { useUnits } from './units-pref'

interface PdfState {
  busy: boolean
  toast: { text: string; error?: boolean } | null
  /** Gera o PDF (todas as pranchas, ou só `only`) e avisa no toast. */
  run: (only?: SheetRef) => Promise<void>
  dismiss: () => void
  /** Aviso avulso no mesmo toast (ex.: erro ao importar a planta). */
  notify: (text: string, error?: boolean) => void
}

/** Baixar PDF: usado pela barra superior, pelo passo a passo e pela aba Pranchas. */
export const usePdf = create<PdfState>()((set) => ({
  busy: false,
  toast: null,
  dismiss: () => set({ toast: null }),
  notify: (text, error) => set({ toast: { text, error } }),
  run: async (only) => {
    set({ busy: true, toast: null })
    try {
      const r = await exportProjectPdf(useEditor.getState().project, {
        humanized: useUnits.getState().humanized,
        only,
      })
      set({
        toast: {
          text: `Projeto exportado em PDF · ${r.pages} prancha(s) · ${r.scales.length ? `escala ${r.scales.map((s) => `1:${s}`).join(', ')}` : 'sem escala'}`,
        },
      })
    } catch (e) {
      set({
        toast: {
          text: `Erro ao gerar PDF: ${e instanceof Error ? e.message : String(e)}`,
          error: true,
        },
      })
    } finally {
      set({ busy: false })
    }
  },
}))

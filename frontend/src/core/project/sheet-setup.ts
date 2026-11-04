import type { Orientation, PaperFormat } from '../sheets/paper'
import type { SheetBrand } from '../sheets/plan-sheet'
import { DEFAULT_SHEET_TEMPLATE, type Environment, type Project } from './schema'

/** O que a prancha recebe de fora do desenho: data e marca do escritório. */
export interface SheetContext {
  dateText?: string
  brand?: SheetBrand
}

export interface ResolvedSheetSetup {
  format: PaperFormat
  orientation: Orientation
  marginMm: number
  notes: string[]
}

/** Folha da prancha: a do ambiente, se escolhida; senão a do modelo de folha do projeto. */
export function sheetSetup(
  project: Partial<Pick<Project, 'librarySnapshots'>>,
  env?: Pick<Environment, 'sheet'>,
): ResolvedSheetSetup {
  const t = project.librarySnapshots?.sheetTemplate ?? DEFAULT_SHEET_TEMPLATE
  return {
    format: env?.sheet?.paper ?? t.paper,
    orientation: env?.sheet?.orientation ?? t.orientation,
    marginMm: t.marginMm,
    notes: t.notes,
  }
}

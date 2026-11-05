import { buildPlanSheet } from '../sheets/plan-sheet'
import { sheetSetup, type SheetContext } from './sheet-setup'
import type { Environment, Perspective, Project } from './schema'

/** A captura ocupa a área útil da folha, com o mesmo carimbo das plantas. */
export function perspectiveSheet(
  project: Project,
  env: Environment,
  perspective: Perspective,
  href: string,
  context: SheetContext = {},
) {
  return buildPlanSheet({
    ...sheetSetup(project, env),
    ...context,
    title: perspective.title,
    subtitle: `${project.name} · ${env.name}`,
    notes: [
      'Perspectiva ilustrativa, sem escala.',
      'Captura da vista 3D; não se atualiza com o modelo.',
    ],
    scale: 1,
    image: { href, aspect: perspective.widthPx / perspective.heightPx },
    build: () => [],
  })
}

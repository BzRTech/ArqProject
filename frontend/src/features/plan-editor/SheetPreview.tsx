import { useMemo } from 'react'
import { SheetViewer } from '@/app/ui/SheetViewer'
import { environmentSheet } from '@/core/project/env-sheet'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { useAssetUrl } from './hooks'
import { selectActiveEnv, useEditor } from './store'
import { useUnits } from './units-pref'

/** Aba Pranchas: a folha A3 do ambiente — a MESMA que vai para o PDF. */
export function SheetPreview() {
  const project = useEditor((s) => s.project)
  const env = useEditor(selectActiveEnv)
  const humanized = useUnits((u) => u.humanized)
  const href = useAssetUrl(env.basePlan?.visible ? env.basePlan.assetId : undefined)
  const sheet = useMemo(
    () =>
      environmentSheet(project, env, {
        humanized,
        basePlanHref: href,
        dateText: new Date().toLocaleDateString('pt-BR'),
      }),
    [project, env, humanized, href],
  )
  const node = useMemo(
    () =>
      primitivesToSvg(sheet.primitives, {
        widthMm: sheet.widthMm,
        heightMm: sheet.heightMm,
        background: '#ffffff',
      }),
    [sheet],
  )
  return (
    <div className="sheet-stage" data-testid="sheet-preview" data-scale={sheet.scale}>
      <SheetViewer sheet={node} widthMm={sheet.widthMm} heightMm={sheet.heightMm} />
    </div>
  )
}

import { useMemo } from 'react'
import { SheetViewer } from '@/app/ui/SheetViewer'
import { joinerySheet } from '@/core/joinery/sheet'
import { environmentSheet } from '@/core/project/env-sheet'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { useAssetUrl } from './hooks'
import { useRuleProfile } from './rules'
import { selectActiveEnv, useEditor } from './store'
import { useUnits } from './units-pref'

/** A folha A3 do ambiente ou do detalhe do móvel aberto — a MESMA que vai para o PDF. */
export function SheetPreview() {
  const project = useEditor((s) => s.project)
  const env = useEditor(selectActiveEnv)
  const humanized = useUnits((u) => u.humanized)
  const href = useAssetUrl(env.basePlan?.visible ? env.basePlan.assetId : undefined)
  const detailId = useEditor((s) => s.detailItemId)
  const rules = useRuleProfile()
  const sheet = useMemo(() => {
    const dateText = new Date().toLocaleDateString('pt-BR')
    const item = detailId ? env.items.find((i) => i.id === detailId) : undefined
    const detail = item && joinerySheet(project, env, item, rules, { dateText })
    return (
      detail ?? environmentSheet(project, env, { humanized, basePlanHref: href, dateText, rules })
    )
  }, [project, env, humanized, href, detailId, rules])
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

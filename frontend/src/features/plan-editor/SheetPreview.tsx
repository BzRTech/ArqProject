import { useMemo } from 'react'
import { perspectiveSheet } from '@/core/project/perspective-sheet'
import { SheetViewer } from '@/app/ui/SheetViewer'
import { joinerySheet } from '@/core/joinery/sheet'
import { environmentSheet } from '@/core/project/env-sheet'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { useSheetBrand } from '@/features/brand/sheet-brand'
import { useAssetUrl } from './hooks'
import { useRuleProfile } from './rules'
import { selectActiveEnv, useEditor } from './store'
import { useUnits } from './units-pref'

/** A folha do ambiente ou do detalhe do móvel aberto — a MESMA que vai para o PDF. */
export function SheetPreview() {
  const project = useEditor((s) => s.project)
  const env = useEditor(selectActiveEnv)
  const humanized = useUnits((u) => u.humanized)
  const href = useAssetUrl(env.basePlan?.visible ? env.basePlan.assetId : undefined)
  const perspectiveId = useEditor((s) => s.perspectiveId)
  const perspective = env.perspectives?.find((v) => v.id === perspectiveId)
  const perspectiveHref = useAssetUrl(perspective?.assetId)
  const detailId = useEditor((s) => s.detailItemId)
  const rules = useRuleProfile()
  const brand = useSheetBrand((b) => b.brand)
  const sheet = useMemo(() => {
    const dateText = new Date().toLocaleDateString('pt-BR')
    if (perspective)
      return perspectiveSheet(project, env, perspective, perspectiveHref ?? '', { dateText, brand })
    const item = detailId ? env.items.find((i) => i.id === detailId) : undefined
    const detail = item && joinerySheet(project, env, item, rules, { dateText, brand })
    return (
      detail ??
      environmentSheet(project, env, { humanized, basePlanHref: href, dateText, rules, brand })
    )
  }, [project, env, humanized, href, detailId, rules, brand, perspective, perspectiveHref])
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
      {perspective && !perspectiveHref && (
        <p role="status">
          Carregando captura. Se ela não aparecer, confira sua conexão e se o arquivo está neste
          navegador.
        </p>
      )}
      <SheetViewer sheet={node} widthMm={sheet.widthMm} heightMm={sheet.heightMm} />
    </div>
  )
}

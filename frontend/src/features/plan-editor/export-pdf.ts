import { joinerySheet } from '@/core/joinery/sheet'
import { environmentSheet } from '@/core/project/env-sheet'
import { perspectiveSheet } from '@/core/project/perspective-sheet'
import type { Project } from '@/core/project/schema'
import { svgPagesToPdf } from '@/render/pdf/exportPdf'
import { loadPdfFonts, registerWebFonts } from '@/render/pdf/fonts'
import { toMarkup } from '@/render/svg/markup'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { getAsset } from './persistence'
import { currentRuleProfile } from './rules'
import { useSheetBrand } from '@/features/brand/sheet-brand'

/** Prancha escolhida: a do ambiente (sem `itemId`) ou a de detalhe de um móvel. */
export interface SheetRef {
  envId: string
  itemId?: string
  perspectiveId?: string
}

/**
 * Pranchas em PDF: uma por ambiente com conteúdo e uma de detalhe por móvel detalhado (ou só
 * a escolhida em `only`). Folha e escala de cada uma como na tela; carimbo com a marca.
 */
export async function exportProjectPdf(
  project: Project,
  options: { humanized?: boolean; only?: SheetRef } = {},
): Promise<{ pages: number; scales: number[] }> {
  await registerWebFonts()
  const date = new Date().toLocaleDateString('pt-BR')
  const brand = useSheetBrand.getState().brand
  const only = options.only
  const envs = project.environments.filter(
    (e) => e.items.length || e.drawings.length || e.basePlan || e.perspectives?.length,
  )
  const list = only
    ? project.environments.filter((e) => e.id === only.envId)
    : envs.length
      ? envs
      : project.environments.slice(0, 1)
  const pages = []
  const scales: number[] = []
  for (const env of list) {
    const href = env.basePlan?.visible ? await getAsset(env.basePlan.assetId) : undefined
    const wantPlan = !only || (!only.itemId && !only.perspectiveId)
    const sheet = environmentSheet(project, env, {
      dateText: date,
      brand,
      basePlanHref: href,
      humanized: options.humanized,
      rules: currentRuleProfile(),
    })
    if (wantPlan) scales.push(sheet.scale)
    if (wantPlan)
      pages.push({
        svgMarkup: toMarkup(
          primitivesToSvg(sheet.primitives, {
            widthMm: sheet.widthMm,
            heightMm: sheet.heightMm,
            background: '#ffffff',
          }),
        ),
        widthMm: sheet.widthMm,
        heightMm: sheet.heightMm,
      })
    for (const item of env.items) {
      if (only && only.itemId !== item.id) continue
      const d = joinerySheet(project, env, item, currentRuleProfile(), { dateText: date, brand })
      if (!d) continue
      scales.push(d.scale)
      pages.push({
        svgMarkup: toMarkup(
          primitivesToSvg(d.primitives, {
            widthMm: d.widthMm,
            heightMm: d.heightMm,
            background: '#ffffff',
          }),
        ),
        widthMm: d.widthMm,
        heightMm: d.heightMm,
      })
    }
    for (const perspective of env.perspectives ?? []) {
      if (only && only.perspectiveId !== perspective.id) continue
      const image = await getAsset(perspective.assetId)
      if (!image)
        throw new Error(
          `A captura "${perspective.title}" não está disponível. Reabra o projeto com conexão ou faça uma nova captura.`,
        )
      const d = perspectiveSheet(project, env, perspective, image, { dateText: date, brand })
      pages.push({
        svgMarkup: toMarkup(
          primitivesToSvg(d.primitives, {
            widthMm: d.widthMm,
            heightMm: d.heightMm,
            background: '#ffffff',
          }),
        ),
        widthMm: d.widthMm,
        heightMm: d.heightMm,
      })
    }
  }
  const doc = await svgPagesToPdf(pages, await loadPdfFonts())
  const slug =
    project.name
      .normalize('NFD')
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'projeto'
  const suffix = only
    ? `-${only.perspectiveId ? 'perspectiva' : only.itemId ? 'detalhe' : 'prancha'}`
    : ''
  doc.save(`${slug}${suffix}.pdf`)
  return { pages: pages.length, scales }
}

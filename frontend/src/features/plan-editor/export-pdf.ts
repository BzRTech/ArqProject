import { environmentSheet } from '@/core/project/env-sheet'
import type { Project } from '@/core/project/schema'
import { svgPagesToPdf } from '@/render/pdf/exportPdf'
import { loadPdfFonts, registerWebFonts } from '@/render/pdf/fonts'
import { toMarkup } from '@/render/svg/markup'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { getAsset } from './persistence'

/** Uma prancha A3 por ambiente com conteúdo; escala automática (maior que couber). */
export async function exportProjectPdf(
  project: Project,
  options: { humanized?: boolean } = {},
): Promise<{ pages: number; scales: number[] }> {
  await registerWebFonts()
  const date = new Date().toLocaleDateString('pt-BR')
  const envs = project.environments.filter((e) => e.items.length || e.drawings.length || e.basePlan)
  const list = envs.length ? envs : project.environments.slice(0, 1)
  const pages = []
  const scales: number[] = []
  for (const env of list) {
    const href = env.basePlan?.visible ? await getAsset(env.basePlan.assetId) : undefined
    const sheet = environmentSheet(project, env, {
      dateText: date,
      basePlanHref: href,
      humanized: options.humanized,
    })
    scales.push(sheet.scale)
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
  }
  const doc = await svgPagesToPdf(pages, await loadPdfFonts())
  const slug =
    project.name
      .normalize('NFD')
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'projeto'
  doc.save(`${slug}.pdf`)
  return { pages: pages.length, scales }
}

import { createProject } from '@/api/projects'
import { uploadAsset } from '@/api/assets'
import { migrateProject } from '@/core/project/migrations'
import type { Project } from '@/core/project/schema'
import { getAsset, loadProject } from '@/features/plan-editor/persistence'

/**
 * Leva um projeto do navegador (rascunho local do /editor, ou arquivo .json baixado) para o
 * servidor: as plantas base vão para o S3 do escritório e o documento vira um projeto novo.
 */
async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

async function uploadBasePlans(project: Project): Promise<{ project: Project; missing: number }> {
  let missing = 0
  const environments = []
  for (const env of project.environments) {
    if (!env.basePlan) {
      environments.push(env)
      continue
    }
    const url = await getAsset(env.basePlan.assetId)
    if (!url) {
      missing++
      environments.push({ ...env, basePlan: null })
      continue
    }
    const blob = await dataUrlToBlob(url)
    const ext = blob.type.split('/')[1] ?? 'png'
    const assetId = await uploadAsset(blob, `planta-${env.name}.${ext}`)
    environments.push({ ...env, basePlan: { ...env.basePlan, assetId } })
  }
  return { project: { ...project, environments }, missing }
}

export interface ImportResult {
  id: string
  /** Plantas base que não estavam neste navegador (ficaram de fora). */
  missing: number
}

async function send(raw: unknown): Promise<ImportResult> {
  const doc = migrateProject(raw)
  const { project, missing } = await uploadBasePlans(doc)
  const created = await createProject(project)
  return { id: created.id, missing }
}

/** Há rascunho local neste navegador? (nome, para mostrar no botão) */
export async function localDraftName(): Promise<string | null> {
  const p = await loadProject().catch(() => null)
  return p ? p.name : null
}

export async function importLocalDraft(): Promise<ImportResult> {
  const p = await loadProject()
  if (!p) throw new Error('Não há rascunho salvo neste navegador.')
  return send(p)
}

export async function importJsonFile(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error('O arquivo não é um projeto .json válido.')
  }
  return send(raw)
}

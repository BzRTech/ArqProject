import { beforeEach, expect, it, vi } from 'vitest'
import { createProject } from '@/api/projects'
import { uploadAsset } from '@/api/assets'
import { newProject } from '@/core/project/schema'
import { getAsset } from '@/features/plan-editor/persistence'
import { importJsonFile } from './import-local'

vi.mock('@/api/projects', () => ({ createProject: vi.fn(async () => ({ id: 'remote' })) }))
vi.mock('@/api/assets', () => ({ uploadAsset: vi.fn(async () => 'remote-image') }))
vi.mock('@/features/plan-editor/persistence', () => ({ getAsset: vi.fn(), loadProject: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

const fixture = () => {
  const project = newProject('e')
  project.environments[0]!.perspectives = [
    { id: 'v', title: 'Sala', assetId: 'local-image', widthPx: 1200, heightPx: 800 },
  ]
  return { text: async () => JSON.stringify(project) } as File
}

it('envia a imagem da perspectiva ao servidor e substitui a referência local', async () => {
  vi.mocked(getAsset).mockResolvedValue('data:image/png;base64,aGVsbG8=')
  expect(await importJsonFile(fixture())).toEqual({ id: 'remote', missing: 0 })
  expect(uploadAsset).toHaveBeenCalledWith(expect.any(Blob), 'perspectiva.png')
  const saved = vi.mocked(createProject).mock.calls[0]![0]
  expect(saved.environments[0]!.perspectives?.[0]?.assetId).toBe('remote-image')
})

it('informa capturas ausentes sem enviar uma referência local quebrada', async () => {
  vi.mocked(getAsset).mockResolvedValue(undefined)
  expect(await importJsonFile(fixture())).toEqual({ id: 'remote', missing: 1 })
  expect(uploadAsset).not.toHaveBeenCalled()
  expect(vi.mocked(createProject).mock.calls[0]![0].environments[0]!.perspectives).toEqual([])
})

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectReport } from '@/core/project/report'
import type { Project } from '@/core/project/schema'
import { api, errorText, type Schemas } from './client'

export type ProjectSummary = Schemas['ProjectList']
export type ProjectDetail = Schemas['ProjectDetail']
export type ProjectStatus = Schemas['ProjectStatusEnum']
export type ProjectVersion = Schemas['Version']
export type Conflict = Schemas['Conflict']

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Rascunho',
  review: 'Em aprovação',
  approved: 'Aprovado',
  archived: 'Arquivado',
}

const LIST_KEY = ['projects'] as const

export function useProjects(search: string, status: string) {
  return useQuery({
    queryKey: [...LIST_KEY, { search, status }],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/projects/', {
        params: { query: { search: search || undefined, status: status || undefined } },
      })
      if (!data) throw new Error(errorText(error, 'Não foi possível carregar os projetos.'))
      return data
    },
    placeholderData: keepPreviousData,
  })
}

function useInvalidateList() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: LIST_KEY })
}

export async function createProject(data: Project, clientName = ''): Promise<ProjectDetail> {
  // O relatório do memorial é calculado pelo núcleo e vai junto (o servidor só guarda).
  const { data: created, error } = await api.POST('/api/projects/', {
    body: { data, client_name: clientName, report: projectReport(data) },
  })
  if (!created) throw new Error(errorText(error, 'Não foi possível criar o projeto.'))
  return created
}

export function useCreateProject() {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationFn: ({ data, clientName }: { data: Project; clientName?: string }) =>
      createProject(data, clientName),
    onSuccess: invalidate,
  })
}

export function useDuplicateProject() {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.POST('/api/projects/{id}/duplicate/', {
        params: { path: { id } },
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateProjectMeta() {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Schemas['PatchedProjectMetaRequest']) => {
      const { data, error } = await api.PATCH('/api/projects/{id}/', {
        params: { path: { id } },
        body,
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteProject() {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationFn: async (id: string) => {
      const { response, error } = await api.DELETE('/api/projects/{id}/', {
        params: { path: { id } },
      })
      if (!response.ok) throw new Error(errorText(error))
    },
    onSuccess: invalidate,
  })
}

export function useVersions(id: string | null) {
  return useQuery({
    queryKey: ['project-versions', id],
    enabled: id !== null,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/projects/{id}/versions/', {
        params: { path: { id: id! } },
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
  })
}

export function useSaveVersion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (label: string) => {
      const { data, error } = await api.POST('/api/projects/{id}/versions/', {
        params: { path: { id } },
        body: { label },
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-versions', id] }),
  })
}

export function useRestoreVersion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ versionId, revision }: { versionId: number; revision: number }) => {
      const { data, error, response } = await api.POST(
        '/api/projects/{id}/versions/{version_id}/restore/',
        {
          params: {
            path: { id, version_id: String(versionId) },
            header: { 'If-Match': `"${revision}"` },
          },
        },
      )
      if (response.status === 409)
        throw new Error('O projeto mudou enquanto a lista estava aberta. Tente de novo.')
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['project-versions', id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

// --- Usados pelo editor (fora do React Query: o autosave controla a revisão) ---------------

export async function fetchProject(id: string): Promise<ProjectDetail> {
  const { data, error, response } = await api.GET('/api/projects/{id}/', {
    params: { path: { id } },
  })
  if (response.status === 404) throw new Error('Projeto não encontrado neste escritório.')
  if (!data) throw new Error(errorText(error, 'Não foi possível abrir o projeto.'))
  return data
}

export type SaveResult =
  | { kind: 'saved'; revision: number }
  | { kind: 'conflict'; conflict: Conflict }
  | { kind: 'invalid'; message: string }
  | { kind: 'forbidden'; message: string }

/** PUT com If-Match (documento + relatório do memorial). Erro de rede vira exceção. */
export async function saveProjectRemote(
  id: string,
  doc: Project,
  revision: number,
): Promise<SaveResult> {
  const { data, error, response } = await api.PUT('/api/projects/{id}/', {
    params: { path: { id }, header: { 'If-Match': `"${revision}"` } },
    body: { data: doc, report: projectReport(doc) },
  })
  if (data) return { kind: 'saved', revision: data.revision }
  if (response.status === 409) return { kind: 'conflict', conflict: error as unknown as Conflict }
  if (response.status === 403) return { kind: 'forbidden', message: errorText(error) }
  if (response.status === 400) return { kind: 'invalid', message: errorText(error) }
  throw new Error(`Falha ao salvar (${response.status})`)
}

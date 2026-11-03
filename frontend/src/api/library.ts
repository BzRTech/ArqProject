import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LibraryKind } from '@/core/library/schemas'
import { kvGet, kvSet } from '@/features/plan-editor/persistence'
import { api, ensureCsrf, errorText, type Schemas } from './client'

export type LibraryRow = Schemas['LibraryRow']
export type ImportReport = Schemas['ImportReport']

interface CachedBundle {
  etag: string
  kinds: Record<string, unknown[]>
}

const cacheKey = (orgId: number) => `library-bundle:${orgId}`

/**
 * Bundle dos bancos (global + escritório) com cache no navegador: manda o ETag guardado e, se
 * nada mudou (304), usa o cache. Sem rede, devolve o cache (ou null).
 */
export async function fetchBundle(
  orgId: number,
): Promise<{ kinds: Record<string, unknown[]>; fromCache: boolean } | null> {
  const cached = await kvGet<CachedBundle>(cacheKey(orgId)).catch(() => undefined)
  try {
    const res = await fetch('/api/library/bundle/', {
      credentials: 'same-origin',
      headers: cached ? { 'If-None-Match': cached.etag } : {},
    })
    if (res.status === 304 && cached) return { kinds: cached.kinds, fromCache: true }
    if (!res.ok) throw new Error(`bundle ${res.status}`)
    const body = (await res.json()) as CachedBundle
    await kvSet(cacheKey(orgId), body).catch(() => undefined)
    return { kinds: body.kinds, fromCache: false }
  } catch {
    return cached ? { kinds: cached.kinds, fromCache: true } : null
  }
}

const rowsKey = (kind: LibraryKind) => ['library-rows', kind] as const

export function useLibraryRows(kind: LibraryKind, search: string) {
  return useQuery({
    queryKey: [...rowsKey(kind), search],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/library/{kind}/', {
        params: { path: { kind }, query: { search: search || undefined } },
      })
      if (!data) throw new Error(errorText(error, 'Não foi possível carregar o banco.'))
      return data
    },
  })
}

/** Depois de mudar o banco: recarrega a lista e avisa quem usa o bundle. */
function useAfterWrite(kind: LibraryKind, onChanged?: () => void) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: rowsKey(kind) })
    onChanged?.()
  }
}

export function useLibraryWrite(kind: LibraryKind, onChanged?: () => void) {
  const after = useAfterWrite(kind, onChanged)
  const create = useMutation({
    mutationFn: async (body: Schemas['LibraryWriteRequest']) => {
      const { data, error } = await api.POST('/api/library/{kind}/', {
        params: { path: { kind } },
        body,
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: after,
  })
  const update = useMutation({
    mutationFn: async ({ id, ...body }: { id: number } & Schemas['LibraryWriteRequest']) => {
      const { data, error } = await api.PUT('/api/library/{kind}/{id}/', {
        params: { path: { kind, id } },
        body,
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: after,
  })
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { response, error } = await api.DELETE('/api/library/{kind}/{id}/', {
        params: { path: { kind, id } },
      })
      if (!response.ok) throw new Error(errorText(error))
    },
    onSuccess: after,
  })
  const override = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await api.POST('/api/library/{kind}/{id}/override/', {
        params: { path: { kind, id } },
      })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: after,
  })
  return { create, update, remove, override }
}

/** Importa CSV/XLSX para o banco do escritório (multipart). */
export async function importSheet(
  kind: LibraryKind,
  file: File,
  dryRun: boolean,
): Promise<ImportReport> {
  const form = new FormData()
  form.append('file', file)
  form.append('dry_run', String(dryRun))
  const token = await ensureCsrf()
  const res = await fetch(`/api/library/${kind}/import/`, {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
    headers: token ? { 'X-CSRFToken': token } : {},
  })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error(errorText(body, 'Não foi possível importar a planilha.'))
  return body as ImportReport
}

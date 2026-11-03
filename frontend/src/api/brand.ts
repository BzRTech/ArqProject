import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorText, type Schemas } from './client'

export type Brand = Schemas['Brand']
export const BRAND_KEY = ['brand'] as const

/** "Minha marca": o escritório ativo com logo, cor e contato. */
export function useBrand(enabled = true) {
  return useQuery({
    queryKey: BRAND_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/orgs/current/')
      if (!data) throw new Error(errorText(error, 'Não foi possível carregar a marca.'))
      return data
    },
    staleTime: 60_000,
  })
}

export function useUpdateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Schemas['PatchedBrandRequest']) => {
      const { data, error } = await api.PATCH('/api/orgs/current/', { body })
      if (!data) throw new Error(errorText(error, 'Não foi possível salvar a marca.'))
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(BRAND_KEY, data)
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

/** Linhas de contato do carimbo/memorial, na ordem. */
export const brandLines = (b: Brand): string[] =>
  [b.phone, b.email, b.website, b.address, b.registration].filter((x): x is string => !!x)

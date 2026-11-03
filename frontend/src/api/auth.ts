import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorText, type Schemas } from './client'

export type Me = Schemas['Me']
export const ME_KEY = ['me'] as const

/** Usuário logado (null = não logado). */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<Me | null> => {
      const { data, response } = await api.GET('/api/auth/me/')
      if (response.status === 401 || response.status === 403) return null
      if (!data) throw new Error('API indisponível')
      return data
    },
    retry: false,
    staleTime: 60_000,
  })
}

function useSetMe() {
  const qc = useQueryClient()
  return (me: Me | null) => {
    qc.setQueryData(ME_KEY, me)
    // Projetos e tudo o mais dependem do escritório ativo.
    void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] })
  }
}

export function useLogin() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: async (body: Schemas['LoginRequest']) => {
      const { data, error } = await api.POST('/api/auth/login/', { body })
      if (!data) throw new Error(errorText(error, 'E-mail ou senha incorretos.'))
      return data
    },
    onSuccess: setMe,
  })
}

export function useSignUp() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: async (body: Schemas['SignUpRequest']) => {
      const { data, error } = await api.POST('/api/auth/signup/', { body })
      if (!data) throw new Error(errorText(error, 'Não foi possível criar a conta.'))
      return data
    },
    onSuccess: setMe,
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.POST('/api/auth/logout/')
    },
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(ME_KEY, null)
    },
  })
}

export function useSwitchOrganization() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: async (organization: number) => {
      const { data, error } = await api.POST('/api/orgs/switch/', { body: { organization } })
      if (!data) throw new Error(errorText(error))
      return data
    },
    onSuccess: setMe,
  })
}

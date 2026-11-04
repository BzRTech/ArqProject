import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '@/api/auth'

/** Rotas que exigem login: sem sessão, vai para /entrar e volta depois. */
export default function RequireAuth() {
  const me = useMe()
  const location = useLocation()
  if (me.isPending) return <p className="loading">Carregando…</p>
  if (me.isError)
    return (
      <p className="loading" data-testid="api-down">
        Servidor indisponível. O backend está rodando? (O rascunho local em /editor funciona sem
        ele.)
      </p>
    )
  if (!me.data) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/entrar?next=${next}`} replace />
  }
  if (!me.data.organization)
    return <p className="loading">Sua conta não participa de nenhum escritório. Peça um convite.</p>
  return <Outlet />
}

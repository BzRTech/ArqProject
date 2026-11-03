import { LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useLogout, useMe, useSwitchOrganization } from '@/api/auth'

const ROLE_LABEL = { owner: 'dono', editor: 'editor', viewer: 'leitor' } as const

/** Escritório ativo (troca, se tiver mais de um), usuário e sair. */
export function UserMenu() {
  const me = useMe()
  const logout = useLogout()
  const switchOrg = useSwitchOrganization()
  const navigate = useNavigate()
  if (me.isPending || me.isError) return null
  if (!me.data)
    return (
      <Link to="/entrar" className="button sm" data-testid="login-link">
        Entrar
      </Link>
    )
  const { data } = me
  return (
    <div className="user-menu" data-testid="user-menu">
      {data.memberships.length > 1 ? (
        <select
          aria-label="Escritório"
          value={data.organization?.id ?? ''}
          onChange={(e) =>
            switchOrg.mutate(Number(e.target.value), { onSuccess: () => navigate('/projetos') })
          }
        >
          {data.memberships.map((m) => (
            <option key={m.organization.id} value={m.organization.id}>
              {m.organization.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="user-menu__org">{data.organization?.name}</span>
      )}
      <span className="user-menu__who" title={data.email}>
        {data.name}
        {data.role && <small> · {ROLE_LABEL[data.role]}</small>}
      </span>
      <button
        type="button"
        className="icon"
        title="Sair"
        aria-label="Sair"
        onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/entrar') })}
        data-testid="logout"
      >
        <LogOut size={15} strokeWidth={1.5} />
      </button>
    </div>
  )
}

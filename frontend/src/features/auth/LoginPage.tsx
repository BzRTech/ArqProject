import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useLogin, useMe, useSignUp } from '@/api/auth'
import { Segmented } from '@/app/ui/Segmented'

const MODES = ['Entrar', 'Criar conta'] as const
type Mode = (typeof MODES)[number]

/** Entrar (e-mail e senha) ou criar conta + escritório. */
export default function LoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const me = useMe()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('Entrar')
  const login = useLogin()
  const signUp = useSignUp()
  const [form, setForm] = useState({ name: '', email: '', password: '', organization_name: '' })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  if (me.data) return <Navigate to={next} replace />

  const pending = login.isPending || signUp.isPending
  const error = (mode === 'Entrar' ? login.error : signUp.error)?.message

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const done = { onSuccess: () => navigate(next, { replace: true }) }
    if (mode === 'Entrar') login.mutate({ email: form.email, password: form.password }, done)
    else signUp.mutate(form, done)
  }

  return (
    <section className="auth">
      <div className="auth__intro">
        <div className="eyebrow">Projetos de interiores</div>
        <h1>{mode === 'Entrar' ? 'Entrar' : 'Criar conta'}</h1>
        <p>
          {mode === 'Entrar'
            ? 'Seus projetos ficam salvos no servidor do escritório, com histórico de versões.'
            : 'A conta cria também o seu escritório. Depois você convida a equipe.'}
        </p>
      </div>
      <form className="auth__form" onSubmit={submit} data-testid="auth-form">
        <Segmented<Mode>
          label="Entrar ou criar conta"
          value={mode}
          onChange={setMode}
          options={MODES}
          testId="auth-mode"
        />
        {mode === 'Criar conta' && (
          <label className="field">
            <span>Seu nome</span>
            <input
              value={form.name}
              onChange={set('name')}
              required
              autoComplete="name"
              data-testid="auth-name"
            />
          </label>
        )}
        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            required
            autoComplete="email"
            data-testid="auth-email"
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            autoComplete={mode === 'Entrar' ? 'current-password' : 'new-password'}
            data-testid="auth-password"
          />
        </label>
        {mode === 'Criar conta' && (
          <label className="field">
            <span>Nome do escritório</span>
            <input
              value={form.organization_name}
              onChange={set('organization_name')}
              required
              placeholder="Ex.: Estúdio Silva Arquitetura"
              data-testid="auth-org"
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert" data-testid="auth-error">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={pending} data-testid="auth-submit">
          {pending ? 'Aguarde…' : mode === 'Entrar' ? 'Entrar' : 'Criar conta e escritório'}
        </button>
      </form>
    </section>
  )
}

/** Só caminhos internos (evita redirecionar para outro site). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/projetos'
}

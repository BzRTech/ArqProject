import createClient, { type Middleware } from 'openapi-fetch'
import type { components, paths } from './schema'

export type Schemas = components['schemas']

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1]
}

let csrfPromise: Promise<unknown> | null = null

/** Garante o cookie `csrftoken` (o Django o entrega em /api/auth/csrf/). */
export async function ensureCsrf(): Promise<string | undefined> {
  if (!readCookie('csrftoken')) {
    csrfPromise ??= fetch('/api/auth/csrf/', { credentials: 'same-origin' }).finally(() => {
      csrfPromise = null
    })
    await csrfPromise
  }
  const token = readCookie('csrftoken')
  return token ? decodeURIComponent(token) : undefined
}

/** Envia o token CSRF do Django em métodos que alteram estado (auth por sessão). */
const csrf: Middleware = {
  async onRequest({ request }) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const token = await ensureCsrf()
      if (token) request.headers.set('X-CSRFToken', token)
    }
    return request
  },
}

/** Cliente tipado gerado a partir do OpenAPI (`npm run gen:api`). */
export const api = createClient<paths>({ baseUrl: '/', credentials: 'same-origin' })
api.use(csrf)

/** Mensagem legível de um erro da API (DRF: `detail` ou erros por campo). */
export function errorText(error: unknown, fallback = 'Não foi possível concluir.'): string {
  if (!error || typeof error !== 'object') return fallback
  const e = error as Record<string, unknown>
  if (typeof e.detail === 'string') return e.detail
  for (const v of Object.values(e)) {
    if (typeof v === 'string') return v
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  }
  return fallback
}

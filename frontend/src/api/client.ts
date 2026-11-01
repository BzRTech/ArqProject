import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1]
}

/** Envia o token CSRF do Django em métodos que alteram estado (auth por sessão). */
const csrf: Middleware = {
  onRequest({ request }) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const token = readCookie('csrftoken')
      if (token) request.headers.set('X-CSRFToken', decodeURIComponent(token))
    }
    return request
  },
}

/** Cliente tipado gerado a partir do OpenAPI (`npm run gen:api`). */
export const api = createClient<paths>({ baseUrl: '/', credentials: 'same-origin' })
api.use(csrf)

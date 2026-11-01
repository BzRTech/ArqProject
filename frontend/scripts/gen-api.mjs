// Gera src/api/schema.d.ts a partir do OpenAPI do Django (drf-spectacular).
// Fonte: $API_SCHEMA_URL ou http://localhost:8000/api/schema/ (backend rodando).
import { writeFile } from 'node:fs/promises'
import openapiTS, { astToString } from 'openapi-typescript'

const source = process.env.API_SCHEMA_URL ?? 'http://localhost:8000/api/schema/'
const res = await fetch(source, { headers: { Accept: 'application/vnd.oai.openapi+json' } })
if (!res.ok) {
  console.error(`Falha ao baixar o schema (${res.status}) de ${source}`)
  process.exit(1)
}
const ast = await openapiTS(await res.json())
const banner = '// Arquivo GERADO por `npm run gen:api`. Não edite à mão.\n\n'
await writeFile(new URL('../src/api/schema.d.ts', import.meta.url), banner + astToString(ast))
console.log(`src/api/schema.d.ts atualizado a partir de ${source}`)

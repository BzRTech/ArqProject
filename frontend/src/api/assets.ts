import { api, errorText } from './client'

/**
 * Envia um arquivo ao S3 do escritório: o backend reserva e assina a URL, o navegador envia
 * direto (PUT) e o backend confere. Devolve o id do arquivo (vai no documento).
 */
export async function uploadAsset(blob: Blob, filename: string): Promise<string> {
  const { data: pre, error } = await api.POST('/api/assets/presign/', {
    body: { filename, content_type: blob.type, size: blob.size },
  })
  if (!pre) throw new Error(errorText(error, 'Não foi possível enviar o arquivo.'))
  const put = await fetch(pre.upload_url, { method: pre.method, headers: pre.headers, body: blob })
  if (!put.ok) throw new Error(`O armazenamento recusou o arquivo (${put.status}).`)
  const { data: done, error: e2 } = await api.POST('/api/assets/{asset_id}/complete/', {
    params: { path: { asset_id: pre.asset.id } },
  })
  if (!done) throw new Error(errorText(e2, 'O envio do arquivo não foi confirmado.'))
  return done.id
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Baixa um arquivo do servidor como Blob (null se não existir ou não for do escritório). */
export async function downloadAsset(id: string): Promise<Blob | null> {
  if (!UUID.test(id)) return null
  const { data, response } = await api.GET('/api/assets/{asset_id}/', {
    params: { path: { asset_id: id } },
  })
  if (!data?.url || !response.ok) return null
  const r = await fetch(data.url)
  return r.ok ? r.blob() : null
}

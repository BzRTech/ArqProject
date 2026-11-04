/**
 * Para onde vão os arquivos novos (planta base): o navegador (rascunho local, IndexedDB) ou o
 * S3 do escritório (projeto no servidor). Quem abre o editor escolhe (`usePersistence`).
 */
export type AssetTarget = 'local' | 'server'

let target: AssetTarget = 'local'

export const setAssetTarget = (t: AssetTarget) => {
  target = t
}
export const assetTarget = () => target

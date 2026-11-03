import { uploadAsset } from '@/api/assets'
import { assetTarget } from './asset-target'
import { rememberAsset } from './hooks'
import { usePdf } from './pdf-action'
import { imageSize, putAsset, readFileAsDataUrl } from './persistence'
import { newId, useEditor } from './store'

/** Carrega uma imagem como planta base (10 m de largura até calibrar) e passa a calibrar. */
export async function importBasePlan(file: File) {
  try {
    const dataUrl = await readFileAsDataUrl(file)
    const { width, height } = await imageSize(dataUrl)
    // Projeto do servidor: o arquivo vai para o S3 do escritório; o navegador guarda cópia.
    const assetId = assetTarget() === 'server' ? await uploadAsset(file, file.name) : newId()
    await putAsset(assetId, dataUrl)
    rememberAsset(assetId, dataUrl)
    const widthMm = 10000
    useEditor.getState().setBasePlan({
      assetId,
      x: 0,
      y: 0,
      widthMm,
      heightMm: (widthMm * height) / width,
      opacity: 0.6,
      locked: true,
      visible: true,
      calibrated: false,
    })
    useEditor.getState().setTool('calibrate')
  } catch (e) {
    usePdf
      .getState()
      .notify(
        `Não foi possível importar a planta: ${e instanceof Error ? e.message : String(e)}`,
        true,
      )
  }
}

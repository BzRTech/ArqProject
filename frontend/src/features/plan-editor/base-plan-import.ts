import { rememberAsset } from './hooks'
import { imageSize, putAsset, readFileAsDataUrl } from './persistence'
import { newId, useEditor } from './store'

/** Carrega uma imagem como planta base (10 m de largura até calibrar) e passa a calibrar. */
export async function importBasePlan(file: File) {
  const dataUrl = await readFileAsDataUrl(file)
  const { width, height } = await imageSize(dataUrl)
  const assetId = newId()
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
}

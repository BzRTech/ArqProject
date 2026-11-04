import { uploadAsset } from '@/api/assets'
import { assetTarget } from './asset-target'
import { rememberAsset } from './hooks'
import { usePdf } from './pdf-action'
import { imageSize, putAsset, readFileAsDataUrl } from './persistence'
import { newId, useEditor } from './store'
import { create } from 'zustand'

interface PdfRequest {
  file: File
  environmentId: string
  complete: () => void
}
export const usePdfPlanImport = create<{ request: PdfRequest | null; busy: boolean }>(() => ({
  request: null,
  busy: false,
}))
export const isPdfPlan = (file: File) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
export function closePdfPlanImport() {
  if (usePdfPlanImport.getState().busy) return
  const request = usePdfPlanImport.getState().request
  usePdfPlanImport.setState({ request: null })
  request?.complete()
}

export function importBasePlan(file: File): Promise<void> {
  if (usePdfPlanImport.getState().busy) return Promise.resolve()
  if (!isPdfPlan(file)) return importImagePlan(file)
  closePdfPlanImport()
  return new Promise((resolve) =>
    usePdfPlanImport.setState({
      request: { file, environmentId: useEditor.getState().activeEnvId, complete: resolve },
    }),
  )
}

/** Carrega uma imagem como planta base (10 m de largura até calibrar) e passa a calibrar. */
export async function importImagePlan(
  file: File,
  environmentId = useEditor.getState().activeEnvId,
) {
  try {
    const dataUrl = await readFileAsDataUrl(file)
    const { width, height } = await imageSize(dataUrl)
    // Projeto do servidor: o arquivo vai para o S3 do escritório; o navegador guarda cópia.
    const assetId = assetTarget() === 'server' ? await uploadAsset(file, file.name) : newId()
    await putAsset(assetId, dataUrl)
    rememberAsset(assetId, dataUrl)
    if (useEditor.getState().activeEnvId !== environmentId)
      throw new Error(
        'O ambiente mudou durante a importação. Importe a planta novamente no ambiente desejado.',
      )
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

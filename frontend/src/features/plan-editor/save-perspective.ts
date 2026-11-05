import { uploadAsset } from '@/api/assets'
import { assetTarget } from './asset-target'
import { putAsset, readFileAsDataUrl } from './persistence'
import { newId, useEditor } from './store'
import { useEditorSession } from './session'

/** Limita o tamanho da captura antes de armazená-la, especialmente em telas Retina. */
export async function savePerspective(canvas: HTMLCanvasElement, title: string) {
  const { activeEnvId, project } = useEditor.getState()
  const target = assetTarget()
  const projectId = useEditorSession.getState().projectId
  const env = project.environments.find((e) => e.id === activeEnvId)!
  const output = document.createElement('canvas')
  const ratio = Math.min(1, 2400 / Math.max(canvas.width, canvas.height))
  output.width = Math.max(1, Math.round(canvas.width * ratio))
  output.height = Math.max(1, Math.round(canvas.height * ratio))
  const ctx = output.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')
  ctx.drawImage(canvas, 0, 0, output.width, output.height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    output.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Não foi possível capturar a vista.'))),
      'image/png',
    ),
  )
  const widthPx = output.width,
    heightPx = output.height
  output.width = output.height = 1
  const assetId = target === 'server' ? await uploadAsset(blob, 'perspectiva.png') : newId()
  await putAsset(assetId, await readFileAsDataUrl(blob))
  // O editor pode trocar de projeto enquanto termina o upload; não anexa em outro documento.
  if (
    useEditorSession.getState().projectId !== projectId ||
    !useEditor.getState().project.environments.some((e) => e.id === env.id)
  )
    throw new Error('O projeto mudou durante a captura. Capture novamente no projeto desejado.')
  const id = newId()
  useEditor
    .getState()
    .addPerspective(env.id, { id, title: title.trim().slice(0, 120), assetId, widthPx, heightPx })
  if (useEditor.getState().activeEnvId === env.id) useEditor.getState().openPerspective(env.id, id)
}

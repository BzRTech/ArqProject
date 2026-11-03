import { isJoineryBlock, missingParts } from '@/core/joinery/finish'
import type { StepAction } from '@/core/editor/stages'
import { usePdf } from './pdf-action'
import { selectActiveEnv, useEditor, type Tool } from './store'

/** Executa a ação de um passo do checklist (ferramenta ou comando). */
export function runStepAction(a: StepAction) {
  const s = useEditor.getState()
  const env = selectActiveEnv(s)
  if (a.kind === 'tool') {
    if (a.tool === 'door') s.startOpening('porta-abrir')
    else if (a.tool === 'window') s.startOpening('janela-correr-2')
    else s.setTool(a.tool as Tool)
    return
  }
  switch (a.command) {
    case 'wall-dims':
      for (const d of env.drawings) if (d.kind === 'wall') useEditor.getState().addWallDims(d.id)
      return
    case 'item-dims':
      s.addItemDims(env.items.map((it) => it.id))
      return
    case 'area-from-walls':
      s.addAreasFromWalls()
      return
    case 'select-area': {
      const areas = env.drawings.filter((d) => d.kind === 'area')
      const target = areas.find((a) => a.kind === 'area' && !a.floor) ?? areas[0]
      if (target) s.select({ kind: 'drawing', id: target.id })
      return
    }
    case 'select-joinery': {
      const list = env.items.filter((it) => isJoineryBlock(it.blockId))
      const target = list.find((it) => missingParts(it.joinery).length > 0) ?? list[0]
      if (target) s.select({ kind: 'item', id: target.id })
      return
    }
    case 'pdf':
      void usePdf.getState().run()
  }
}

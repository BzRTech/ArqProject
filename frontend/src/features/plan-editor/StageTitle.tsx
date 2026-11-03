import { STAGE_LABEL } from '@/core/editor/stages'
import { selectActiveEnv, useEditor } from './store'

/** Título no canto da área de desenho: ambiente ativo e tipo de vista. */
export function StageTitle() {
  const name = useEditor((s) => selectActiveEnv(s).name)
  const stage = useEditor((s) => s.stage)
  return (
    <div className="stage__title">
      <strong>{name}</strong>
      <span>Planta baixa · {STAGE_LABEL[stage]}</span>
    </div>
  )
}

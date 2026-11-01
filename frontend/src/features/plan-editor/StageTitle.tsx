import { selectActiveEnv, useEditor } from './store'

/** Título no canto da área de desenho: ambiente ativo e tipo de vista. */
export function StageTitle() {
  const name = useEditor((s) => selectActiveEnv(s).name)
  return (
    <div className="stage__title">
      <strong>{name}</strong>
      <span>Planta baixa</span>
    </div>
  )
}

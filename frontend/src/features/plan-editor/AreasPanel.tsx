import { Plus } from 'lucide-react'
import { areaM2Text } from '@/core/project/areas'
import { selectActiveEnv, useEditor } from './store'

/** Aba Piso, à esquerda: as áreas do ambiente e o piso de cada uma. */
export function AreasPanel() {
  const env = useEditor(selectActiveEnv)
  const selection = useEditor((s) => s.selection)
  const s = useEditor.getState()
  const areas = env.drawings.filter((d) => d.kind === 'area')
  const hasWalls = env.drawings.some((d) => d.kind === 'wall' && d.closed)
  return (
    <aside className="panel panel--catalog" data-testid="areas-panel">
      <h2>Áreas</h2>
      <p className="muted small">
        O piso é aplicado numa área. Crie pelas faces internas das paredes ou desenhe com a
        ferramenta Área (Q), clicando nos cantos.
      </p>
      {hasWalls && (
        <button
          type="button"
          className="sm"
          onClick={() => s.addAreasFromWalls()}
          data-testid="areas-from-walls"
        >
          <Plus size={14} strokeWidth={1.5} />
          Criar área do ambiente
        </button>
      )}
      <ul className="list">
        {areas.map((a) =>
          a.kind === 'area' ? (
            <li key={a.id}>
              <button
                type="button"
                className={`list__row ${selection?.id === a.id ? 'is-selected' : ''}`}
                onClick={() => s.select({ kind: 'drawing', id: a.id })}
              >
                <span>
                  <strong>{a.name || 'Área'}</strong>
                  <span className="small muted">{a.floor ? a.floor.name : 'sem piso'}</span>
                </span>
                <span className="mono small">{areaM2Text(a)}</span>
              </button>
            </li>
          ) : null,
        )}
      </ul>
      {!areas.length && <p className="muted small">Nenhuma área ainda.</p>}
    </aside>
  )
}

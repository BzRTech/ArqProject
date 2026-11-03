import { FileText } from 'lucide-react'
import { useEditor } from './store'

/** Aba Pranchas, à esquerda: uma prancha A3 por ambiente. */
export function SheetsPanel() {
  const project = useEditor((s) => s.project)
  const activeId = useEditor((s) => s.activeEnvId)
  const setActiveEnv = useEditor((s) => s.setActiveEnv)
  return (
    <aside className="panel panel--catalog" data-testid="sheets-panel">
      <h2>Pranchas</h2>
      <p className="muted small">
        Uma prancha A3 por ambiente, na maior escala que couber. Clique para ver cada uma.
      </p>
      <ul className="list">
        {project.environments.map((e, i) => (
          <li key={e.id}>
            <button
              type="button"
              className={`list__row ${e.id === activeId ? 'is-selected' : ''}`}
              onClick={() => setActiveEnv(e.id)}
            >
              <span>
                <strong>
                  <FileText size={13} strokeWidth={1.5} /> Prancha {String(i + 1).padStart(2, '0')}
                </strong>
                <span className="small muted">{e.name}</span>
              </span>
              <span className="mono small">{e.items.length} itens</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

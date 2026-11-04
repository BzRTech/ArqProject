import { FileText } from 'lucide-react'
import { computeLegend } from '@/core/project/markers'
import { useEditor } from './store'

/** Aba Pranchas, à esquerda: a prancha de cada ambiente e as de detalhe dos móveis. */
export function SheetsPanel() {
  const project = useEditor((s) => s.project)
  const activeId = useEditor((s) => s.activeEnvId)
  const detailId = useEditor((s) => s.detailItemId)
  const { setActiveEnv, openDetail } = useEditor.getState()
  let n = 0
  const num = () => String(++n).padStart(2, '0')
  return (
    <aside className="panel panel--catalog" data-testid="sheets-panel">
      <h2>Pranchas</h2>
      <p className="muted small">
        Uma prancha por ambiente e uma de detalhe por móvel de marcenaria detalhado. Clique para ver
        cada uma.
      </p>
      <ul className="list">
        {project.environments.flatMap((e) => {
          const { labelOf } = computeLegend(e)
          return [
            <li key={e.id}>
              <button
                type="button"
                className={`list__row ${e.id === activeId && !detailId ? 'is-selected' : ''}`}
                onClick={() => setActiveEnv(e.id)}
              >
                <span>
                  <strong>
                    <FileText size={13} strokeWidth={1.5} /> Prancha {num()}
                  </strong>
                  <span className="small muted">{e.name} · planta</span>
                </span>
                <span className="mono small">{e.items.length} itens</span>
              </button>
            </li>,
            ...e.items
              .filter((it) => it.joinery?.design)
              .map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className={`list__row ${detailId === it.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setActiveEnv(e.id)
                      openDetail(it.id)
                    }}
                    data-testid={`sheet-detail-${it.id}`}
                  >
                    <span>
                      <strong>
                        <FileText size={13} strokeWidth={1.5} /> Prancha {num()}
                      </strong>
                      <span className="small muted">
                        {labelOf.get(it.id) ?? 'M'} · {it.name} · detalhe
                      </span>
                    </span>
                  </button>
                </li>
              )),
          ]
        })}
      </ul>
    </aside>
  )
}

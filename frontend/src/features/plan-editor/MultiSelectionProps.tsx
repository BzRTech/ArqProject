import type { Environment } from '@/core/project/schema'
import { refKindLabel } from './geometry'
import { useEditor } from './store'

/** Painel quando há vários objetos selecionados: contagem por tipo, filtro e exclusão. */
export function MultiSelectionProps({ env }: { env: Environment }) {
  const selected = useEditor((s) => s.selected)
  const selectMany = useEditor((s) => s.selectMany)
  const deleteSelection = useEditor((s) => s.deleteSelection)
  const groups = new Map<string, typeof selected>()
  for (const r of selected) {
    const label = refKindLabel(env, r)
    groups.set(label, [...(groups.get(label) ?? []), r])
  }
  return (
    <section data-testid="multi-selection">
      <h2>{selected.length} objetos selecionados</h2>
      <ul className="small">
        {[...groups].map(([label, refs]) => (
          <li key={label}>
            {label}: {refs.length}
          </li>
        ))}
      </ul>
      {groups.size > 1 && (
        <>
          <p className="muted small">Manter só:</p>
          <div className="button-row">
            {[...groups].map(([label, refs]) => (
              <button key={label} type="button" onClick={() => selectMany(refs)}>
                {label} ({refs.length})
              </button>
            ))}
          </div>
        </>
      )}
      <div className="button-row">
        <button type="button" className="danger" onClick={deleteSelection}>
          Excluir {selected.length}
        </button>
        <button type="button" onClick={() => selectMany([])}>
          Limpar seleção
        </button>
      </div>
      <p className="muted small">
        Arraste qualquer objeto do grupo para mover todos. Shift + clique tira ou põe um objeto.
      </p>
    </section>
  )
}

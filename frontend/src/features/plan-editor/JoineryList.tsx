import { isJoineryBlock, joinerySummary, missingParts } from '@/core/joinery/finish'
import { computeLegend } from '@/core/project/markers'
import type { Environment } from '@/core/project/schema'
import { useEditor } from './store'

/** Aba Marcenaria sem nada selecionado: os móveis planejados do ambiente e o que falta. */
export function JoineryList({ env }: { env: Environment }) {
  const select = useEditor((s) => s.select)
  const list = env.items.filter((it) => isJoineryBlock(it.blockId))
  const { labelOf } = computeLegend(env)
  return (
    <section data-testid="joinery-list">
      <h2>Móveis planejados</h2>
      {!list.length && (
        <p className="muted small">
          Nenhum ainda. Escolha um móvel à esquerda (guarda-roupa, rack…) e clique na planta.
        </p>
      )}
      <ul className="list">
        {list.map((it) => {
          const summary = joinerySummary(it.joinery)
          return (
            <li key={it.id}>
              <button
                type="button"
                className="list__row"
                onClick={() => select({ kind: 'item', id: it.id })}
              >
                <span>
                  <strong>
                    {labelOf.get(it.id) && (
                      <span className="marker-chip marker-chip--m">{labelOf.get(it.id)}</span>
                    )}{' '}
                    {it.name}
                  </strong>
                  <span className="small muted">{summary || 'sem acabamento'}</span>
                </span>
                {missingParts(it.joinery).length ? (
                  <span className="pill pill--pending">falta</span>
                ) : (
                  <span className="pill pill--ok">ok</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

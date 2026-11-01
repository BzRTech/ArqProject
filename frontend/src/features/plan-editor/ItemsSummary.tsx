import { floorRows, floorTotalCents } from '@/core/finishes/budget'
import { budgetSummary, computeLegend } from '@/core/project/markers'
import type { Environment } from '@/core/project/schema'
import { formatBRL, formatQty } from '@/core/units'
import { downloadProjectCsv } from './export-csv'
import { useEditor } from './store'

/** Itens e revestimentos do ambiente (como na legenda), com totais do ambiente e do projeto. */
export function ItemsSummary({ env }: { env: Environment }) {
  const project = useEditor((s) => s.project)
  const select = useEditor((s) => s.select)
  const { rows } = computeLegend(env)
  const floors = floorRows(env)
  const envSum = budgetSummary(env.items)
  const envTotal = envSum.totalCents + floorTotalCents(env)
  const projTotal = project.environments.reduce(
    (s, e) => s + budgetSummary(e.items).totalCents + floorTotalCents(e),
    0,
  )
  const outOfLegend = env.items.filter((it) => !it.inLegend)
  const empty = env.items.length === 0 && floors.length === 0
  return (
    <section data-testid="env-summary">
      <h2>Itens do ambiente</h2>
      {empty ? (
        <p className="muted small">
          Clique num bloco à esquerda e depois na planta (ou arraste). Para o piso, selecione uma
          área e escolha o revestimento.
        </p>
      ) : (
        <>
          <table className="items-table">
            <thead>
              <tr>
                <th />
                <th>Item</th>
                <th className="num">Qtd</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  onClick={() => select({ kind: 'item', id: r.itemIds[0]! })}
                  data-testid="legend-row"
                >
                  <td>
                    <span className={`marker-chip ${r.marcenaria ? 'marker-chip--m' : ''}`}>
                      {r.label}
                    </span>
                  </td>
                  <td>
                    {r.name}
                    {r.existing && <small className="muted"> (existente)</small>}
                  </td>
                  <td className="num">
                    {formatQty(r.qty)} {r.unit}
                  </td>
                  <td className="num">
                    {r.existing ? (
                      '—'
                    ) : r.totalCents ? (
                      formatBRL(r.totalCents)
                    ) : (
                      <span className="muted">sem preço</span>
                    )}
                  </td>
                </tr>
              ))}
              {outOfLegend.map((it) => (
                <tr
                  key={it.id}
                  className="muted"
                  onClick={() => select({ kind: 'item', id: it.id })}
                >
                  <td />
                  <td>{it.name} (fora da legenda)</td>
                  <td className="num">
                    {formatQty(it.qty)} {it.unit}
                  </td>
                  <td />
                </tr>
              ))}
              {floors.length > 0 && (
                <tr className="group-row">
                  <td colSpan={4}>Revestimentos</td>
                </tr>
              )}
              {floors.map((r) => (
                <tr
                  key={r.key}
                  onClick={() => select({ kind: 'drawing', id: r.areaIds[0]! })}
                  data-testid="floor-row"
                >
                  <td>
                    <span className="marker-chip marker-chip--p">{r.label}</span>
                  </td>
                  <td>{r.name}</td>
                  <td className="num">
                    {formatQty(r.qty)} {r.unit}
                  </td>
                  <td className="num">
                    {r.totalCents ? (
                      formatBRL(r.totalCents)
                    ) : (
                      <span className="muted">sem preço</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="totals">
            <dt>Total do ambiente</dt>
            <dd data-testid="env-total">{formatBRL(envTotal)}</dd>
            <dt>Aprovados</dt>
            <dd data-testid="env-approved">
              {envSum.approvedCount}/{envSum.itemCount}
            </dd>
            {envSum.missingPrice > 0 && (
              <>
                <dt>Sem preço</dt>
                <dd>{envSum.missingPrice}</dd>
              </>
            )}
            <dt>Total do projeto</dt>
            <dd data-testid="project-total">
              <strong>{formatBRL(projTotal)}</strong>
            </dd>
          </dl>
        </>
      )}
      <button
        type="button"
        onClick={() => downloadProjectCsv(project)}
        data-testid="export-csv"
        title="Planilha com todos os itens do projeto"
      >
        Exportar planilha (CSV)
      </button>
    </section>
  )
}

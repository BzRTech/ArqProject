import { itemTotalCents } from '@/core/project/markers'
import { ITEM_UNITS, type Item, type ItemUnit } from '@/core/project/schema'
import { formatBRL } from '@/core/units'
import { MoneyField, QtyField, TextField } from './fields'
import { useEditor } from './store'

/** Legenda e orçamento de um item: marcador, quantidade, preço, fornecedor, aprovação. */
export function BudgetFields({ item, marker }: { item: Item; marker: string | undefined }) {
  const s = useEditor.getState()
  const up = (patch: Partial<Item>) => s.updateItem(item.id, patch)
  return (
    <section data-testid="budget-fields">
      <h2>
        Legenda e orçamento
        {marker && (
          <span
            className={`marker-chip ${marker.startsWith('M') ? 'marker-chip--m' : ''}`}
            data-testid="item-marker"
          >
            {marker}
          </span>
        )}
      </h2>
      <div className="check-grid">
        <label className="check">
          <input
            type="checkbox"
            checked={item.inLegend}
            onChange={(e) => up({ inLegend: e.target.checked })}
            data-testid="item-in-legend"
          />
          Na legenda
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={item.showMarker}
            disabled={!item.inLegend}
            onChange={(e) => up({ showMarker: e.target.checked })}
            data-testid="item-show-marker"
          />
          Marcador na planta
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={item.existing}
            onChange={(e) => up({ existing: e.target.checked })}
            data-testid="item-existing"
          />
          Existente
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={item.approved}
            onChange={(e) => up({ approved: e.target.checked })}
            data-testid="item-approved"
          />
          Aprovado
        </label>
      </div>
      {item.markerOffset && (
        <button type="button" className="link" onClick={() => up({ markerOffset: undefined })}>
          Recentralizar o marcador
        </button>
      )}
      <p className="muted small">Arraste o balão na planta para tirá-lo de cima do desenho.</p>
      <div className="field-row">
        <QtyField
          label="Quantidade"
          value={item.qty}
          onCommit={(qty) => up({ qty })}
          testId="item-qty"
        />
        <label className="field">
          <span>Unidade</span>
          <select
            value={item.unit}
            onChange={(e) => up({ unit: e.target.value as ItemUnit })}
            data-testid="item-unit"
          >
            {ITEM_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MoneyField
        label="Preço unitário"
        cents={item.unitPriceCents}
        onCommit={(unitPriceCents) => up({ unitPriceCents })}
        testId="item-price"
      />
      <p className="total-line" data-testid="item-total">
        Total do item:{' '}
        <strong>
          {item.existing
            ? 'existente'
            : item.unitPriceCents === undefined
              ? '—'
              : formatBRL(itemTotalCents(item))}
        </strong>
      </p>
      <TextField
        label="Marca / modelo"
        value={item.brandModel ?? ''}
        onCommit={(v) => up({ brandModel: v || undefined })}
        testId="item-brand"
      />
      <TextField
        label="Fornecedor"
        value={item.supplier ?? ''}
        onCommit={(v) => up({ supplier: v || undefined })}
        testId="item-supplier"
      />
      <TextField
        label="Especificação / observação"
        value={item.notes ?? ''}
        onCommit={(v) => up({ notes: v || undefined })}
      />
    </section>
  )
}

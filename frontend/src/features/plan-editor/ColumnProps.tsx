import { RotateCcw, RotateCw } from 'lucide-react'
import type { Column } from '@/core/project/schema'
import { formatDecimal } from '@/core/units'
import { LengthField, TextField } from './fields'
import { useEditor } from './store'
import { useUnits } from './units-pref'

/** Painel do pilar: formato, seção e rotação. */
export function ColumnProps({ d }: { d: Column }) {
  const unit = useUnits((u) => u.item)
  const s = useEditor.getState()
  const round = d.shape === 'circle'
  return (
    <section data-testid="column-props">
      <h2>Pilar</h2>
      <p className="muted small">
        Desenhado cheio, como seção de estrutura cortada, por cima das paredes. Num canto ou numa
        parede ele entra centrado no eixo.
      </p>
      <label className="field">
        <span>Formato</span>
        <select
          value={d.shape}
          onChange={(e) => s.updateDrawing(d.id, { shape: e.target.value as Column['shape'] })}
          data-testid="column-shape"
        >
          <option value="rect">Retangular</option>
          <option value="circle">Circular</option>
        </select>
      </label>
      <div className="field-row">
        <LengthField
          label={round ? 'Diâmetro' : 'Largura'}
          unit={unit}
          value={d.widthMm}
          onCommit={(widthMm) => s.updateDrawing(d.id, { widthMm })}
          testId="column-w"
        />
        {!round && (
          <LengthField
            label="Profundidade"
            unit={unit}
            value={d.depthMm}
            onCommit={(depthMm) => s.updateDrawing(d.id, { depthMm })}
            testId="column-d"
          />
        )}
      </div>
      {!round && (
        <>
          <TextField
            label="Rotação (°)"
            value={formatDecimal(d.rotationDeg, 1)}
            onCommit={(v) => {
              const deg = Number(v.replace(',', '.'))
              if (Number.isFinite(deg)) s.updateDrawing(d.id, { rotationDeg: deg })
            }}
            testId="column-rotation"
          />
          <div className="button-row">
            <button type="button" onClick={() => s.rotateSelection(-90)} title="Shift+R">
              <RotateCcw size={14} strokeWidth={1.5} />
              90°
            </button>
            <button type="button" onClick={() => s.rotateSelection(90)} title="R">
              <RotateCw size={14} strokeWidth={1.5} />
              90°
            </button>
          </div>
        </>
      )}
      <div className="button-row">
        <button type="button" onClick={() => s.duplicateSelection()} title="Ctrl+D">
          Duplicar
        </button>
        <button type="button" className="danger" onClick={() => s.deleteSelection()}>
          Excluir
        </button>
      </div>
    </section>
  )
}

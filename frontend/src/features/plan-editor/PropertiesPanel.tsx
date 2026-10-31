import { useState } from 'react'
import { getBlock } from '@/core/blocks/catalog'
import { distance } from '@/core/geometry/vec'
import { calibrateBasePlan } from '@/core/project/base-plan'
import type { Drawing, Environment, Item } from '@/core/project/schema'
import { formatCm, formatDecimal, parseCm } from '@/core/units'
import { CmField, TextField } from './fields'
import { selectActiveEnv, useEditor } from './store'

function ItemProps({ item }: { item: Item }) {
  const s = useEditor.getState()
  const block = getBlock(item.blockId)
  return (
    <section data-testid="item-props">
      <h2>{block.name}</h2>
      <p className="muted">
        {block.category} · {block.discipline === 'marcenaria' ? 'Marcenaria' : 'Layout'}
        {block.joinery && <span className="badge">detalhável</span>}
      </p>
      <TextField
        label="Nome"
        value={item.name}
        onCommit={(name) => s.updateItem(item.id, { name })}
        testId="item-name"
      />
      <div className="field-row">
        <CmField
          label="Largura (L)"
          value={item.sizeMm.w}
          onCommit={(w) => s.updateItem(item.id, { sizeMm: { ...item.sizeMm, w } })}
          testId="item-w"
        />
        <CmField
          label="Profund. (P)"
          value={item.sizeMm.d}
          onCommit={(d) => s.updateItem(item.id, { sizeMm: { ...item.sizeMm, d } })}
          testId="item-d"
        />
      </div>
      <p className="muted small">
        Mínimo {formatCm(block.minSize.w)} × {formatCm(block.minSize.d)} cm
      </p>
      <TextField
        label="Rotação (°)"
        value={formatDecimal(item.rotationDeg, 0)}
        onCommit={(v) => {
          const deg = Number(v.replace(',', '.'))
          if (Number.isFinite(deg)) s.updateItem(item.id, { rotationDeg: deg })
        }}
        testId="item-rotation"
      />
      <div className="button-row">
        <button type="button" onClick={() => s.rotateSelection(-90)} title="Shift+R">
          ⟲ 90°
        </button>
        <button type="button" onClick={() => s.rotateSelection(90)} title="R" data-testid="rotate">
          ⟳ 90°
        </button>
        <button
          type="button"
          onClick={() => s.mirrorSelection()}
          title="M"
          aria-pressed={item.mirrored}
        >
          Espelhar
        </button>
      </div>
      <div className="button-row">
        <button type="button" onClick={() => s.duplicateSelection()} title="Ctrl+D">
          Duplicar
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => s.deleteSelection()}
          title="Delete"
          data-testid="delete"
        >
          Excluir
        </button>
      </div>
      {block.joinery && (
        <p className="note">
          Na Fase 8 este bloco abre o <strong>detalhamento de marcenaria</strong> (módulos, portas,
          puxadores) e gera as pranchas de detalhe.
        </p>
      )}
    </section>
  )
}

function DrawingProps({ d }: { d: Drawing }) {
  const s = useEditor.getState()
  if (d.kind === 'wall') {
    const n = d.closed ? d.points.length : d.points.length - 1
    let len = 0
    for (let i = 0; i < n; i++) len += distance(d.points[i]!, d.points[(i + 1) % d.points.length]!)
    return (
      <section data-testid="wall-props">
        <h2>Parede</h2>
        <CmField
          label="Espessura"
          value={d.thicknessMm}
          onCommit={(thicknessMm) => s.updateDrawing(d.id, { thicknessMm })}
        />
        <p className="muted">
          {n} trecho(s) · eixo {formatDecimal(len / 1000, 2)} m{d.closed ? ' · fechada' : ''}
        </p>
        <button type="button" className="danger" onClick={() => s.deleteSelection()}>
          Excluir
        </button>
      </section>
    )
  }
  if (d.kind === 'dimension') {
    return (
      <section>
        <h2>Cota</h2>
        <p className="muted">
          {formatCm(Math.round(distance(d.p1, d.p2)), { unit: true })} ·{' '}
          {d.orientation === 'aligned' ? 'alinhada' : d.orientation}
        </p>
        <CmField
          label="Afastamento"
          value={d.offsetMm}
          allowZero
          onCommit={(offsetMm) => s.updateDrawing(d.id, { offsetMm })}
        />
        <button type="button" className="danger" onClick={() => s.deleteSelection()}>
          Excluir
        </button>
      </section>
    )
  }
  return (
    <section>
      <h2>Texto</h2>
      <TextField
        label="Texto"
        value={d.text}
        autoFocus
        onCommit={(text) => s.updateDrawing(d.id, { text })}
        testId="text-value"
      />
      <label className="field">
        <span>Corpo (mm no papel)</span>
        <select
          value={d.sizeMm}
          onChange={(e) => s.updateDrawing(d.id, { sizeMm: Number(e.target.value) })}
        >
          {[1.8, 2, 2.5, 3, 3.5, 5, 7].map((v) => (
            <option key={v} value={v}>
              {formatDecimal(v, 1)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="danger" onClick={() => s.deleteSelection()}>
        Excluir
      </button>
    </section>
  )
}

function BasePlanProps({ env }: { env: Environment }) {
  const tool = useEditor((s) => s.tool)
  const calibration = useEditor((s) => s.calibration)
  const s = useEditor.getState()
  const [real, setReal] = useState('')
  const bp = env.basePlan
  if (!bp) {
    return (
      <section>
        <h2>Planta base</h2>
        <p className="muted small">
          Importe uma imagem da planta (botão “Importar planta”), calibre com uma medida conhecida e
          desenhe por cima.
        </p>
      </section>
    )
  }
  const ready = calibration.length === 2
  return (
    <section data-testid="base-plan-props">
      <h2>Planta base</h2>
      <p className="muted small">
        {bp.calibrated ? 'Calibrada.' : 'Ainda não calibrada: as medidas podem estar erradas.'}
      </p>
      <label className="field">
        <span>Opacidade</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={bp.opacity}
          onChange={(e) => s.updateBasePlan({ opacity: Number(e.target.value) })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={bp.visible}
          onChange={(e) => s.updateBasePlan({ visible: e.target.checked })}
        />
        Visível
      </label>
      {tool !== 'calibrate' ? (
        <button
          type="button"
          onClick={() => s.setTool('calibrate')}
          data-testid="start-calibration"
        >
          Calibrar escala
        </button>
      ) : (
        <div className="calibrate">
          <p className="small">
            {calibration.length < 2
              ? `Clique em dois pontos da planta com medida conhecida (${calibration.length}/2).`
              : 'Informe a distância real entre os dois pontos.'}
          </p>
          <div className="field-row">
            <label className="field">
              <span>Distância real</span>
              <span className="field__input">
                <input
                  value={real}
                  onChange={(e) => setReal(e.target.value)}
                  disabled={!ready}
                  data-testid="calibration-real"
                />
                <small>cm</small>
              </span>
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary"
              disabled={!ready || !parseCm(real)}
              data-testid="apply-calibration"
              onClick={() => {
                const mm = parseCm(real)
                if (!mm || !ready) return
                s.setBasePlan(calibrateBasePlan(bp, calibration[0]!, calibration[1]!, mm))
                setReal('')
                s.setTool('select')
              }}
            >
              Aplicar
            </button>
            <button type="button" onClick={() => s.setTool('select')}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <button type="button" className="danger" onClick={() => s.setBasePlan(null)}>
        Remover planta base
      </button>
    </section>
  )
}

function EnvironmentSummary({ env }: { env: Environment }) {
  const s = useEditor.getState()
  return (
    <section data-testid="env-summary">
      <h2>Itens do ambiente</h2>
      {env.items.length === 0 ? (
        <p className="muted small">Clique num bloco à esquerda e depois na planta (ou arraste).</p>
      ) : (
        <ol className="item-list">
          {env.items.map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => s.select({ kind: 'item', id: it.id })}>
                <span>{it.name}</span>
                <small>
                  {formatCm(it.sizeMm.w)} × {formatCm(it.sizeMm.d)}
                </small>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function PropertiesPanel() {
  const env = useEditor(selectActiveEnv)
  const selection = useEditor((s) => s.selection)
  const item = selection?.kind === 'item' ? env.items.find((i) => i.id === selection.id) : undefined
  const drawing =
    selection?.kind === 'drawing' ? env.drawings.find((d) => d.id === selection.id) : undefined
  return (
    <aside className="panel panel--props" data-testid="properties">
      {item && <ItemProps key={item.id} item={item} />}
      {drawing && <DrawingProps key={drawing.id} d={drawing} />}
      {!item && !drawing && <EnvironmentSummary env={env} />}
      <BasePlanProps env={env} />
    </aside>
  )
}

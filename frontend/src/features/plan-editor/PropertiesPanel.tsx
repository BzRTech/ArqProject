import { ImageUp } from 'lucide-react'
import { useState } from 'react'
import { getBlock } from '@/core/blocks/catalog'
import { distance } from '@/core/geometry/vec'
import { areaM2Text, areaPerimeterMm, innerFacePolygon } from '@/core/project/areas'
import { computeLegend } from '@/core/project/markers'
import { calibrateBasePlan } from '@/core/project/base-plan'
import { setSegmentLengthLinked } from '@/core/project/wall-edit'
import { wallSegments } from '@/core/project/walls'
import {
  OPENING_DEFS,
  openingClearances,
  openingDef,
  openingFrame,
  segmentCenterOffset,
} from '@/core/project/openings'
import type { Drawing, Environment, Item, Opening, OpeningType, Wall } from '@/core/project/schema'
import { formatDecimal, formatLength, parseLength, UNIT_LABEL } from '@/core/units'
import { isJoineryBlock } from '@/core/joinery/finish'
import { BudgetFields } from './BudgetFields'
import { JoineryDesignPanel } from './JoineryDesignPanel'
import { JoineryFinishPanel } from './JoineryFinishPanel'
import { JoineryList } from './JoineryList'
import { PranchasPanel } from './PranchasPanel'
import { StageChecklist } from './StageChecklist'
import { ColumnProps } from './ColumnProps'
import { importBasePlan } from './base-plan-import'
import { LengthField, TextField } from './fields'
import { useUnits } from './units-pref'
import { FloorFields } from './FloorFields'
import { ItemsSummary } from './ItemsSummary'
import { MultiSelectionProps } from './MultiSelectionProps'
import { selectActiveEnv, useEditor } from './store'

function ItemProps({ item }: { item: Item }) {
  const u = useUnits()
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
        <LengthField
          label="Largura (L)"
          unit={u.item}
          value={item.sizeMm.w}
          onCommit={(w) => s.updateItem(item.id, { sizeMm: { ...item.sizeMm, w } })}
          testId="item-w"
        />
        <LengthField
          label="Profund. (P)"
          unit={u.item}
          value={item.sizeMm.d}
          onCommit={(d) => s.updateItem(item.id, { sizeMm: { ...item.sizeMm, d } })}
          testId="item-d"
        />
      </div>
      <p className="muted small">
        Mínimo {formatLength(block.minSize.w, u.item)} × {formatLength(block.minSize.d, u.item)}{' '}
        {UNIT_LABEL[u.item]}
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
        <button
          type="button"
          onClick={() => s.addItemDims([item.id])}
          title="Distância de cada lado do móvel até a parede; acompanha quando o móvel anda"
          data-testid="item-dims"
        >
          Cotar posição
        </button>
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
    </section>
  )
}

function ItemWithBudget({ item, env }: { item: Item; env: Environment }) {
  const marker = computeLegend(env).labelOf.get(item.id)
  return (
    <>
      <ItemProps item={item} />
      <BudgetFields item={item} marker={marker} />
    </>
  )
}

function WallProps({ wall }: { wall: Wall }) {
  const u = useUnits()
  const s = useEditor.getState()
  const env = useEditor(selectActiveEnv)
  const n = wall.closed ? wall.points.length : wall.points.length - 1
  let len = 0
  for (let i = 0; i < n; i++)
    len += distance(wall.points[i]!, wall.points[(i + 1) % wall.points.length]!)
  const own = env.openings.filter((o) => o.wallId === wall.id)
  return (
    <section data-testid="wall-props">
      <h2>Parede</h2>
      <LengthField
        label="Espessura"
        unit="cm"
        value={wall.thicknessMm}
        onCommit={(thicknessMm) => s.updateDrawing(wall.id, { thicknessMm })}
      />
      <p className="muted">
        {n} trecho(s) · eixo {formatDecimal(len / 1000, 2)} m{wall.closed ? ' · fechada' : ''}
        {own.length ? ` · ${own.length} vão(s)` : ''}
      </p>
      <div className="button-row">
        <button
          type="button"
          data-testid="auto-dims"
          title="Por fora: uma cota em cadeia por trecho, com portas e janelas. Por dentro: a medida útil (de face a face). As cotas acompanham a parede quando ela muda."
          onClick={() => s.addWallDims(wall.id)}
        >
          Cotar parede
        </button>
        {wall.closed && (
          <button
            type="button"
            data-testid="wall-area"
            title="Área pelas faces internas, com o nome do ambiente"
            onClick={() => {
              const poly = innerFacePolygon(wall)
              if (poly) s.addArea(poly, env.name)
            }}
          >
            Criar área do ambiente
          </button>
        )}
        <button type="button" className="danger" onClick={() => s.deleteSelection()}>
          Excluir
        </button>
      </div>
      <h3>Trechos (eixo)</h3>
      <ol className="segment-list" data-testid="wall-segments">
        {wallSegments(wall).map((sg) => (
          <li key={sg.index}>
            <LengthField
              label={`Trecho ${sg.index + 1}`}
              value={Math.round(sg.length)}
              unit={u.wall}
              onCommit={(len) =>
                s.editWalls((ws) => setSegmentLengthLinked(ws, wall.id, sg.index, len))
              }
              testId={`wall-seg-${sg.index}`}
            />
          </li>
        ))}
      </ol>
      <p className="muted small">
        Arraste os <strong>quadrados</strong> (cantos) ou os <strong>círculos</strong> (meio da
        parede, empurra o trecho). Duplo clique na parede cria um canto; duplo clique num canto o
        remove. Digitar o comprimento de um trecho muda só este cômodo: anda a parede do lado que
        não é compartilhado (o retângulo continua retângulo). Para mover uma parede compartilhada
        junto com o vizinho, arraste o círculo dela.
      </p>
      <p className="muted small">Excluir a parede remove as portas e janelas dela.</p>
    </section>
  )
}

function OpeningProps({ opening: o, env }: { opening: Opening; env: Environment }) {
  const u = useUnits()
  const s = useEditor.getState()
  const def = openingDef(o.type)
  const wall = env.drawings.find((d): d is Wall => d.kind === 'wall' && d.id === o.wallId)
  const f = wall && openingFrame(wall, o)
  const isDoor = def.kind === 'door'
  const clear = wall ? openingClearances(wall, o) : null
  return (
    <section data-testid="opening-props">
      <h2>{isDoor ? 'Porta' : 'Janela'}</h2>
      <label className="field">
        <span>Tipo</span>
        <select
          value={o.type}
          data-testid="opening-type"
          onChange={(e) => s.updateOpening(o.id, { type: e.target.value as OpeningType })}
        >
          {OPENING_DEFS.filter((x) => x.kind === def.kind).map((x) => (
            <option key={x.type} value={x.type}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div className="field-row">
        <LengthField
          label="Largura"
          unit={u.item}
          value={o.widthMm}
          onCommit={(widthMm) => s.updateOpening(o.id, { widthMm })}
          testId="opening-w"
        />
        <LengthField
          label="Altura"
          unit={u.item}
          value={o.heightMm}
          onCommit={(heightMm) => s.updateOpening(o.id, { heightMm })}
        />
      </div>
      {!isDoor && (
        <LengthField
          label="Peitoril"
          unit={u.item}
          value={o.sillMm}
          allowZero
          onCommit={(sillMm) => s.updateOpening(o.id, { sillMm })}
        />
      )}
      {f && (
        <LengthField
          label="Distância do início do trecho (eixo)"
          unit={u.wall}
          value={Math.round(f.offset - f.width / 2)}
          allowZero
          onCommit={(edge) => s.updateOpening(o.id, { offsetMm: edge + f.width / 2 })}
          testId="opening-edge"
        />
      )}
      {wall && clear && (
        <p className="small" data-testid="opening-clearances">
          Livre até as paredes: <strong>{formatLength(clear.start, u.wall)}</strong> |{' '}
          <strong>{formatLength(clear.end, u.wall)}</strong> {UNIT_LABEL[u.wall]}
        </p>
      )}
      {wall && (
        <button
          type="button"
          data-testid="opening-center"
          onClick={() => {
            const c = segmentCenterOffset(wall, o.segment)
            if (c !== null) s.updateOpening(o.id, { offsetMm: Math.round(c) })
          }}
        >
          Centralizar no trecho
        </button>
      )}
      <div className="button-row">
        <button
          type="button"
          onClick={() => s.rotateSelection(90)}
          title="R"
          data-testid="opening-flip-side"
        >
          {isDoor ? 'Abrir para o outro lado' : 'Trocar lado externo'}
        </button>
        {isDoor && (
          <button
            type="button"
            onClick={() => s.mirrorSelection()}
            title="M"
            data-testid="opening-flip-hinge"
          >
            {o.type === 'porta-correr' ? 'Inverter sentido' : 'Inverter dobradiça'}
          </button>
        )}
      </div>
      <div className="button-row">
        <button type="button" onClick={() => s.duplicateSelection()} title="Ctrl+D">
          Duplicar
        </button>
        <button type="button" className="danger" onClick={() => s.deleteSelection()}>
          Excluir
        </button>
      </div>
      <p className="muted small">Arraste para deslizar pela parede.</p>
    </section>
  )
}

function ToolOptions() {
  const u = useUnits()
  const tool = useEditor((s) => s.tool)
  const roomSize = useEditor((s) => s.roomSize)
  const thickness = useEditor((s) => s.wallThicknessMm)
  const s = useEditor.getState()
  if (tool === 'room') {
    return (
      <section data-testid="room-options">
        <h2>Ambiente retangular</h2>
        <p className="muted small">Medidas INTERNAS (de face a face), como na medição da obra.</p>
        <div className="field-row">
          <LengthField
            label="Largura"
            unit={u.wall}
            value={roomSize.w}
            onCommit={(w) => s.setRoomSize({ ...roomSize, w })}
            testId="room-w"
          />
          <LengthField
            label="Profundidade"
            unit={u.wall}
            value={roomSize.d}
            onCommit={(d) => s.setRoomSize({ ...roomSize, d })}
            testId="room-d"
          />
        </div>
        <LengthField
          label="Espessura das paredes"
          unit="cm"
          value={thickness}
          onCommit={(mm) => s.setWallThickness(mm)}
          testId="room-t"
        />
        <p className="note">Clique na planta para posicionar o canto interno superior esquerdo.</p>
      </section>
    )
  }
  if (tool === 'wall') {
    return (
      <section>
        <h2>Parede</h2>
        <p className="small">
          Clique o primeiro ponto e <strong>digite o comprimento em {UNIT_LABEL[u.wall]}</strong>{' '}
          (ex.: {u.wall === 'm' ? '3,5' : '350'}) + Enter; a direção segue o mouse. Clique no
          primeiro ponto para fechar. Os cantos de qualquer parede podem ser arrastados direto.
        </p>
      </section>
    )
  }
  if (tool === 'opening') {
    return (
      <section>
        <h2>Porta / janela</h2>
        <p className="small">
          Aproxime de uma parede e clique. O lado em que está o cursor define para onde abre.
        </p>
      </section>
    )
  }
  return null
}

function DrawingProps({ d }: { d: Drawing }) {
  const env = useEditor(selectActiveEnv)
  const u = useUnits()
  const s = useEditor.getState()
  if (d.kind === 'wall') return <WallProps wall={d} />
  if (d.kind === 'column') return <ColumnProps d={d} />
  if (d.kind === 'chain') {
    return (
      <section>
        <h2>Cota em cadeia</h2>
        <p className="muted">{d.points.length - 1} vão(s)</p>
        <LengthField
          label="Afastamento"
          unit={u.wall}
          value={d.offsetMm}
          allowZero
          onCommit={(offsetMm) => s.updateDrawing(d.id, { offsetMm })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={d.total}
            onChange={(e) => s.updateDrawing(d.id, { total: e.target.checked })}
          />
          Linha de total
        </label>
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
          {formatLength(Math.round(distance(d.p1, d.p2)), u.wall)} {UNIT_LABEL[u.wall]} ·{' '}
          {d.orientation === 'aligned' ? 'alinhada' : d.orientation}
        </p>
        <LengthField
          label="Afastamento"
          unit={u.wall}
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
  if (d.kind === 'area') {
    return (
      <>
        <section data-testid="area-props">
          <h2>Área</h2>
          <p className="area-value" data-testid="area-value">
            {areaM2Text(d)}
          </p>
          <p className="muted small">Perímetro {formatDecimal(areaPerimeterMm(d) / 1000, 2)} m</p>
          <TextField
            label="Nome"
            value={d.name}
            onCommit={(name) => s.updateDrawing(d.id, { name })}
            testId="area-name"
          />
          <button type="button" className="danger" onClick={() => s.deleteSelection()}>
            Excluir
          </button>
        </section>
        <FloorFields area={d} env={env} />
      </>
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

/** Área para soltar (ou escolher) a imagem da planta base. */
function BasePlanDropzone() {
  const [over, setOver] = useState(false)
  const take = (f: File | undefined) => {
    if (f && f.type.startsWith('image/')) void importBasePlan(f)
  }
  return (
    <label
      className="dropzone"
      style={over ? { borderColor: 'var(--ink)' } : undefined}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        take(e.dataTransfer.files[0])
      }}
      data-testid="base-plan-dropzone"
    >
      <ImageUp size={20} strokeWidth={1.5} />
      <strong>Arraste a imagem da planta</strong>
      <span>
        Ou clique para escolher. Depois calibre com uma medida conhecida e desenhe por cima.
      </span>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          take(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </label>
  )
}

function BasePlanProps({ env }: { env: Environment }) {
  const u = useUnits()
  const tool = useEditor((s) => s.tool)
  const calibration = useEditor((s) => s.calibration)
  const s = useEditor.getState()
  const [real, setReal] = useState('')
  const bp = env.basePlan
  if (!bp) {
    return (
      <section>
        <h2>Planta base</h2>
        <BasePlanDropzone />
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
                <small>{UNIT_LABEL[u.wall]}</small>
              </span>
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary"
              disabled={!ready || !parseLength(real, u.wall)}
              data-testid="apply-calibration"
              onClick={() => {
                const mm = parseLength(real, u.wall)
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

export function PropertiesPanel() {
  const env = useEditor(selectActiveEnv)
  const selection = useEditor((s) => s.selection)
  const many = useEditor((s) => s.selected.length > 1)
  const item = selection?.kind === 'item' ? env.items.find((i) => i.id === selection.id) : undefined
  const opening =
    selection?.kind === 'opening' ? env.openings.find((o) => o.id === selection.id) : undefined
  const drawing =
    selection?.kind === 'drawing' ? env.drawings.find((d) => d.id === selection.id) : undefined
  const stage = useEditor((s) => s.stage)
  const nothing = !many && !item && !drawing && !opening
  // Pranchas só mostra a folha: o painel é sempre o da prancha (nada se edita aqui).
  if (stage === 'pranchas')
    return (
      <aside className="panel panel--props" data-testid="properties">
        <StageChecklist />
        <PranchasPanel env={env} />
      </aside>
    )
  const joineryItem = item && stage === 'marcenaria' && isJoineryBlock(item.blockId)
  return (
    <aside className="panel panel--props" data-testid="properties">
      <StageChecklist />
      <ToolOptions />
      {many && <MultiSelectionProps env={env} />}
      {joineryItem && <JoineryDesignPanel key={`d-${item.id}`} item={item} />}
      {joineryItem && <JoineryFinishPanel key={`f-${item.id}`} item={item} />}
      {item && <ItemWithBudget key={item.id} item={item} env={env} />}
      {opening && <OpeningProps key={opening.id} opening={opening} env={env} />}
      {drawing && <DrawingProps key={drawing.id} d={drawing} />}
      {nothing && stage === 'layout' && <ItemsSummary env={env} />}
      {nothing && stage === 'marcenaria' && <JoineryList env={env} />}
      {nothing && stage === 'piso' && (
        <>
          <p className="muted small">
            Selecione uma área (à esquerda ou na planta) para escolher o piso.
          </p>
          <ItemsSummary env={env} />
        </>
      )}
      {stage === 'planta' && <BasePlanProps env={env} />}
    </aside>
  )
}

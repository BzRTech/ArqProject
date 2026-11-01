import { useRef, useState } from 'react'
import { useStore } from 'zustand'
import { formatCm, parseCm } from '@/core/units'
import { exportProjectPdf } from './export-pdf'
import { imageSize, putAsset, readFileAsDataUrl } from './persistence'
import { rememberAsset } from './hooks'
import { newId, redo, selectActiveEnv, undo, useEditor, type Tool } from './store'
import { useUnits } from './units-pref'

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Selecionar', key: 'V' },
  { id: 'wall', label: 'Parede', key: 'W' },
  { id: 'room', label: 'Ambiente', key: 'A' },
  { id: 'area', label: 'Área', key: 'Q' },
  { id: 'dimension', label: 'Cota', key: 'C' },
  { id: 'text', label: 'Texto', key: 'T' },
]

export function Toolbar({ onFit }: { onFit: () => void }) {
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  const openingType = useEditor((s) => (s.tool === 'opening' ? s.placeOpeningType : null))
  const startOpening = useEditor((s) => s.startOpening)
  const thickness = useEditor((s) => s.wallThicknessMm)
  const setThickness = useEditor((s) => s.setWallThickness)
  const canUndo = useStore(useEditor.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useEditor.temporal, (s) => s.futureStates.length > 0)
  const fileRef = useRef<HTMLInputElement>(null)
  const units = useUnits()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function importBasePlan(file: File) {
    const dataUrl = await readFileAsDataUrl(file)
    const { width, height } = await imageSize(dataUrl)
    const assetId = newId()
    await putAsset(assetId, dataUrl)
    rememberAsset(assetId, dataUrl)
    // Tamanho provisório: 10 m de largura. A calibração acerta a escala real.
    const widthMm = 10000
    useEditor.getState().setBasePlan({
      assetId,
      x: 0,
      y: 0,
      widthMm,
      heightMm: (widthMm * height) / width,
      opacity: 0.6,
      locked: true,
      visible: true,
      calibrated: false,
    })
    useEditor.getState().setTool('calibrate')
    onFit()
  }

  async function pdf() {
    setBusy(true)
    setMessage(null)
    try {
      const r = await exportProjectPdf(useEditor.getState().project)
      setMessage(`PDF: ${r.pages} prancha(s) · escala ${r.scales.map((s) => `1:${s}`).join(', ')}`)
    } catch (e) {
      setMessage(`Erro ao gerar PDF: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editor-toolbar" role="toolbar">
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tool === t.id ? 'is-active' : ''}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.key})`}
            data-testid={`tool-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tool-group">
        <button
          type="button"
          className={openingType?.startsWith('porta') ? 'is-active' : ''}
          onClick={() => startOpening('porta-abrir')}
          title="Porta (P) — clique sobre uma parede"
          data-testid="tool-door"
        >
          Porta
        </button>
        <button
          type="button"
          className={openingType?.startsWith('janela') ? 'is-active' : ''}
          onClick={() => startOpening('janela-correr-2')}
          title="Janela (J) — clique sobre uma parede"
          data-testid="tool-window"
        >
          Janela
        </button>
      </div>
      {tool === 'wall' && (
        <label className="inline-field">
          Espessura
          <input
            key={thickness}
            defaultValue={formatCm(thickness)}
            size={4}
            onBlur={(e) => {
              const v = parseCm(e.target.value)
              if (v) setThickness(v)
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            data-testid="wall-thickness"
          />
          cm
        </label>
      )}
      <div className="tool-group">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          data-testid="undo"
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Refazer (Ctrl+Shift+Z)"
          data-testid="redo"
        >
          Refazer
        </button>
        <button type="button" onClick={onFit} title="Enquadrar (F)">
          Enquadrar
        </button>
      </div>
      <div className="tool-group">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          data-testid="import-base-plan"
        >
          Importar planta
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          data-testid="base-plan-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importBasePlan(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="primary"
          onClick={pdf}
          disabled={busy}
          data-testid="export-pdf"
          title="Uma prancha A3 por ambiente, na maior escala que couber"
        >
          {busy ? 'Gerando…' : 'Baixar PDF'}
        </button>
      </div>
      <div
        className="tool-group units-group"
        title="Unidades de digitação e exibição (o desenho é sempre exato, em mm)"
      >
        <label className="inline-field">
          Paredes
          <select
            value={units.wall}
            onChange={(e) => units.setWall(e.target.value as 'm' | 'cm')}
            data-testid="unit-wall"
          >
            <option value="m">m</option>
            <option value="cm">cm</option>
          </select>
        </label>
        <label className="inline-field">
          Móveis
          <select
            value={units.item}
            onChange={(e) => units.setItem(e.target.value as 'cm' | 'mm')}
            data-testid="unit-item"
          >
            <option value="cm">cm</option>
            <option value="mm">mm</option>
          </select>
        </label>
      </div>
      {message && (
        <span className="toolbar-message" data-testid="toolbar-message">
          {message}
        </span>
      )}
    </div>
  )
}

export function EnvTabs() {
  const project = useEditor((s) => s.project)
  const active = useEditor(selectActiveEnv)
  const { setActiveEnv, addEnvironment, renameEnvironment, removeEnvironment, renameProject } =
    useEditor.getState()
  return (
    <div className="env-tabs" data-testid="env-tabs">
      <input
        className="project-name"
        key={project.name}
        defaultValue={project.name}
        aria-label="Nome do projeto"
        onBlur={(e) => renameProject(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {project.environments.map((e) => (
        <button
          key={e.id}
          type="button"
          className={`env-tab ${e.id === active.id ? 'is-active' : ''}`}
          onClick={() => setActiveEnv(e.id)}
          onDoubleClick={() => {
            const name = window.prompt('Nome do ambiente', e.name)
            if (name) renameEnvironment(e.id, name)
          }}
          title="Duplo clique para renomear"
        >
          {e.name}
          <span className="env-tab__count">{e.items.length}</span>
        </button>
      ))}
      <button
        type="button"
        className="env-tab env-tab--add"
        onClick={() => addEnvironment()}
        data-testid="add-env"
      >
        + Ambiente
      </button>
      {project.environments.length > 1 && (
        <button
          type="button"
          className="env-tab env-tab--remove"
          onClick={() => {
            if (window.confirm(`Excluir o ambiente "${active.name}"?`)) removeEnvironment(active.id)
          }}
        >
          Excluir ambiente
        </button>
      )}
    </div>
  )
}

import {
  AppWindow,
  BrickWall,
  DoorOpen,
  Maximize,
  MousePointer2,
  Redo2,
  Ruler,
  Scan,
  Square,
  SquareSquare,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from 'zustand'
import { formatCm, parseCm } from '@/core/units'
import { STAGE_TOOLS } from '@/core/editor/stages'
import { redo, undo, useEditor, type Tool } from './store'

const TOOLS: { id: Tool; label: string; key: string; icon: LucideIcon }[] = [
  { id: 'select', label: 'Selecionar', key: 'V', icon: MousePointer2 },
  { id: 'wall', label: 'Parede', key: 'W', icon: BrickWall },
  { id: 'room', label: 'Ambiente', key: 'A', icon: Square },
  { id: 'area', label: 'Área', key: 'Q', icon: Scan },
  { id: 'dimension', label: 'Cota', key: 'C', icon: Ruler },
  { id: 'text', label: 'Texto', key: 'T', icon: Type },
]

const ICON = { size: 16, strokeWidth: 1.5 }

/** Botão de ferramenta: só o ícone; a ativa mostra também o rótulo. */
function ToolButton({
  icon: Icon,
  label,
  title,
  active,
  ...rest
}: {
  icon: LucideIcon
  label: string
  title: string
  active?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement> & { 'data-testid'?: string }) {
  return (
    <button
      type="button"
      className={`tool ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      aria-label={label}
      title={title}
      {...rest}
    >
      <Icon {...ICON} />
      {active && <span>{label}</span>}
    </button>
  )
}

/** Barra de ferramentas flutuante, no rodapé da área de desenho. */
export function Toolbar({ onFit }: { onFit: () => void }) {
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  const openingType = useEditor((s) => (s.tool === 'opening' ? s.placeOpeningType : null))
  const startOpening = useEditor((s) => s.startOpening)
  const thickness = useEditor((s) => s.wallThicknessMm)
  const setThickness = useEditor((s) => s.setWallThickness)
  const stage = useEditor((s) => s.stage)
  const has = (id: string) => STAGE_TOOLS[stage].includes(id)
  const canUndo = useStore(useEditor.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useEditor.temporal, (s) => s.futureStates.length > 0)

  return (
    <div className="editor-toolbar float" role="toolbar" aria-label="Ferramentas">
      <div className="tool-group">
        {TOOLS.filter((t) => has(t.id)).map((t) => (
          <ToolButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            title={`${t.label} (${t.key})`}
            active={tool === t.id}
            onClick={() => setTool(t.id)}
            data-testid={`tool-${t.id}`}
          />
        ))}
      </div>
      {(has('door') || has('window') || has('column')) && (
        <div className="tool-group">
          <ToolButton
            icon={DoorOpen}
            label="Porta"
            title="Porta (P): clique sobre uma parede"
            active={!!openingType?.startsWith('porta')}
            onClick={() => startOpening('porta-abrir')}
            data-testid="tool-door"
          />
          <ToolButton
            icon={SquareSquare}
            label="Pilar"
            title="Pilar (L): clique num canto ou numa parede"
            active={tool === 'column'}
            onClick={() => setTool('column')}
            data-testid="tool-column"
          />
          <ToolButton
            icon={AppWindow}
            label="Janela"
            title="Janela (J): clique sobre uma parede"
            active={!!openingType?.startsWith('janela')}
            onClick={() => startOpening('janela-correr-2')}
            data-testid="tool-window"
          />
        </div>
      )}
      {tool === 'wall' && (
        <div className="tool-group">
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
            <span className="unit">cm</span>
          </label>
        </div>
      )}
      <div className="tool-group">
        <ToolButton
          icon={Undo2}
          label="Desfazer"
          title="Desfazer (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          data-testid="undo"
        />
        <ToolButton
          icon={Redo2}
          label="Refazer"
          title="Refazer (Ctrl+Shift+Z)"
          onClick={redo}
          disabled={!canRedo}
          data-testid="redo"
        />
        <ToolButton
          icon={Maximize}
          label="Enquadrar"
          title="Enquadrar (F)"
          onClick={onFit}
          data-testid="fit"
        />
      </div>
    </div>
  )
}

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { selectActiveEnv, useEditor } from './store'

/** Nome do projeto e abas dos ambientes. */
export function EnvTabs() {
  const project = useEditor((s) => s.project)
  const active = useEditor(selectActiveEnv)
  const { setActiveEnv, addEnvironment, renameEnvironment, removeEnvironment, renameProject } =
    useEditor.getState()
  return (
    <div className="env-tabs" data-testid="env-tabs">
      <label className="project-name-wrap" title="Nome do projeto">
        <input
          className="project-name"
          key={project.name}
          defaultValue={project.name}
          aria-label="Nome do projeto"
          onBlur={(e) => renameProject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <Pencil size={13} strokeWidth={1.5} />
      </label>
      <span className="vsep" />
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
        <Plus size={14} strokeWidth={1.5} />
        Ambiente
      </button>
      {project.environments.length > 1 && (
        <button
          type="button"
          className="env-tab env-tab--remove"
          title={`Excluir o ambiente "${active.name}"`}
          aria-label="Excluir ambiente"
          onClick={() => {
            if (window.confirm(`Excluir o ambiente "${active.name}"?`)) removeEnvironment(active.id)
          }}
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useCreateProject } from '@/api/projects'
import { newProject } from '@/core/project/schema'
import { Dialog } from '@/app/ui/Dialog'
import { newId } from '@/features/plan-editor/store'
import { officeRules } from '@/core/library/bundle'
import { useLibrary } from '@/features/library/library-store'

/** Novo projeto: nome, cliente e o primeiro ambiente. */
export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [env, setEnv] = useState('Sala')
  const create = useCreateProject()
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const doc = newProject(newId())
    doc.name = name.trim() || 'Projeto sem nome'
    doc.environments[0]!.name = env.trim() || 'Ambiente 1'
    // Regras de marcenaria do escritório (se o banco já carregou).
    const lib = useLibrary.getState()
    const rules = lib.source !== 'embutido' ? officeRules(lib.lib) : undefined
    if (rules) doc.librarySnapshots.rules = rules
    create.mutate(
      { data: doc, clientName: client.trim() },
      { onSuccess: (p) => navigate(`/projetos/${p.id}`) },
    )
  }

  return (
    <Dialog title="Novo projeto" open={open} onClose={onClose} testId="new-project-dialog">
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Nome do projeto</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Ex.: Apartamento Centro"
            data-testid="new-project-name"
          />
        </label>
        <label className="field">
          <span>Cliente</span>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Opcional"
            data-testid="new-project-client"
          />
        </label>
        <label className="field">
          <span>Primeiro ambiente</span>
          <input value={env} onChange={(e) => setEnv(e.target.value)} />
        </label>
        {create.error && <p className="form-error">{create.error.message}</p>}
        <div className="button-row">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="primary"
            disabled={create.isPending}
            data-testid="new-project-submit"
          >
            {create.isPending ? 'Criando…' : 'Criar e abrir'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

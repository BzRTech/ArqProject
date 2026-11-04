import { FileUp, HardDriveUpload, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMe } from '@/api/auth'
import { useProjects } from '@/api/projects'
import { importJsonFile, importLocalDraft, localDraftName, type ImportResult } from './import-local'
import { NewProjectDialog } from './NewProjectDialog'
import { ProjectCard } from './ProjectCard'
import { VersionsDialog } from './VersionsDialog'

const FILTERS = [
  { value: '', label: 'Ativos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'review', label: 'Em aprovação' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
]

/** Lista de projetos do escritório ativo. */
export default function ProjectsPage() {
  const me = useMe().data
  const canEdit = me?.role !== 'viewer'
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [versionsOf, setVersionsOf] = useState<string | null>(null)
  const projects = useProjects(query, status)
  const navigate = useNavigate()

  // Busca com pequeno atraso (não consulta a cada tecla).
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(t)
  }, [search])

  const list = projects.data ?? []
  const versionsProject = list.find((p) => p.id === versionsOf) ?? null

  return (
    <section className="projects">
      <header className="projects__head">
        <div>
          <div className="eyebrow">{me?.organization?.name}</div>
          <h1>Projetos</h1>
        </div>
        <div className="projects__actions">
          {canEdit && <ImportButtons onDone={(r) => navigate(`/projetos/${r.id}`)} />}
          {canEdit && (
            <button
              type="button"
              className="primary"
              onClick={() => setCreating(true)}
              data-testid="new-project"
            >
              <Plus size={15} strokeWidth={1.5} />
              Novo projeto
            </button>
          )}
        </div>
      </header>

      <div className="projects__filters">
        <label className="search">
          <Search size={15} strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Buscar por nome ou cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="project-search"
          />
        </label>
        <div className="chips" role="tablist" aria-label="Situação">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              className={`chip ${status === f.value ? 'chip--on' : ''}`}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {projects.isError && <p className="form-error">{projects.error.message}</p>}
      {projects.isPending ? (
        <p className="muted">Carregando…</p>
      ) : list.length === 0 ? (
        <div className="empty" data-testid="projects-empty">
          <h2>{query || status ? 'Nada encontrado.' : 'Nenhum projeto ainda.'}</h2>
          {!query && !status && canEdit && (
            <p>
              Crie o primeiro projeto ou envie o rascunho que você fez neste navegador (botão
              “Enviar rascunho”).
            </p>
          )}
        </div>
      ) : (
        <ul className="project-grid" data-testid="project-list">
          {list.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              canEdit={canEdit}
              onVersions={() => setVersionsOf(p.id)}
            />
          ))}
        </ul>
      )}

      <NewProjectDialog open={creating} onClose={() => setCreating(false)} />
      <VersionsDialog
        project={versionsProject}
        canEdit={canEdit}
        onClose={() => setVersionsOf(null)}
      />
    </section>
  )
}

/** Enviar o rascunho local (/editor) ou um .json baixado para o servidor. */
function ImportButtons({ onDone }: { onDone: (r: ImportResult) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    void localDraftName().then(setDraft)
  }, [])
  const run = (fn: () => Promise<ImportResult>) => {
    setBusy(true)
    setError(undefined)
    fn()
      .then((r) => {
        if (r.missing) window.alert(`${r.missing} planta(s) base não estavam neste navegador.`)
        onDone(r)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }
  return (
    <>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
      {draft && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(importLocalDraft)}
          title={`Cria um projeto no servidor a partir do rascunho “${draft}” deste navegador`}
          data-testid="import-local-draft"
        >
          <HardDriveUpload size={15} strokeWidth={1.5} />
          {busy ? 'Enviando…' : 'Enviar rascunho'}
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        title="Abrir um projeto salvo em arquivo (.json)"
      >
        <FileUp size={15} strokeWidth={1.5} />
        Abrir .json
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="import-json-input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) run(() => importJsonFile(f))
          e.target.value = ''
        }}
      />
    </>
  )
}

import { Archive, ArchiveRestore, Copy, History, ScrollText, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import {
  STATUS_LABEL,
  useDeleteProject,
  useDuplicateProject,
  useUpdateProjectMeta,
  type ProjectStatus,
  type ProjectSummary,
} from '@/api/projects'
import { relativeTime } from '@/app/format'

const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[]

export function ProjectCard({
  project: p,
  canEdit,
  onVersions,
}: {
  project: ProjectSummary
  canEdit: boolean
  onVersions: () => void
}) {
  const meta = useUpdateProjectMeta()
  const duplicate = useDuplicateProject()
  const remove = useDeleteProject()
  const archived = p.status === 'archived'
  const envs = p.environment_count ?? 0

  return (
    <li className="project-card" data-testid="project-card">
      <Link to={`/projetos/${p.id}`} className="project-card__open" data-testid="open-project">
        <span className={`status status--${p.status}`}>{STATUS_LABEL[p.status]}</span>
        <strong className="project-card__name">{p.name}</strong>
        <span className="project-card__client">{p.client_name || 'Sem cliente'}</span>
        <span className="project-card__meta">
          {envs} {envs === 1 ? 'ambiente' : 'ambientes'} · alterado {relativeTime(p.updated_at)}
          {p.updated_by_name && ` por ${p.updated_by_name}`}
        </span>
      </Link>
      <div className="project-card__tools">
        {canEdit && (
          <select
            aria-label="Situação"
            value={p.status}
            onChange={(e) => meta.mutate({ id: p.id, status: e.target.value as ProjectStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        )}
        <a
          className="icon-link"
          href={`/api/projects/${p.id}/memorial.pdf`}
          target="_blank"
          rel="noreferrer"
          title="Memorial (PDF)"
          data-testid="project-memorial"
        >
          <ScrollText size={15} strokeWidth={1.5} />
        </a>
        <button type="button" className="icon" onClick={onVersions} title="Versões">
          <History size={15} strokeWidth={1.5} />
        </button>
        {canEdit && (
          <>
            <button
              type="button"
              className="icon"
              title="Duplicar"
              disabled={duplicate.isPending}
              onClick={() => duplicate.mutate(p.id)}
              data-testid="duplicate-project"
            >
              <Copy size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="icon"
              title={archived ? 'Desarquivar' : 'Arquivar'}
              onClick={() => meta.mutate({ id: p.id, status: archived ? 'draft' : 'archived' })}
            >
              {archived ? (
                <ArchiveRestore size={15} strokeWidth={1.5} />
              ) : (
                <Archive size={15} strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              className="icon danger"
              title="Excluir"
              onClick={() => {
                if (window.confirm(`Excluir “${p.name}” e todo o histórico? Não dá para desfazer.`))
                  remove.mutate(p.id)
              }}
              data-testid="delete-project"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

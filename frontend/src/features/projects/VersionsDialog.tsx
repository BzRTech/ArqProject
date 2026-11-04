import { useState, type FormEvent } from 'react'
import {
  useRestoreVersion,
  useSaveVersion,
  useVersions,
  type ProjectSummary,
  type ProjectVersion,
} from '@/api/projects'
import { dateTime } from '@/app/format'
import { Dialog } from '@/app/ui/Dialog'

const KIND_LABEL: Record<ProjectVersion['kind'], string> = {
  auto: 'automática',
  manual: 'salva',
  restore: 'antes de restaurar',
}

/** Histórico: versões automáticas (a cada ~10 min de edição), salvas com nome e restaurar. */
export function VersionsDialog({
  project,
  canEdit,
  onClose,
}: {
  project: ProjectSummary | null
  canEdit: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      title={project ? `Versões · ${project.name}` : 'Versões'}
      open={project !== null}
      onClose={onClose}
      testId="versions-dialog"
      wide
    >
      {project && <Versions project={project} canEdit={canEdit} onClose={onClose} />}
    </Dialog>
  )
}

function Versions({
  project,
  canEdit,
  onClose,
}: {
  project: ProjectSummary
  canEdit: boolean
  onClose: () => void
}) {
  const versions = useVersions(project.id)
  const save = useSaveVersion(project.id)
  const restore = useRestoreVersion(project.id)
  const [label, setLabel] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (label.trim()) save.mutate(label.trim(), { onSuccess: () => setLabel('') })
  }

  return (
    <div className="versions">
      {canEdit && (
        <form className="versions__save" onSubmit={submit}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome da versão (ex.: Enviado ao cliente 03/11)"
            data-testid="version-label"
          />
          <button type="submit" disabled={!label.trim() || save.isPending}>
            Salvar versão atual
          </button>
        </form>
      )}
      {(restore.error || save.error) && (
        <p className="form-error">{(restore.error ?? save.error)?.message}</p>
      )}
      {versions.isPending ? (
        <p className="muted">Carregando…</p>
      ) : (
        <ol className="versions__list" data-testid="versions-list">
          {versions.data?.map((v) => (
            <li key={v.id}>
              <div>
                <strong>{v.label || `Revisão ${v.revision}`}</strong>
                <span className="muted">
                  {dateTime(v.created_at)} · {KIND_LABEL[v.kind]}
                  {v.created_by_name && ` · ${v.created_by_name}`}
                </span>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="sm"
                  disabled={restore.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Restaurar esta versão? O estado atual fica guardado como versão.',
                      )
                    )
                      restore.mutate(
                        { versionId: v.id, revision: project.revision },
                        { onSuccess: onClose },
                      )
                  }}
                >
                  Restaurar
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

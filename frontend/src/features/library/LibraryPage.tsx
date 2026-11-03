import { Copy, FileSpreadsheet, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMe } from '@/api/auth'
import { useLibraryRows, useLibraryWrite, type LibraryRow } from '@/api/library'
import type { BlockDef } from '@/core/blocks/types'
import type { LibraryKind } from '@/core/library/schemas'
import { BlockThumb } from '@/features/plan-editor/BlockThumb'
import { EntryDialog, type EntryDraft } from './EntryDialog'
import { ImportDialog } from './ImportDialog'
import { KIND_ORDER, KINDS } from './kinds'
import { reloadLibrary, useLibrary } from './library-store'

/**
 * "Banco do escritório": o banco global do sistema mais o do escritório. Entradas globais se
 * PERSONALIZAM (cópia do escritório com o mesmo id, que passa a valer); as do escritório se
 * editam e excluem. Os projetos guardam cópias e mostram "versão nova no banco".
 */
export default function LibraryPage() {
  const me = useMe().data
  const canEdit = me?.role !== 'viewer'
  const [kind, setKind] = useState<LibraryKind>('items')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const rows = useLibraryRows(kind, query)
  const write = useLibraryWrite(kind, reloadLibrary)
  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [importing, setImporting] = useState(false)
  const meta = KINDS[kind]
  const orgId = me?.organization?.id ?? null

  // Mantém o banco do editor (bundle) em dia com o escritório ativo.
  useEffect(() => {
    if (orgId !== null) void useLibrary.getState().load(orgId)
  }, [orgId])
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(t)
  }, [search])

  const busy = write.create.isPending || write.update.isPending
  const serverError = (write.create.error ?? write.update.error)?.message
  const actionError = (write.remove.error ?? write.override.error)?.message

  const save = (d: EntryDraft) => {
    const body = { entry: d.entry, is_active: d.isActive }
    const done = { onSuccess: () => setDraft(null) }
    if (d.pk === null) write.create.mutate(body, done)
    else write.update.mutate({ id: d.pk, ...body }, done)
  }
  const openNew = (entry: Record<string, unknown>) => {
    write.create.reset()
    setDraft({ pk: null, entry, isActive: true })
  }
  const edit = (r: LibraryRow) => {
    write.update.reset()
    setDraft({ pk: r.pk, entry: r.entry, isActive: r.is_active })
  }

  return (
    <section className="library">
      <header className="projects__head">
        <div>
          <div className="eyebrow">{me?.organization?.name}</div>
          <h1>Banco do escritório</h1>
        </div>
        <div className="projects__actions">
          {canEdit && meta.importable && (
            <button type="button" onClick={() => setImporting(true)} data-testid="library-import">
              <FileSpreadsheet size={15} strokeWidth={1.5} />
              Importar planilha
            </button>
          )}
          {canEdit && meta.creatable && meta.blank && (
            <button
              type="button"
              className="primary"
              onClick={() => openNew(meta.blank!())}
              data-testid="library-new"
            >
              <Plus size={15} strokeWidth={1.5} />
              Novo
            </button>
          )}
        </div>
      </header>

      <nav className="chips library__tabs" aria-label="Bancos">
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip ${k === kind ? 'chip--on' : ''}`}
            onClick={() => {
              setKind(k)
              setSearch('')
              setQuery('')
            }}
            data-testid={`library-tab-${k}`}
          >
            {KINDS[k].label}
          </button>
        ))}
      </nav>

      <div className="projects__filters">
        <label className="search">
          <Search size={15} strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Buscar por nome ou id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="library-search"
          />
        </label>
        <p className="muted small library__hint">{meta.hint}</p>
      </div>

      {(rows.error ?? actionError) && (
        <p className="form-error">{rows.error?.message ?? actionError}</p>
      )}
      {rows.isPending ? (
        <p className="muted">Carregando…</p>
      ) : (
        <table className="library__table" data-testid="library-rows">
          <tbody>
            {rows.data?.map((r) => (
              <Row
                key={r.pk}
                kind={kind}
                row={r}
                canEdit={canEdit}
                onEdit={() => edit(r)}
                onOverride={() => write.override.mutate(r.pk, { onSuccess: (copy) => edit(copy) })}
                onDuplicate={() =>
                  openNew({
                    ...r.entry,
                    id: '',
                    version: 1,
                    name: `${String(r.entry.name)} (cópia)`,
                  })
                }
                onDelete={() => {
                  const msg = r.overrides
                    ? `Voltar “${String(r.entry.name)}” à versão global?`
                    : `Excluir “${String(r.entry.name)}” do banco do escritório? Projetos que já o usam continuam com a cópia deles.`
                  if (window.confirm(msg)) write.remove.mutate(r.pk)
                }}
              />
            ))}
          </tbody>
        </table>
      )}

      <EntryDialog
        kind={kind}
        draft={draft}
        busy={busy}
        serverError={serverError}
        onSave={save}
        onClose={() => setDraft(null)}
      />
      <ImportDialog
        kind={kind}
        open={importing}
        onClose={() => setImporting(false)}
        onImported={() => {
          void rows.refetch()
          reloadLibrary()
        }}
      />
    </section>
  )
}

function Row({
  kind,
  row: r,
  canEdit,
  onEdit,
  onOverride,
  onDuplicate,
  onDelete,
}: {
  kind: LibraryKind
  row: LibraryRow
  canEdit: boolean
  onEdit: () => void
  onOverride: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const meta = KINDS[kind]
  const e = r.entry
  const color = meta.color?.(e)
  const scope =
    r.scope === 'global'
      ? r.overridden
        ? { label: 'Global · personalizada', cls: 'muted' }
        : { label: 'Global', cls: 'global' }
      : r.overrides
        ? { label: 'Personalizada', cls: 'org' }
        : { label: 'Escritório', cls: 'org' }
  return (
    <tr
      className={`${r.overridden ? 'is-overridden' : ''} ${r.is_active ? '' : 'is-inactive'}`}
      data-testid="library-row"
      data-scope={r.scope}
      data-id={String(e.id)}
    >
      <td className="library__preview">
        {kind === 'items' ? (
          <BlockThumb block={e as unknown as BlockDef} />
        ) : color ? (
          <span className="library__swatch" style={{ background: color }} />
        ) : null}
      </td>
      <td>
        <strong>{String(e.name)}</strong>
        <div className="muted small mono">
          {String(e.id)} · v{String(e.version)}
          {!r.is_active && ' · inativa'}
        </div>
      </td>
      <td className="muted small">{meta.summary(e)}</td>
      <td>
        <span className={`scope scope--${scope.cls}`}>{scope.label}</span>
      </td>
      <td className="library__actions">
        {canEdit && r.scope === 'global' && !r.overridden && (
          <button type="button" className="sm" onClick={onOverride} data-testid="library-override">
            Personalizar
          </button>
        )}
        {canEdit && r.scope === 'org' && (
          <button
            type="button"
            className="icon"
            title="Editar"
            onClick={onEdit}
            data-testid="library-edit"
          >
            <Pencil size={15} strokeWidth={1.5} />
          </button>
        )}
        {canEdit && !meta.creatable && kind !== 'rules' && kind !== 'disciplines' && (
          <button type="button" className="icon" title="Duplicar como novo" onClick={onDuplicate}>
            <Copy size={15} strokeWidth={1.5} />
          </button>
        )}
        {canEdit && r.scope === 'org' && (
          <button
            type="button"
            className="icon danger"
            title={r.overrides ? 'Voltar à versão global' : 'Excluir'}
            onClick={onDelete}
            data-testid="library-delete"
          >
            {r.overrides ? (
              <Undo2 size={15} strokeWidth={1.5} />
            ) : (
              <Trash2 size={15} strokeWidth={1.5} />
            )}
          </button>
        )}
      </td>
    </tr>
  )
}

import { useState, type FormEvent } from 'react'
import { LIBRARY_KINDS, type LibraryKind } from '@/core/library/schemas'
import { formatBRL, parseBRL } from '@/core/units'
import { Dialog } from '@/app/ui/Dialog'
import { getPath, KINDS, setPath, slugify, type FieldSpec } from './kinds'

export interface EntryDraft {
  /** null = nova entrada (POST); número = linha do escritório (PUT). */
  pk: number | null
  entry: Record<string, unknown>
  isActive: boolean
}

/** Texto do campo a partir do valor da entrada. */
function toText(f: FieldSpec, v: unknown): string {
  if (v === undefined || v === null) return ''
  switch (f.type) {
    case 'json':
      return JSON.stringify(v, null, 2)
    case 'intList':
      return (v as number[]).join(', ')
    case 'lines':
      return (v as string[]).join('\n')
    case 'money':
      return formatBRL(v as number).replace(/^R\$\s*/, '')
    case 'bool':
      return v ? '1' : ''
    default:
      return String(v)
  }
}

/** Valor da entrada a partir do texto (undefined = campo vazio, sai do objeto). */
function fromText(f: FieldSpec, t: string): unknown {
  const s = t.trim()
  if (f.type === 'bool') return s ? true : undefined
  if (s === '') return f.type === 'lines' ? [] : undefined
  switch (f.type) {
    case 'int':
      return Math.round(Number(s.replace(',', '.')))
    case 'number':
      return Number(s.replace(',', '.'))
    case 'money':
      return parseBRL(s) ?? undefined
    case 'intList':
      return s
        .split(/[;,\s]+/)
        .filter(Boolean)
        .map((x) => Math.round(Number(x)))
    case 'lines':
      return t
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
    case 'json':
      return JSON.parse(s) as unknown
    default:
      return s
  }
}

/** Formulário de uma entrada do banco do escritório (valida pelo mesmo schema do núcleo). */
export function EntryDialog({
  kind,
  draft,
  busy,
  serverError,
  onSave,
  onClose,
}: {
  kind: LibraryKind
  draft: EntryDraft | null
  busy: boolean
  serverError?: string
  onSave: (d: EntryDraft) => void
  onClose: () => void
}) {
  return (
    <Dialog
      title={draft?.pk === null ? 'Nova entrada' : 'Editar entrada do escritório'}
      open={draft !== null}
      onClose={onClose}
      testId="entry-dialog"
      wide
    >
      {draft && (
        <EntryForm
          kind={kind}
          draft={draft}
          busy={busy}
          serverError={serverError}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

function EntryForm({
  kind,
  draft,
  busy,
  serverError,
  onSave,
  onClose,
}: {
  kind: LibraryKind
  draft: EntryDraft
  busy: boolean
  serverError?: string
  onSave: (d: EntryDraft) => void
  onClose: () => void
}) {
  const meta = KINDS[kind]
  const isNew = draft.pk === null
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(meta.fields.map((f) => [f.path, toText(f, getPath(draft.entry, f.path))])),
  )
  const [id, setId] = useState(String(draft.entry.id ?? ''))
  const [idTouched, setIdTouched] = useState(!isNew || id !== '')
  const [active, setActive] = useState(draft.isActive)
  const [errors, setErrors] = useState<string[]>([])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    let entry: Record<string, unknown> = { ...draft.entry, id }
    const errs: string[] = []
    for (const f of meta.fields) {
      try {
        entry = setPath(entry, f.path, fromText(f, texts[f.path] ?? ''))
      } catch {
        errs.push(`${f.label}: JSON inválido`)
      }
    }
    if (!errs.length) {
      const r = LIBRARY_KINDS[kind].safeParse(entry)
      if (!r.success)
        for (const i of r.error.issues.slice(0, 5))
          errs.push(`${i.path.join('.') || 'entrada'}: ${i.message}`)
    }
    setErrors(errs)
    if (!errs.length) onSave({ pk: draft.pk, entry, isActive: active })
  }

  return (
    <form className="form entry-form" onSubmit={submit}>
      <div className="entry-form__grid">
        {meta.fields.map((f) => {
          const value = texts[f.path] ?? ''
          const set = (v: string) => {
            setTexts((t) => ({ ...t, [f.path]: v }))
            if (f.path === 'name' && isNew && !idTouched) setId(slugify(v))
          }
          const wide = f.type === 'json' || f.type === 'textarea' || f.type === 'lines'
          return (
            <label key={f.path} className={`field ${wide ? 'field--wide' : ''}`}>
              <span>{f.label}</span>
              {f.type === 'select' ? (
                <select value={value} onChange={(e) => set(e.target.value)}>
                  {f.options!.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : f.type === 'bool' ? (
                <input
                  type="checkbox"
                  checked={value === '1'}
                  onChange={(e) => set(e.target.checked ? '1' : '')}
                />
              ) : f.type === 'color' ? (
                <span className="color-field">
                  <input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => set(e.target.value)}
                  />
                  <input value={value} onChange={(e) => set(e.target.value)} />
                </span>
              ) : wide ? (
                <textarea
                  value={value}
                  rows={f.type === 'json' ? 8 : 3}
                  className={f.type === 'json' ? 'mono' : undefined}
                  onChange={(e) => set(e.target.value)}
                />
              ) : (
                <input
                  value={value}
                  inputMode={f.type === 'text' ? undefined : 'decimal'}
                  onChange={(e) => set(e.target.value)}
                  data-testid={`entry-${f.path}`}
                />
              )}
              {f.hint && <small className="muted">{f.hint}</small>}
            </label>
          )
        })}
        <label className="field">
          <span>Identificador</span>
          <input
            value={id}
            disabled={!isNew}
            onChange={(e) => {
              setIdTouched(true)
              setId(e.target.value)
            }}
            className="mono"
            data-testid="entry-id"
          />
          <small className="muted">
            {isNew ? 'Gerado do nome; não muda depois.' : 'Não muda (os projetos o usam).'}
          </small>
        </label>
        <label className="field field--check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>Ativo (aparece no editor)</span>
        </label>
      </div>
      {[...errors, ...(serverError ? [serverError] : [])].map((m) => (
        <p key={m} className="form-error">
          {m}
        </p>
      ))}
      <div className="button-row">
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="primary" disabled={busy} data-testid="entry-save">
          {busy ? 'Salvando…' : 'Salvar no banco do escritório'}
        </button>
      </div>
    </form>
  )
}

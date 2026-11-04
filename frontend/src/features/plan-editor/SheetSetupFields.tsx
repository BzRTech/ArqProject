import type { Environment } from '@/core/project/schema'
import { sheetSetup } from '@/core/project/sheet-setup'
import { useLibrary } from '@/features/library/library-store'
import { useEditor } from './store'

const PAPERS = ['A4', 'A3', 'A2', 'A1'] as const
const ORIENT = { landscape: 'paisagem', portrait: 'retrato' } as const

/**
 * Folha da prancha: o modelo do projeto (do banco: tamanho, orientação, margem e notas do
 * carimbo) e, se quiser, outra folha só para este ambiente.
 */
export function SheetSetupFields({ env }: { env: Environment }) {
  const project = useEditor((s) => s.project)
  const templates = useLibrary((l) => l.lib['sheet-templates'])
  const s = useEditor.getState()
  const tpl = project.librarySnapshots.sheetTemplate
  const cur = sheetSetup(project, env)
  const own = env.sheet ? `${env.sheet.paper}|${env.sheet.orientation}` : ''
  return (
    <section className="sheet-setup" data-testid="sheet-setup">
      <label className="field">
        <span>Modelo de folha do projeto</span>
        <select
          value={tpl.id}
          onChange={(e) => {
            const t = templates.find((x) => x.id === e.target.value)
            if (t) s.setSheetTemplate(t)
          }}
          data-testid="sheet-template"
        >
          {!templates.some((t) => t.id === tpl.id) && <option value={tpl.id}>{tpl.name}</option>}
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Folha deste ambiente</span>
        <select
          value={own}
          onChange={(e) => {
            const [paper, orientation] = e.target.value.split('|') as [
              (typeof PAPERS)[number],
              keyof typeof ORIENT,
            ]
            s.setEnvSheet(env.id, e.target.value ? { paper, orientation } : undefined)
          }}
          data-testid="sheet-paper"
        >
          <option value="">
            Do modelo ({tpl.paper} {ORIENT[tpl.orientation]})
          </option>
          {PAPERS.flatMap((p) =>
            (['landscape', 'portrait'] as const).map((o) => (
              <option key={`${p}|${o}`} value={`${p}|${o}`}>
                {p} {ORIENT[o]}
              </option>
            )),
          )}
        </select>
      </label>
      <p className="muted small">
        Saindo em <strong className="mono">{cur.format}</strong> {ORIENT[cur.orientation]}. Notas do
        carimbo: {cur.notes.join(' ') || '—'}
      </p>
    </section>
  )
}

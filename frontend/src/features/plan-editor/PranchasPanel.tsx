import { FileDown, FileText, ScrollText } from 'lucide-react'
import { useMemo } from 'react'
import { Switch } from '@/app/ui/Switch'
import { environmentLegend, environmentSheet } from '@/core/project/env-sheet'
import { sheetSetup } from '@/core/project/sheet-setup'
import type { Environment } from '@/core/project/schema'
import { joinerySheet, solveItem } from '@/core/joinery/sheet'
import { joinerySpecs } from '@/core/joinery/specs'
import { usePdf } from './pdf-action'
import { useEditorSession } from './session'
import { SheetSetupFields } from './SheetSetupFields'
import { useRuleProfile } from './rules'
import { useEditor } from './store'
import { useUnits } from './units-pref'

/** Aba Pranchas, à direita: o que sai na folha e o botão de baixar. */
export function PranchasPanel({ env }: { env: Environment }) {
  const project = useEditor((s) => s.project)
  const u = useUnits()
  const { busy, run } = usePdf()
  const detailId = useEditor((st) => st.detailItemId)
  const rules = useRuleProfile()
  const detailItem = detailId ? env.items.find((i) => i.id === detailId) : undefined
  const detail = useMemo(() => {
    const solved = detailItem && solveItem(detailItem, rules)
    if (!detailItem || !solved) return null
    return {
      scale: joinerySheet(project, env, detailItem, rules)?.scale ?? 20,
      specs: joinerySpecs(solved, detailItem.joinery, rules),
    }
  }, [project, env, detailItem, rules])
  const setup = sheetSetup(project, env)
  const sheetLabel = `${setup.format} ${setup.orientation === 'landscape' ? 'paisagem' : 'retrato'}`
  const scale = useMemo(
    () => environmentSheet(project, env, { rules }).scale,
    [project, env, rules],
  )
  const legend = environmentLegend(env)
  const projectId = useEditorSession((x) => x.projectId)
  const openMemorial = () => {
    if (!projectId) return
    // O memorial usa o relatório do último save: grava o pendente antes de abrir.
    const tab = window.open('', '_blank')
    void useEditorSession
      .getState()
      .flush()
      .then(() => {
        const url = `/api/projects/${projectId}/memorial.pdf`
        if (tab) tab.location.href = url
        else window.location.href = url
      })
  }
  const actions = (only: { envId: string; itemId?: string }) => (
    <div className="pranchas-actions">
      <button
        type="button"
        className="primary"
        onClick={() => void run()}
        disabled={busy}
        data-testid="sheet-pdf"
      >
        <FileDown size={15} strokeWidth={1.5} />
        {busy ? 'Gerando…' : 'Baixar PDF (todas as pranchas)'}
      </button>
      <button
        type="button"
        onClick={() => void run(only)}
        disabled={busy}
        data-testid="sheet-pdf-one"
      >
        <FileText size={15} strokeWidth={1.5} />
        Baixar só esta prancha
      </button>
      {projectId && (
        <button type="button" onClick={openMemorial} data-testid="memorial-pdf">
          <ScrollText size={15} strokeWidth={1.5} />
          Memorial (PDF)
        </button>
      )}
    </div>
  )
  if (detail && detailItem)
    return (
      <section data-testid="pranchas-panel">
        <h2>Detalhe · {detailItem.name}</h2>
        <p className="muted small">
          Vista frontal, vista interna e planta na escala{' '}
          <strong className="mono">1:{detail.scale}</strong>. Para mudar o móvel, volte à aba
          Marcenaria.
        </p>
        <h3>Especificações ({detail.specs.length})</h3>
        <ol className="specs-preview">
          {detail.specs.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        <SheetSetupFields env={env} />
        {actions({ envId: env.id, itemId: detailItem.id })}
      </section>
    )
  return (
    <section data-testid="pranchas-panel">
      <h2>Prancha</h2>
      <p className="muted small">
        {sheetLabel}, escala <strong className="mono">1:{scale}</strong> (a maior que couber, com as
        cotas). Para mudar o desenho, volte às outras abas.
      </p>
      <Switch
        label="Humanizado (cores de piso e marcenaria)"
        checked={u.humanized}
        onChange={u.setHumanized}
        testId="sheet-humanized"
      />
      <h3>Legenda ({legend.length})</h3>
      <ul className="legend-preview">
        {legend.map((l) => (
          <li key={l.label}>
            <span className={`marker-chip ${/^[MP]\d/.test(l.label) ? 'marker-chip--m' : ''}`}>
              {l.label}
            </span>
            <span>
              {l.text}
              {l.detail && <span className="small muted"> — {l.detail}</span>}
            </span>
            <span className="mono small">{l.qty}</span>
          </li>
        ))}
      </ul>
      <SheetSetupFields env={env} />
      {actions({ envId: env.id })}
    </section>
  )
}

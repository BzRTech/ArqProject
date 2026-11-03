import { FileDown } from 'lucide-react'
import { useMemo } from 'react'
import { Switch } from '@/app/ui/Switch'
import { environmentLegend, environmentSheet } from '@/core/project/env-sheet'
import type { Environment } from '@/core/project/schema'
import { joinerySheet, solveItem } from '@/core/joinery/sheet'
import { joinerySpecs } from '@/core/joinery/specs'
import { usePdf } from './pdf-action'
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
  const scale = useMemo(() => environmentSheet(project, env).scale, [project, env])
  const legend = environmentLegend(env)
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
      </section>
    )
  return (
    <section data-testid="pranchas-panel">
      <h2>Prancha</h2>
      <p className="muted small">
        A3 deitada, escala <strong className="mono">1:{scale}</strong> (a maior que couber, com as
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
    </section>
  )
}

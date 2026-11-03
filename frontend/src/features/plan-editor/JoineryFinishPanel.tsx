import { useState } from 'react'
import { Segmented } from '@/app/ui/Segmented'
import {
  applyFinish,
  joinerySummary,
  missingParts,
  PART_HINT,
  PART_LABEL,
} from '@/core/joinery/finish'
import type { MdfMaterial } from '@/core/joinery/materials'
import { useLibrary } from '@/features/library/library-store'
import { JOINERY_PARTS, type Item, type JoineryPart } from '@/core/project/schema'
import { useEditor } from './store'

type Target = 'all' | JoineryPart
const GRAINS = ['vertical', 'horizontal'] as const

/** Amostra do MDF; madeirado ganha o veio desenhado. */
function Swatch({ hex, kind }: { hex: string; kind: MdfMaterial['kind'] }) {
  return (
    <span
      className={`swatch ${kind === 'madeirado' ? 'swatch--wood' : ''}`}
      style={{ backgroundColor: hex }}
    />
  )
}

/** Aba Marcenaria: acabamento do móvel por parte (frentes, corpo, tamponamento), veio e observações. */
export function JoineryFinishPanel({ item }: { item: Item }) {
  const s = useEditor.getState()
  const j = item.joinery
  const missing = missingParts(j)
  const [target, setTarget] = useState<Target>(
    missing.length === JOINERY_PARTS.length ? 'all' : (missing[0] ?? 'frentes'),
  )
  // MDFs do banco em uso (escritório) ou a paleta embutida.
  const materials = useLibrary((l) => l.lib.materials)
  const apply = (m: MdfMaterial) => {
    s.updateItem(item.id, { joinery: applyFinish(j, target === 'all' ? 'all' : [target], m) })
    // Depois de escolher, passa sozinho para a próxima parte que falta.
    if (target !== 'all') {
      const rest = missingParts(applyFinish(j, [target], m))
      if (rest.length) setTarget(rest[0]!)
    }
  }
  const anyWood = JOINERY_PARTS.some((p) => j?.finishes[p]?.kind === 'madeirado')
  return (
    <section data-testid="joinery-finish">
      <h2>Acabamento</h2>
      <p className="muted small">
        Escolha a parte e clique na cor. “Tudo” pinta o móvel inteiro; depois dá para trocar uma
        parte só.
      </p>
      <div className="part-tabs" role="tablist" aria-label="Parte do móvel">
        {(['all', ...JOINERY_PARTS] as Target[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={target === t}
            className={`chip ${target === t ? 'is-on' : ''}`}
            aria-pressed={target === t}
            onClick={() => setTarget(t)}
            data-testid={`part-${t}`}
          >
            {t === 'all' ? 'Tudo' : PART_LABEL[t]}
          </button>
        ))}
      </div>
      {(['liso', 'madeirado'] as const).map((kind) => (
        <div key={kind}>
          <h3>{kind === 'liso' ? 'MDF liso' : 'MDF madeirado'}</h3>
          <div className="swatch-grid">
            {materials
              .filter((m) => m.kind === kind)
              .map((m) => {
                const on = target !== 'all' && j?.finishes[target]?.materialId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`swatch-btn ${on ? 'is-on' : ''}`}
                    onClick={() => apply(m)}
                    title={[m.name, m.manufacturer, m.line, m.code].filter(Boolean).join(' · ')}
                    data-testid={`mdf-${m.id}`}
                  >
                    <Swatch hex={m.hex} kind={m.kind} />
                    <span>{m.name}</span>
                  </button>
                )
              })}
          </div>
        </div>
      ))}
      <h3>Como está</h3>
      <ul className="finish-list" data-testid="finish-list">
        {JOINERY_PARTS.map((p) => {
          const f = j?.finishes[p]
          return (
            <li key={p}>
              <button type="button" className="list__row" onClick={() => setTarget(p)}>
                <span>
                  <strong>{PART_LABEL[p]}</strong>
                  <span className="small muted">{PART_HINT[p]}</span>
                </span>
                {f ? (
                  <span className="finish-list__val">
                    <Swatch hex={f.hex} kind={f.kind} />
                    {f.name}
                  </span>
                ) : (
                  <span className="pill pill--pending">falta</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <label className="field" title="Sentido das fibras nas frentes (madeirados)">
        <span>Veio das frentes</span>
        <Segmented
          label="Sentido do veio"
          value={j?.grain ?? 'vertical'}
          options={GRAINS}
          onChange={(grain) =>
            s.updateItem(item.id, { joinery: { ...(j ?? { finishes: {} }), grain } })
          }
          testId="grain"
        />
        {!anyWood && <span className="small muted">Só faz diferença em MDF madeirado.</span>}
      </label>
      <label className="field">
        <span>Observações para o marceneiro (uma por linha)</span>
        <textarea
          key={item.id}
          rows={3}
          defaultValue={j?.notes ?? ''}
          placeholder={'Puxador cava 45°\nFita de borda 1 mm na cor'}
          onBlur={(e) =>
            e.target.value !== (j?.notes ?? '') &&
            s.updateItem(item.id, {
              joinery: { ...(j ?? { finishes: {}, grain: 'vertical' }), notes: e.target.value },
            })
          }
          data-testid="joinery-notes"
        />
      </label>
      {j && joinerySummary(j) && (
        <p className="note small" data-testid="joinery-summary">
          Na legenda: {joinerySummary(j)}
        </p>
      )}
    </section>
  )
}

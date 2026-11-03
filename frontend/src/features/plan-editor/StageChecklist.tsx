import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { STAGE_HINT, STAGE_LABEL, STAGES, stageChecklist } from '@/core/editor/stages'
import { runStepAction } from './step-actions'
import { selectActiveEnv, useEditor } from './store'

/** Passo a passo da aba: marca sozinho o que já foi feito e leva à ferramenta certa. */
export function StageChecklist() {
  const stage = useEditor((s) => s.stage)
  const env = useEditor(selectActiveEnv)
  const [open, setOpen] = useState(true)
  const steps = stageChecklist(env, stage)
  const next = steps.find((x) => !x.done && !x.optional)
  const n = STAGES.indexOf(stage) + 1
  return (
    <section className="checklist" data-testid="checklist">
      <button
        type="button"
        className="checklist__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="eyebrow">
          Passo {n} de {STAGES.length} · {STAGE_LABEL[stage]}
        </span>
        {open ? (
          <ChevronDown size={14} strokeWidth={1.5} />
        ) : (
          <ChevronRight size={14} strokeWidth={1.5} />
        )}
      </button>
      {open && (
        <>
          <p className="muted small">{STAGE_HINT[stage]}.</p>
          <ol className="checklist__steps">
            {steps.map((x) => (
              <li
                key={x.id}
                className={`${x.done ? 'is-done' : ''} ${x === next ? 'is-next' : ''}`}
                data-testid={`step-${x.id}`}
                data-done={x.done}
              >
                <span className="checklist__mark" aria-hidden>
                  {x.done ? <Check size={11} strokeWidth={2.2} /> : null}
                </span>
                <div>
                  <strong>
                    {x.label}
                    {x.optional && <span className="muted"> (opcional)</span>}
                  </strong>
                  {x === next || !x.done ? <span className="small muted">{x.hint}</span> : null}
                  {x.action && (!x.done || x.id === 'pdf') && (
                    <button
                      type="button"
                      className={x === next ? 'primary sm' : 'sm'}
                      onClick={() => runStepAction(x.action!)}
                      data-testid={`step-action-${x.id}`}
                    >
                      {x.actionLabel}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

import { Check } from 'lucide-react'
import { STAGE_HINT, STAGE_LABEL, STAGES, stageChecklist } from '@/core/editor/stages'
import { selectActiveEnv, useEditor } from './store'

/** Abas de trabalho do ambiente, numeradas (o número é a ordem sugerida). */
export function StageTabs() {
  const stage = useEditor((s) => s.stage)
  const setStage = useEditor((s) => s.setStage)
  const env = useEditor(selectActiveEnv)
  return (
    <nav className="stage-tabs" aria-label="Etapas do ambiente" data-testid="stage-tabs">
      {STAGES.map((st, i) => {
        const steps = stageChecklist(env, st).filter((x) => !x.optional && x.id !== 'pdf')
        const complete = steps.length > 0 && steps.every((x) => x.done)
        return (
          <button
            key={st}
            type="button"
            role="tab"
            aria-selected={stage === st}
            className={`stage-tab ${stage === st ? 'is-active' : ''}`}
            onClick={() => setStage(st)}
            title={STAGE_HINT[st]}
            data-testid={`stage-${st}`}
          >
            <span className={`stage-tab__num ${complete ? 'is-done' : ''}`}>
              {complete ? <Check size={11} strokeWidth={2} /> : i + 1}
            </span>
            {STAGE_LABEL[st]}
          </button>
        )
      })}
    </nav>
  )
}

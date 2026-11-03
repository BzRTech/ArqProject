import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { latestBlock } from '@/core/blocks/catalog'
import { officeRules } from '@/core/library/bundle'
import { outdatedBlocks, rulesOutdated } from '@/core/library/updates'
import { useEditor } from '@/features/plan-editor/store'
import { useLibrary } from './library-store'

/**
 * "Há versão nova no banco": blocos e regras de marcenaria que o escritório mudou depois que
 * o projeto os copiou. Nada muda sozinho; o usuário atualiza item a item ou tudo.
 */
export function LibraryUpdatesBanner() {
  const project = useEditor((s) => s.project)
  const lib = useLibrary((l) => l.lib)
  const source = useLibrary((l) => l.source)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const blocks = useMemo(
    // `lib` entra nas dependências: o catálogo do núcleo muda junto com ele.
    () => (lib ? outdatedBlocks(project, latestBlock) : []),
    [project, lib],
  )
  const bankRules = officeRules(lib)
  const rules = rulesOutdated(project, bankRules)
  if (source === 'embutido' || source === 'carregando' || dismissed) return null
  if (!blocks.length && !rules) return null
  const s = useEditor.getState()
  const total = blocks.length + (rules ? 1 : 0)
  const updateAll = () => {
    for (const b of blocks) s.updateBlockFromBank(b.latest)
    if (rules && bankRules) s.updateRulesFromBank(bankRules)
  }

  return (
    <div className="banner banner--info" role="status" data-testid="library-updates">
      <RefreshCw size={16} strokeWidth={1.5} />
      <span>
        {total === 1 ? 'Há 1 versão nova' : `Há ${total} versões novas`} no banco do escritório para
        itens deste projeto.
      </span>
      <div className="banner__actions">
        <button type="button" className="sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Esconder' : 'Ver o que mudou'}
        </button>
        <button type="button" className="sm" onClick={() => setDismissed(true)}>
          Agora não
        </button>
        <button
          type="button"
          className="sm primary"
          onClick={updateAll}
          data-testid="library-update-all"
        >
          Atualizar tudo
        </button>
      </div>
      {open && (
        <ul className="banner__list" data-testid="library-updates-list">
          {blocks.map((b) => (
            <li key={b.blockId}>
              <span>
                <strong>{b.name}</strong> · {b.count} {b.count === 1 ? 'item' : 'itens'} · versão{' '}
                {b.from.join(', ')} → {b.to}
              </span>
              <button type="button" className="sm" onClick={() => s.updateBlockFromBank(b.latest)}>
                Atualizar
              </button>
            </li>
          ))}
          {rules && bankRules && (
            <li>
              <span>
                <strong>Regras de marcenaria</strong> · {project.librarySnapshots.rules.name} v
                {project.librarySnapshots.rules.version} → {bankRules.name} v{bankRules.version}{' '}
                (recalcula portas, vãos e peças)
              </span>
              <button
                type="button"
                className="sm"
                onClick={() => s.updateRulesFromBank(bankRules)}
                data-testid="library-update-rules"
              >
                Atualizar
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

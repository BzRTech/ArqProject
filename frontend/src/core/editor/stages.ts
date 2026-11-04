import { getBlock } from '../blocks/catalog'
import { isJoineryBlock, missingParts } from '../joinery/finish'
import type { Environment } from '../project/schema'

/**
 * Abas de trabalho de cada ambiente, em ordem (o número é o passo). Todas mostram a MESMA
 * planta; cada uma edita só as suas camadas — o resto aparece apagado e não é clicável.
 */
export const STAGES = ['planta', 'layout', 'piso', 'marcenaria', '3d', 'pranchas'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  planta: 'Planta',
  layout: 'Layout',
  piso: 'Piso',
  marcenaria: 'Marcenaria',
  pranchas: 'Pranchas',
  '3d': '3D',
}

export const STAGE_HINT: Record<Stage, string> = {
  planta: 'Paredes, portas, janelas e pilares',
  layout: 'Móveis, legenda e orçamento',
  piso: 'Áreas, revestimento e paginação',
  marcenaria: 'Móveis planejados e acabamentos',
  pranchas: 'Conferir a folha e baixar o PDF',
  '3d': 'Explorar o ambiente e os móveis em perspectiva',
}

export type Layer = 'wall' | 'opening' | 'column' | 'dims' | 'text' | 'item' | 'joinery' | 'area'

/** O que pode ser selecionado e editado em cada aba. */
export const STAGE_LAYERS: Record<Stage, readonly Layer[]> = {
  planta: ['wall', 'opening', 'column', 'dims', 'text'],
  layout: ['item', 'dims', 'text'],
  piso: ['area'],
  marcenaria: ['joinery', 'dims', 'text'],
  // Pranchas mostra a FOLHA (prévia do PDF); a edição fica nas outras abas.
  pranchas: [],
  '3d': [],
}

/** Ferramentas da barra em cada aba (ids da barra do editor). */
export const STAGE_TOOLS: Record<Stage, readonly string[]> = {
  planta: ['select', 'wall', 'room', 'door', 'window', 'column', 'dimension', 'text'],
  layout: ['select', 'dimension', 'text'],
  piso: ['select', 'area'],
  marcenaria: ['select', 'dimension', 'text'],
  pranchas: [],
  '3d': [],
}

/** Camada de um objeto do ambiente. */
export function layerOf(
  env: Environment,
  ref: { kind: 'item' | 'drawing' | 'opening'; id: string },
): Layer | null {
  if (ref.kind === 'opening') return 'opening'
  if (ref.kind === 'item') {
    const it = env.items.find((i) => i.id === ref.id)
    return it ? (isJoineryBlock(it.blockId) ? 'joinery' : 'item') : null
  }
  const d = env.drawings.find((x) => x.id === ref.id)
  if (!d) return null
  if (d.kind === 'dimension' || d.kind === 'chain') return 'dims'
  return d.kind
}

export const editableIn = (stage: Stage, layer: Layer | null) =>
  !!layer && STAGE_LAYERS[stage].includes(layer)

// --- Passo a passo ---------------------------------------------------------------------

export type StepAction =
  | { kind: 'tool'; tool: string }
  | {
      kind: 'command'
      command:
        | 'wall-dims'
        | 'item-dims'
        | 'area-from-walls'
        | 'select-area'
        | 'select-joinery'
        | 'open-detail'
        | 'pdf'
    }

export interface ChecklistStep {
  id: string
  label: string
  hint: string
  done: boolean
  optional?: boolean
  action?: StepAction
  actionLabel?: string
}

/** Passos da aba, marcados sozinhos a partir do que já existe no ambiente. */
export function stageChecklist(env: Environment, stage: Stage): ChecklistStep[] {
  const walls = env.drawings.filter((d) => d.kind === 'wall')
  const areas = env.drawings.filter((d) => d.kind === 'area')
  const furniture = env.items.filter((it) => !isJoineryBlock(it.blockId))
  const joinery = env.items.filter((it) => isJoineryBlock(it.blockId))
  const refs = env.drawings.flatMap((d) =>
    (d.kind === 'dimension' || d.kind === 'chain') && d.ref ? [d.ref.kind] : [],
  )
  const wallDims: ChecklistStep = {
    id: 'wall-dims',
    label: 'Cote as paredes',
    hint: 'Por fora, com portas e janelas; por dentro, a área útil. Acompanham a parede.',
    done: refs.includes('wall-outer'),
    action: { kind: 'command', command: 'wall-dims' },
    actionLabel: 'Cotar paredes',
  }
  const itemDims: ChecklistStep = {
    id: 'item-dims',
    label: 'Cote a posição dos móveis',
    hint: 'Distância de cada móvel até as paredes.',
    done: refs.includes('item'),
    optional: true,
    action: { kind: 'command', command: 'item-dims' },
    actionLabel: 'Cotar móveis',
  }
  switch (stage) {
    case '3d':
      return []
    case 'planta':
      return [
        {
          id: 'walls',
          label: 'Desenhe o ambiente',
          hint: 'Digite a largura e a profundidade INTERNAS e clique na tela. Ou desenhe parede por parede.',
          done: walls.length > 0,
          action: { kind: 'tool', tool: 'room' },
          actionLabel: 'Ferramenta Ambiente',
        },
        {
          id: 'openings',
          label: 'Coloque portas e janelas',
          hint: 'Escolha o tipo à esquerda e clique sobre a parede.',
          done: env.openings.length > 0,
          action: { kind: 'tool', tool: 'door' },
          actionLabel: 'Porta',
        },
        {
          id: 'columns',
          label: 'Marque os pilares',
          hint: 'Clique num canto ou numa parede.',
          done: env.drawings.some((d) => d.kind === 'column'),
          optional: true,
          action: { kind: 'tool', tool: 'column' },
          actionLabel: 'Pilar',
        },
        wallDims,
      ]
    case 'layout':
      return [
        {
          id: 'furniture',
          label: 'Insira os móveis',
          hint: 'Clique num bloco à esquerda e depois na planta (ou arraste). Mude L × P no painel.',
          done: furniture.length > 0,
        },
        {
          id: 'prices',
          label: 'Preencha marca e preço',
          hint: 'Selecione o móvel: quantidade, preço, fornecedor e aprovado entram no orçamento.',
          done:
            furniture.length > 0 &&
            furniture.every((it) => it.existing || it.unitPriceCents !== undefined),
          optional: true,
        },
        itemDims,
      ]
    case 'piso':
      return [
        {
          id: 'area',
          label: 'Crie a área do ambiente',
          hint: 'Pelas faces internas das paredes. Ou desenhe a área clicando nos cantos.',
          done: areas.length > 0,
          action: { kind: 'command', command: 'area-from-walls' },
          actionLabel: 'Criar área',
        },
        {
          id: 'floor',
          label: 'Escolha o revestimento',
          hint: 'Selecione a área e escolha o piso: a paginação aparece em escala.',
          done: areas.some((a) => a.kind === 'area' && !!a.floor),
          action: { kind: 'command', command: 'select-area' },
          actionLabel: 'Selecionar área',
        },
        {
          id: 'skirting',
          label: 'Ajuste paginação e rodapé',
          hint: 'Peça, junta, amarração, direção, início (centro ou canto), perda e rodapé.',
          done: areas.some((a) => a.kind === 'area' && !!a.floor?.skirting),
          optional: true,
        },
      ]
    case 'marcenaria':
      return [
        {
          id: 'joinery',
          label: 'Insira o móvel planejado',
          hint: 'Guarda-roupa, rack… do catálogo à esquerda. Ajuste L × P no painel.',
          done: joinery.length > 0,
        },
        {
          id: 'detail',
          label: 'Detalhe os módulos',
          hint: 'Altura, base, módulos, portas, gavetas e prateleiras. Gera as vistas cotadas e a prancha de detalhe.',
          done: joinery.length > 0 && joinery.every((it) => !!it.joinery?.design),
          action: { kind: 'command', command: 'open-detail' },
          actionLabel: 'Detalhar',
        },
        {
          id: 'finishes',
          label: 'Escolha os acabamentos',
          hint: 'MDF das frentes, do corpo e do tamponamento, e o sentido do veio.',
          done: joinery.length > 0 && joinery.every((it) => missingParts(it.joinery).length === 0),
          action: { kind: 'command', command: 'select-joinery' },
          actionLabel: 'Próximo móvel',
        },
        {
          id: 'notes',
          label: 'Observações para o marceneiro',
          hint: 'Uma por linha (puxador, fita de borda…). Saem na especificação.',
          done: joinery.some((it) => !!it.joinery?.notes?.trim()),
          optional: true,
        },
      ]
    case 'pranchas':
      return [
        wallDims,
        itemDims,
        {
          id: 'pdf',
          label: 'Confira a folha e baixe o PDF',
          hint: 'A prévia é a mesma folha do PDF: uma prancha por ambiente, na folha escolhida.',
          done: false,
          action: { kind: 'command', command: 'pdf' },
          actionLabel: 'Baixar PDF',
        },
      ]
  }
}

/** Blocos do catálogo de cada aba. */
export function stageBlockFilter(stage: Stage) {
  return (blockId: string) => {
    const d = getBlock(blockId).discipline
    if (stage === 'marcenaria') return d === 'marcenaria'
    if (stage === 'layout') return d !== 'marcenaria'
    return false
  }
}

/** O ambiente só com o que a aba edita (para clique, área de seleção e Ctrl+A). */
export function stageEnv(env: Environment, stage: Stage): Environment {
  const ok = (ref: Parameters<typeof layerOf>[1]) => editableIn(stage, layerOf(env, ref))
  return {
    ...env,
    items: env.items.filter((it) => ok({ kind: 'item', id: it.id })),
    openings: env.openings.filter((o) => ok({ kind: 'opening', id: o.id })),
    drawings: env.drawings.filter((d) => ok({ kind: 'drawing', id: d.id })),
  }
}

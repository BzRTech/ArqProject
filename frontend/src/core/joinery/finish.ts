import { getBlock } from '../blocks/catalog'
import type { Joinery, JoineryFinish, JoineryPart } from '../project/schema'
import { JOINERY_PARTS } from '../project/schema'
import type { MdfMaterial } from './materials'

/** Nomes das partes do móvel, como aparecem na tela e na especificação. */
export const PART_LABEL: Record<JoineryPart, string> = {
  frentes: 'Frentes',
  corpo: 'Corpo',
  tamponamento: 'Tamponamento',
}

/** O que cada parte é, para quem não é marceneiro. */
export const PART_HINT: Record<JoineryPart, string> = {
  frentes: 'portas e gavetas',
  corpo: 'caixa e prateleiras por dentro',
  tamponamento: 'laterais, tampo e base aparentes',
}

/** Item de marcenaria = bloco da disciplina marcenaria (guarda-roupa, rack…). */
export const isJoineryBlock = (blockId: string) => getBlock(blockId).discipline === 'marcenaria'

export const newJoinery = (): Joinery => ({ finishes: {}, grain: 'vertical' })

export const finishOf = (m: MdfMaterial): JoineryFinish => ({
  materialId: m.id,
  name: m.name,
  kind: m.kind,
  hex: m.hex,
})

/** Aplica o MDF às partes pedidas (ou a todas). Devolve um detalhamento novo. */
export function applyFinish(
  j: Joinery | undefined,
  parts: readonly JoineryPart[] | 'all',
  m: MdfMaterial,
): Joinery {
  const base = j ?? newJoinery()
  const list = parts === 'all' ? JOINERY_PARTS : parts
  const finishes = { ...base.finishes }
  for (const p of list) finishes[p] = finishOf(m)
  return { ...base, finishes }
}

/** Cor que aparece na planta: frentes, senão tamponamento, senão corpo. */
export function planFinish(j: Joinery | undefined): JoineryFinish | undefined {
  return j?.finishes.frentes ?? j?.finishes.tamponamento ?? j?.finishes.corpo
}

/** Uma linha para a legenda/planilha: "Frentes: Freijó (veio vertical) · Corpo: Branco". */
export function joinerySummary(j: Joinery | undefined): string {
  if (!j) return ''
  return JOINERY_PARTS.flatMap((p) => {
    const f = j.finishes[p]
    if (!f) return []
    const grain = p === 'frentes' && f.kind === 'madeirado' ? ` (veio ${j.grain})` : ''
    return [`${PART_LABEL[p]}: ${f.name}${grain}`]
  }).join(' · ')
}

/** Observações, uma por linha, sem linhas vazias. */
export const joineryNotes = (j: Joinery | undefined): string[] =>
  (j?.notes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/** Partes ainda sem acabamento. */
export const missingParts = (j: Joinery | undefined): JoineryPart[] =>
  JOINERY_PARTS.filter((p) => !j?.finishes[p])

/** Cor mais escura para o veio do madeirado (fator 0–1). */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * factor)))
      .toString(16)
      .padStart(2, '0')
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}

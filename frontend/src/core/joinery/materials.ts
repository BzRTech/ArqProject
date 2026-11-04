/**
 * Paleta EMBUTIDA de MDF (lisos e madeirados), com nomes genéricos: seed do banco global
 * (`Material`) e paleta do rascunho local sem servidor. O projeto guarda uma CÓPIA do
 * acabamento escolhido (snapshot), como os demais itens de banco.
 */
export type MdfKind = 'liso' | 'madeirado'

export interface MdfMaterial {
  id: string
  name: string
  kind: MdfKind
  /** Cor de exibição (planta humanizada, amostra). */
  hex: string
}

export const MDF_PALETTE: readonly MdfMaterial[] = [
  { id: 'branco', name: 'Branco', kind: 'liso', hex: '#f7f6f2' },
  { id: 'off-white', name: 'Off-white', kind: 'liso', hex: '#eee9df' },
  { id: 'areia', name: 'Areia', kind: 'liso', hex: '#dcd0bc' },
  { id: 'fendi', name: 'Fendi', kind: 'liso', hex: '#c8bba6' },
  { id: 'cinza-claro', name: 'Cinza claro', kind: 'liso', hex: '#c9c9c4' },
  { id: 'cinza-medio', name: 'Cinza médio', kind: 'liso', hex: '#9a9a95' },
  { id: 'grafite', name: 'Grafite', kind: 'liso', hex: '#4a4a48' },
  { id: 'preto', name: 'Preto', kind: 'liso', hex: '#232322' },
  { id: 'verde-salvia', name: 'Verde sálvia', kind: 'liso', hex: '#9aa58e' },
  { id: 'azul-petroleo', name: 'Azul petróleo', kind: 'liso', hex: '#2f5560' },
  { id: 'terracota', name: 'Terracota', kind: 'liso', hex: '#b9714f' },
  { id: 'verde-oliva', name: 'Verde oliva', kind: 'liso', hex: '#6f7350' },
  { id: 'rosa-argila', name: 'Rosa argila', kind: 'liso', hex: '#c9a294' },
  { id: 'carvalho-claro', name: 'Carvalho claro', kind: 'madeirado', hex: '#d9bf98' },
  { id: 'carvalho', name: 'Carvalho', kind: 'madeirado', hex: '#c09b6d' },
  { id: 'freijo', name: 'Freijó', kind: 'madeirado', hex: '#b88a5a' },
  { id: 'louro', name: 'Louro', kind: 'madeirado', hex: '#a9784b' },
  { id: 'nogueira', name: 'Nogueira', kind: 'madeirado', hex: '#7a5638' },
  { id: 'imbuia', name: 'Imbuia', kind: 'madeirado', hex: '#5c4130' },
  { id: 'cumaru', name: 'Cumaru', kind: 'madeirado', hex: '#94683f' },
]

export const getMaterial = (id: string) => MDF_PALETTE.find((m) => m.id === id)

import {
  DISCIPLINES,
  FLOOR_MATERIALS,
  HANDLE_KINDS,
  HARDWARE_KINDS,
  MDF_KINDS,
  type LibraryKind,
} from '@/core/library/schemas'
import { formatBRL } from '@/core/units'

/** Campo do formulário de uma entrada (caminho no formato do front). */
export interface FieldSpec {
  path: string
  label: string
  type:
    | 'text'
    | 'int'
    | 'number'
    | 'color'
    | 'select'
    | 'bool'
    | 'textarea'
    | 'json'
    | 'intList'
    | 'lines'
    | 'money'
  options?: readonly (readonly [string, string])[]
  hint?: string
}

const opts = (list: readonly string[], labels: Record<string, string> = {}) =>
  list.map((v) => [v, labels[v] ?? v] as const)

const HANDLE_LABEL = {
  touch: 'Fecho toque',
  bar: 'Barra',
  profile: 'Perfil',
  cava: 'Cava',
  knob: 'Botão',
}
const FRONT_LABEL = { open: 'Aberto', door1: '1 porta', door2: '2 portas', drawers: 'Gavetas' }
const BASE_LABEL = { floor: 'Direto no piso', suspended: 'Suspenso', plinth: 'Rodapé' }
const PATTERN_LABEL = { grid: 'Grade', half: 'Amarração 1/2', third: 'Amarração 1/3' }

const base = [
  {
    path: 'base.kind',
    label: 'Base',
    type: 'select',
    options: opts(['floor', 'suspended', 'plinth'], BASE_LABEL),
  },
  { path: 'base.heightMm', label: 'Altura da base (mm)', type: 'int' },
] as const satisfies readonly FieldSpec[]

export interface KindMeta {
  label: string
  hint: string
  fields: readonly FieldSpec[]
  /** Pode criar do zero (senão: duplicar uma existente). */
  creatable: boolean
  importable: boolean
  /** Entrada nova em branco. */
  blank?: () => Record<string, unknown>
  /** Resumo na lista. */
  summary: (e: Record<string, unknown>) => string
  color?: (e: Record<string, unknown>) => string | undefined
}

const mm = (v: unknown) => (typeof v === 'number' ? `${(v / 10).toLocaleString('pt-BR')} cm` : '')
const size = (s: { w: number; d: number; h?: number }) =>
  [s.w, s.d, s.h]
    .filter((v) => v !== undefined)
    .map((v) => (v! / 10).toLocaleString('pt-BR'))
    .join(' × ') + ' cm'

export const KINDS: Record<LibraryKind, KindMeta> = {
  items: {
    label: 'Catálogo',
    hint: 'Blocos da planta: medidas padrão e símbolo paramétrico. Para criar, duplique um parecido.',
    creatable: false,
    importable: false,
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'category', label: 'Categoria', type: 'text' },
      { path: 'discipline', label: 'Disciplina', type: 'select', options: opts(DISCIPLINES) },
      { path: 'defaultSize.w', label: 'Largura padrão (mm)', type: 'int' },
      { path: 'defaultSize.d', label: 'Profundidade padrão (mm)', type: 'int' },
      { path: 'defaultSize.h', label: 'Altura padrão (mm)', type: 'int' },
      { path: 'minSize.w', label: 'Largura mínima (mm)', type: 'int' },
      { path: 'minSize.d', label: 'Profundidade mínima (mm)', type: 'int' },
      { path: 'refPriceCents', label: 'Preço de referência', type: 'money' },
      {
        path: 'joineryType',
        label: 'Tipo de móvel (marcenaria)',
        type: 'text',
        hint: 'rack, roupeiro, cozinha, estante, aparador…',
      },
      { path: 'joinery', label: 'Detalhável no assistente de marcenaria', type: 'bool' },
      { path: 'underlay', label: 'Fica por baixo dos outros (tapete)', type: 'bool' },
      {
        path: 'symbol',
        label: 'Símbolo em planta (JSON)',
        type: 'json',
        hint: 'Formas em mm; w, d e h valem nas expressões.',
      },
    ],
    summary: (e) => `${e.category as string} · ${size(e.defaultSize as { w: number; d: number })}`,
  },
  materials: {
    label: 'MDF',
    hint: 'Chapas lisas e madeiradas oferecidas no acabamento da marcenaria.',
    creatable: true,
    importable: true,
    blank: () => ({ id: '', version: 1, name: '', kind: 'liso', hex: '#e8e4dc' }),
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'kind', label: 'Tipo', type: 'select', options: opts(MDF_KINDS) },
      { path: 'hex', label: 'Cor', type: 'color' },
      { path: 'manufacturer', label: 'Fabricante', type: 'text' },
      { path: 'line', label: 'Linha', type: 'text' },
      { path: 'code', label: 'Código', type: 'text' },
      {
        path: 'thicknessesMm',
        label: 'Espessuras (mm)',
        type: 'intList',
        hint: 'Ex.: 6, 15, 18, 25',
      },
      { path: 'sheet.lengthMm', label: 'Chapa: comprimento (mm)', type: 'int' },
      { path: 'sheet.widthMm', label: 'Chapa: largura (mm)', type: 'int' },
    ],
    summary: (e) => [e.kind, e.manufacturer, e.line].filter(Boolean).join(' · '),
    color: (e) => e.hex as string,
  },
  floors: {
    label: 'Pisos',
    hint: 'Revestimentos de piso: peça, junta, paginação e perda (aba Piso).',
    creatable: true,
    importable: true,
    blank: () => ({
      id: '',
      version: 1,
      name: '',
      material: 'porcelanato',
      pieceAMm: 600,
      pieceBMm: 600,
      jointMm: 2,
      pattern: 'grid',
      wastePct: 10,
      color: '#e4ded3',
    }),
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'material', label: 'Material', type: 'select', options: opts(FLOOR_MATERIALS) },
      { path: 'pieceAMm', label: 'Peça: comprimento (mm, 0 = monolítico)', type: 'int' },
      { path: 'pieceBMm', label: 'Peça: largura (mm)', type: 'int' },
      { path: 'jointMm', label: 'Junta (mm)', type: 'number' },
      {
        path: 'pattern',
        label: 'Paginação',
        type: 'select',
        options: opts(['grid', 'half', 'third'], PATTERN_LABEL),
      },
      { path: 'wastePct', label: 'Perda (%)', type: 'number' },
      { path: 'color', label: 'Cor (humanizado)', type: 'color' },
      { path: 'manufacturer', label: 'Fabricante', type: 'text' },
      { path: 'code', label: 'Código', type: 'text' },
      { path: 'pricePerM2Cents', label: 'Preço por m²', type: 'money' },
    ],
    summary: (e) =>
      `${e.material as string} · ${e.pieceAMm ? `${mm(e.pieceAMm)} × ${mm(e.pieceBMm)}` : 'monolítico'}` +
      (typeof e.pricePerM2Cents === 'number' ? ` · ${formatBRL(e.pricePerM2Cents)}/m²` : ''),
    color: (e) => e.color as string,
  },
  handles: {
    label: 'Puxadores',
    hint: 'Oferecidos no detalhamento do móvel; o nome sai na especificação.',
    creatable: true,
    importable: true,
    blank: () => ({ id: '', version: 1, name: '', kind: 'bar' }),
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'kind', label: 'Tipo', type: 'select', options: opts(HANDLE_KINDS, HANDLE_LABEL) },
      { path: 'lengthMm', label: 'Comprimento ou diâmetro (mm)', type: 'int' },
      { path: 'finish', label: 'Acabamento', type: 'text' },
      { path: 'manufacturer', label: 'Fabricante', type: 'text' },
      { path: 'code', label: 'Código', type: 'text' },
    ],
    summary: (e) =>
      [HANDLE_LABEL[e.kind as keyof typeof HANDLE_LABEL], e.finish, e.manufacturer]
        .filter(Boolean)
        .join(' · '),
  },
  hardware: {
    label: 'Ferragens',
    hint: 'Dobradiças, corrediças, articuladores…',
    creatable: true,
    importable: true,
    blank: () => ({ id: '', version: 1, name: '', kind: 'dobradica' }),
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'kind', label: 'Tipo', type: 'select', options: opts(HARDWARE_KINDS) },
      { path: 'manufacturer', label: 'Fabricante', type: 'text' },
      { path: 'code', label: 'Código', type: 'text' },
      { path: 'notes', label: 'Observações', type: 'textarea' },
    ],
    summary: (e) => [e.kind, e.manufacturer].filter(Boolean).join(' · '),
  },
  'joinery-types': {
    label: 'Tipos de móvel',
    hint: 'Padrões do assistente ao detalhar um móvel (base, puxador, módulos).',
    creatable: true,
    importable: false,
    blank: () => ({
      id: '',
      version: 1,
      name: '',
      base: { kind: 'plinth', heightMm: 100 },
      handle: 'profile',
      moduleWidthMm: 900,
      front: 'door2',
      shelves: 2,
    }),
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      ...base,
      {
        path: 'handle',
        label: 'Puxador',
        type: 'select',
        options: opts(HANDLE_KINDS, HANDLE_LABEL),
      },
      { path: 'moduleWidthMm', label: 'Largura alvo do módulo (mm)', type: 'int' },
      {
        path: 'front',
        label: 'Frente',
        type: 'select',
        options: opts(['open', 'door1', 'door2', 'drawers'], FRONT_LABEL),
      },
      { path: 'shelves', label: 'Prateleiras por módulo', type: 'int' },
    ],
    summary: (e) => {
      const b = e.base as { kind: keyof typeof BASE_LABEL }
      return `${BASE_LABEL[b.kind]} · módulos de ${mm(e.moduleWidthMm)} · ${FRONT_LABEL[e.front as keyof typeof FRONT_LABEL]}`
    },
  },
  presets: {
    label: 'Modelos prontos',
    hint: 'Móveis-modelo: módulos em frações da largura, aplicados ao tamanho do item.',
    creatable: false,
    importable: false,
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'joineryType', label: 'Tipo de móvel', type: 'text' },
      ...base,
      {
        path: 'handle',
        label: 'Puxador',
        type: 'select',
        options: opts(HANDLE_KINDS, HANDLE_LABEL),
      },
      {
        path: 'modules',
        label: 'Módulos (JSON)',
        type: 'json',
        hint: '[{ "fraction": 1, "front": "door2", "shelves": 2, "drawers": 3 }, …]',
      },
    ],
    summary: (e) => `${e.joineryType as string} · ${(e.modules as unknown[]).length} módulo(s)`,
  },
  rules: {
    label: 'Regras de marcenaria',
    hint: 'Espessuras, folgas, chapa e dobradiças. Personalize o perfil "Padrão" para o escritório.',
    creatable: false,
    importable: false,
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'bodyThicknessMm', label: 'Corpo: espessura (mm)', type: 'int' },
      { path: 'back.thicknessMm', label: 'Fundo: espessura (mm)', type: 'int' },
      { path: 'back.recessMm', label: 'Fundo: recuo (mm)', type: 'int' },
      { path: 'front.thicknessMm', label: 'Frente: espessura (mm)', type: 'int' },
      { path: 'front.gapMm', label: 'Frente: folga entre portas (mm)', type: 'int' },
      { path: 'shelfFrontSetbackMm', label: 'Prateleira: recuo da frente (mm)', type: 'int' },
      { path: 'sheet.lengthMm', label: 'Chapa: comprimento (mm)', type: 'int' },
      { path: 'sheet.widthMm', label: 'Chapa: largura (mm)', type: 'int' },
      { path: 'minClearWidthMm', label: 'Vão livre mínimo (mm)', type: 'int' },
      { path: 'doorWidthToleranceMm', label: 'Diferença máxima entre portas (mm)', type: 'int' },
      {
        path: 'hinges',
        label: 'Dobradiças por altura de porta (JSON)',
        type: 'json',
        hint: '[{ "maxDoorHeightMm": 900, "count": 2 }, …, { "maxDoorHeightMm": null, "count": 4 }]',
      },
    ],
    summary: (e) => {
      const f = e.front as { gapMm: number }
      return `corpo ${e.bodyThicknessMm as number} mm · folga ${f.gapMm} mm`
    },
  },
  details: {
    label: 'Detalhes',
    hint: 'Detalhes técnicos reutilizáveis (inseridos nas pranchas numa próxima etapa).',
    creatable: false,
    importable: false,
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'category', label: 'Categoria', type: 'text' },
      { path: 'text', label: 'Texto padrão', type: 'textarea' },
      { path: 'symbol', label: 'Desenho (JSON)', type: 'json' },
    ],
    summary: (e) => String(e.category ?? ''),
  },
  'sheet-templates': {
    label: 'Folhas',
    hint: 'Modelos de folha e notas padrão do carimbo.',
    creatable: false,
    importable: false,
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'paper', label: 'Folha', type: 'select', options: opts(['A4', 'A3', 'A2', 'A1']) },
      {
        path: 'orientation',
        label: 'Orientação',
        type: 'select',
        options: opts(['landscape', 'portrait'], { landscape: 'Paisagem', portrait: 'Retrato' }),
      },
      { path: 'marginMm', label: 'Margem (mm)', type: 'int' },
      { path: 'notes', label: 'Notas (uma por linha)', type: 'lines' },
    ],
    summary: (e) =>
      `${e.paper as string} · ${e.orientation === 'landscape' ? 'paisagem' : 'retrato'}`,
  },
  'spec-templates': {
    label: 'Textos padrão',
    hint: 'Frases de especificação e observações recorrentes.',
    creatable: true,
    importable: true,
    blank: () => ({ id: '', version: 1, name: '', category: 'Marcenaria', text: '' }),
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'category', label: 'Categoria', type: 'text' },
      { path: 'text', label: 'Texto', type: 'textarea' },
    ],
    summary: (e) => String(e.text ?? '').slice(0, 90),
  },
  disciplines: {
    label: 'Disciplinas',
    hint: 'Disciplinas do projeto (cor e ordem).',
    creatable: false,
    importable: false,
    fields: [
      { path: 'name', label: 'Nome', type: 'text' },
      { path: 'color', label: 'Cor', type: 'color' },
      { path: 'order', label: 'Ordem', type: 'int' },
    ],
    summary: (e) => `ordem ${e.order as number}`,
    color: (e) => e.color as string,
  },
}

/** Ordem das abas na tela. */
export const KIND_ORDER: LibraryKind[] = [
  'items',
  'materials',
  'floors',
  'handles',
  'hardware',
  'joinery-types',
  'presets',
  'rules',
  'spec-templates',
  'sheet-templates',
  'details',
  'disciplines',
]

// --- leitura/escrita por caminho ------------------------------------------------------------

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj)
}

/** Grava (ou apaga, se `undefined`) no caminho; objetos que ficam vazios saem. */
export function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const out = structuredClone(obj)
  const keys = path.split('.')
  const stack: Record<string, unknown>[] = [out]
  let cur = out
  for (const k of keys.slice(0, -1)) {
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {}
    cur = cur[k] as Record<string, unknown>
    stack.push(cur)
  }
  const leaf = keys[keys.length - 1]!
  if (value === undefined) delete cur[leaf]
  else cur[leaf] = value
  for (let i = keys.length - 1; i > 0; i--) {
    const parent = stack[i - 1]!
    const k = keys[i - 1]!
    if (Object.keys(stack[i]!).length === 0) delete parent[k]
  }
  return out
}

/** id a partir do nome: "Nogueira Escura" → "nogueira-escura". */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

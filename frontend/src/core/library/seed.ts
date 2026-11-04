import { CATALOG } from '../blocks/catalog'
import { FLOOR_FINISHES } from '../finishes/catalog'
import { MDF_PALETTE } from '../joinery/materials'
import { DEFAULT_RULE_PROFILE } from '../joinery/rules'
import type { LibraryEntryOf, LibraryKind } from './schemas'

/**
 * Conteúdo inicial do banco GLOBAL (nomes genéricos, sem marcas). Fonte única: este arquivo e
 * os catálogos embutidos que ele junta. `npm run export:schema` grava em
 * `backend/library_seed/<banco>.json`, que o `manage.py seed_library` carrega. Sem servidor
 * (rascunho local), o editor usa estes mesmos dados.
 */

export const DISCIPLINE_SEED: LibraryEntryOf<'disciplines'>[] = [
  { id: 'layout', version: 1, name: 'Layout', color: '#4a4741', order: 1 },
  { id: 'marcenaria', version: 1, name: 'Marcenaria', color: '#a65f45', order: 2 },
  { id: 'revestimentos', version: 1, name: 'Revestimentos', color: '#b08a3e', order: 3 },
  { id: 'eletrica', version: 1, name: 'Elétrica', color: '#2f5560', order: 4 },
  { id: 'hidraulica', version: 1, name: 'Hidráulica', color: '#6f7b66', order: 5 },
]

export const HANDLE_SEED: LibraryEntryOf<'handles'>[] = [
  { id: 'fecho-toque', version: 1, name: 'Fecho toque', kind: 'touch' },
  {
    id: 'perfil-aluminio-natural',
    version: 1,
    name: 'Perfil de alumínio natural',
    kind: 'profile',
    finish: 'Alumínio natural',
  },
  {
    id: 'perfil-aluminio-preto',
    version: 1,
    name: 'Perfil de alumínio preto',
    kind: 'profile',
    finish: 'Preto fosco',
  },
  { id: 'cava-45', version: 1, name: 'Cava usinada 45°', kind: 'cava' },
  { id: 'cava-perfil-j', version: 1, name: 'Cava com perfil J', kind: 'cava', finish: 'Alumínio' },
  {
    id: 'barra-128',
    version: 1,
    name: 'Barra 128 mm',
    kind: 'bar',
    lengthMm: 160,
    finish: 'Inox escovado',
  },
  {
    id: 'barra-256',
    version: 1,
    name: 'Barra 256 mm',
    kind: 'bar',
    lengthMm: 300,
    finish: 'Inox escovado',
  },
  {
    id: 'barra-preta-320',
    version: 1,
    name: 'Barra preta 320 mm',
    kind: 'bar',
    lengthMm: 350,
    finish: 'Preto fosco',
  },
  {
    id: 'botao-redondo',
    version: 1,
    name: 'Botão redondo',
    kind: 'knob',
    lengthMm: 30,
    finish: 'Latão escovado',
  },
  {
    id: 'botao-couro',
    version: 1,
    name: 'Botão com alça de couro',
    kind: 'knob',
    lengthMm: 35,
    finish: 'Couro natural',
  },
]

export const HARDWARE_SEED: LibraryEntryOf<'hardware'>[] = [
  {
    id: 'dobradica-reta-35',
    version: 1,
    name: 'Dobradiça reta 35 mm com amortecedor',
    kind: 'dobradica',
  },
  {
    id: 'dobradica-curva-35',
    version: 1,
    name: 'Dobradiça curva 35 mm com amortecedor',
    kind: 'dobradica',
  },
  {
    id: 'corredica-telescopica-450',
    version: 1,
    name: 'Corrediça telescópica 450 mm',
    kind: 'corredica',
  },
  {
    id: 'corredica-oculta-450',
    version: 1,
    name: 'Corrediça oculta com amortecedor 450 mm',
    kind: 'corredica',
  },
  { id: 'fecho-toque-push', version: 1, name: 'Fecho toque (push)', kind: 'fecho-toque' },
  {
    id: 'articulador-basculante',
    version: 1,
    name: 'Articulador para porta basculante',
    kind: 'articulador',
  },
]

export const JOINERY_TYPE_SEED: LibraryEntryOf<'joinery-types'>[] = [
  {
    id: 'rack',
    version: 1,
    name: 'Rack',
    base: { kind: 'suspended', heightMm: 100 },
    handle: 'touch',
    moduleWidthMm: 900,
    front: 'door2',
    shelves: 1,
  },
  {
    id: 'roupeiro',
    version: 1,
    name: 'Roupeiro',
    base: { kind: 'plinth', heightMm: 100 },
    handle: 'profile',
    moduleWidthMm: 900,
    front: 'door2',
    shelves: 3,
  },
  {
    id: 'cozinha',
    version: 1,
    name: 'Armário de cozinha',
    base: { kind: 'plinth', heightMm: 150 },
    handle: 'cava',
    moduleWidthMm: 600,
    front: 'door1',
    shelves: 1,
  },
  {
    id: 'estante',
    version: 1,
    name: 'Estante',
    base: { kind: 'plinth', heightMm: 100 },
    handle: 'touch',
    moduleWidthMm: 800,
    front: 'open',
    shelves: 4,
  },
  {
    id: 'aparador',
    version: 1,
    name: 'Aparador',
    base: { kind: 'floor', heightMm: 0 },
    handle: 'cava',
    moduleWidthMm: 500,
    front: 'door1',
    shelves: 1,
  },
]

export const PRESET_SEED: LibraryEntryOf<'presets'>[] = [
  {
    id: 'rack-4-portas',
    version: 1,
    name: 'Rack com 4 portas iguais',
    joineryType: 'rack',
    base: { kind: 'suspended', heightMm: 100 },
    handle: 'touch',
    modules: [
      { fraction: 1, front: 'door2', shelves: 1, drawers: 3 },
      { fraction: 1, front: 'door2', shelves: 1, drawers: 3 },
    ],
  },
  {
    id: 'rack-nicho-central',
    version: 1,
    name: 'Rack com nicho central',
    joineryType: 'rack',
    base: { kind: 'suspended', heightMm: 100 },
    handle: 'touch',
    modules: [
      { fraction: 1, front: 'door1', shelves: 1, drawers: 3 },
      { fraction: 2, front: 'open', shelves: 0, drawers: 3 },
      { fraction: 1, front: 'door1', shelves: 1, drawers: 3 },
    ],
  },
  {
    id: 'roupeiro-gaveteiro',
    version: 1,
    name: 'Roupeiro com gaveteiro',
    joineryType: 'roupeiro',
    base: { kind: 'plinth', heightMm: 100 },
    handle: 'profile',
    modules: [
      { fraction: 1, front: 'door2', shelves: 3, drawers: 3 },
      { fraction: 0.6, front: 'drawers', shelves: 0, drawers: 4 },
      { fraction: 1, front: 'door2', shelves: 3, drawers: 3 },
    ],
  },
]

export const SHEET_TEMPLATE_SEED: LibraryEntryOf<'sheet-templates'>[] = [
  {
    id: 'a3-paisagem',
    version: 1,
    name: 'A3 paisagem',
    paper: 'A3',
    orientation: 'landscape',
    marginMm: 10,
    notes: [
      'Medidas em centímetros, salvo indicação.',
      'Conferir todas as medidas no local antes da execução.',
    ],
  },
]

export const SPEC_TEMPLATE_SEED: LibraryEntryOf<'spec-templates'>[] = [
  {
    id: 'conferir-no-local',
    version: 1,
    name: 'Conferir no local',
    category: 'Geral',
    text: 'Medidas devem ser conferidas no local antes da produção.',
  },
  {
    id: 'fita-de-borda',
    version: 1,
    name: 'Fita de borda',
    category: 'Marcenaria',
    text: 'Fita de borda no mesmo padrão do MDF em todas as faces aparentes.',
  },
  {
    id: 'fundo-parafusado',
    version: 1,
    name: 'Fundo parafusado',
    category: 'Marcenaria',
    text: 'Fundo encaixado em canal e parafusado.',
  },
  {
    id: 'iluminacao-led',
    version: 1,
    name: 'Iluminação em LED',
    category: 'Marcenaria',
    text: 'Fita de LED embutida em perfil de alumínio com difusor; fonte em local ventilado e acessível.',
  },
]

/** Seed completo, por banco. */
export const LIBRARY_SEED: { [K in LibraryKind]: LibraryEntryOf<K>[] } = {
  disciplines: DISCIPLINE_SEED,
  items: CATALOG.map((b) => ({ ...b })),
  materials: MDF_PALETTE.map((m) => ({
    ...m,
    version: 1,
    thicknessesMm: [6, 15, 18, 25],
    sheet: { lengthMm: 2750, widthMm: 1840 },
  })),
  floors: FLOOR_FINISHES.map((f) => ({ ...f, version: 1 })),
  handles: HANDLE_SEED,
  hardware: HARDWARE_SEED,
  'joinery-types': JOINERY_TYPE_SEED,
  presets: PRESET_SEED,
  rules: [DEFAULT_RULE_PROFILE],
  details: [],
  'sheet-templates': SHEET_TEMPLATE_SEED,
  'spec-templates': SPEC_TEMPLATE_SEED,
}

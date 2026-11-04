import { z } from 'zod'
import type { SymbolShape } from '../blocks/symbol'
import type { LineType, PEN } from '../drawing/styles'

/**
 * Formato de cada BANCO (biblioteca de conteúdo), visto pelo front. É o que a API devolve no
 * bundle (`GET /api/library/bundle/`) e o que o projeto guarda como cópia (snapshot). O
 * backend valida as entradas com os JSON Schemas exportados daqui (`npm run export:schema`).
 * Medidas em MILÍMETROS INTEIROS; dinheiro em CENTAVOS.
 */

const mm = z.number().int()
const positiveMm = mm.positive()
const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'use letras minúsculas, números e hífen')
  .max(80)
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor no formato #rrggbb')

/** Campos comuns a toda entrada de banco. */
const entry = {
  id: slug,
  version: z.number().int().positive(),
  name: z.string().min(1).max(200),
}

// --- Símbolo paramétrico (blocos e detalhes) -------------------------------------------------

/** Número ou expressão (`w / 2`, `max(1, round(w / 800))`…). */
const Num = z.union([z.number(), z.string().min(1).max(200)])
const PEN_NAMES = [
  'extraFine',
  'fine',
  'thin',
  'medium',
  'thick',
  'extraThick',
] as const satisfies readonly (keyof typeof PEN)[]
const LINE_TYPES = [
  'continuous',
  'dashed',
  'hidden',
  'dotted',
  'dashdot',
] as const satisfies readonly LineType[]

const style = {
  pen: z.enum(PEN_NAMES).optional(),
  lineType: z.enum(LINE_TYPES).optional(),
  color: z.string().optional(),
  fill: z.string().optional(),
}

export const SymbolShapeSchema: z.ZodType<SymbolShape> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('rect'), x: Num, y: Num, w: Num, h: Num, ...style }),
    z.object({ type: z.literal('line'), x1: Num, y1: Num, x2: Num, y2: Num, ...style }),
    z.object({
      type: z.literal('polyline'),
      points: z.array(z.tuple([Num, Num])).min(2),
      closed: z.boolean().optional(),
      ...style,
    }),
    z.object({ type: z.literal('circle'), cx: Num, cy: Num, r: Num, ...style }),
    z.object({ type: z.literal('ellipse'), cx: Num, cy: Num, rx: Num, ry: Num, ...style }),
    z.object({
      type: z.literal('arc'),
      cx: Num,
      cy: Num,
      r: Num,
      start: Num,
      sweep: Num,
      ...style,
    }),
    z.object({
      type: z.literal('hatch'),
      x: Num,
      y: Num,
      w: Num,
      h: Num,
      pattern: z.enum(['lines', 'cross']),
      angle: Num.optional(),
      spacing: Num.optional(),
      ...style,
    }),
    z.object({
      type: z.literal('text'),
      x: Num,
      y: Num,
      text: z.string(),
      size: Num.optional(),
      anchor: z.enum(['start', 'middle', 'end']).optional(),
    }),
    z.object({ type: z.literal('repeat'), count: Num, shapes: z.array(SymbolShapeSchema) }),
  ]),
)

export const BlockSymbolSchema = z.object({ shapes: z.array(SymbolShapeSchema) })

// --- Catálogo de itens -----------------------------------------------------------------------

export const DISCIPLINES = [
  'layout',
  'marcenaria',
  'eletrica',
  'revestimentos',
  'hidraulica',
] as const

export const BlockDefSchema = z.object({
  ...entry,
  category: z.string().min(1).max(80),
  discipline: z.enum(DISCIPLINES),
  defaultSize: z.object({ w: positiveMm, d: positiveMm, h: positiveMm.optional() }),
  minSize: z.object({ w: positiveMm, d: positiveMm }),
  joinery: z.boolean().optional(),
  joineryType: slug.optional(),
  underlay: z.boolean().optional(),
  /** Preço de referência (centavos), sugerido ao inserir. */
  refPriceCents: z.number().int().nonnegative().optional(),
  symbol: BlockSymbolSchema,
})

export const DisciplineDefSchema = z.object({
  ...entry,
  id: z.enum(DISCIPLINES),
  color: hex,
  order: z.number().int(),
})

// --- Acabamentos -----------------------------------------------------------------------------

export const MDF_KINDS = ['liso', 'madeirado'] as const

export const MaterialDefSchema = z.object({
  ...entry,
  kind: z.enum(MDF_KINDS),
  hex,
  manufacturer: z.string().max(120).optional(),
  line: z.string().max(120).optional(),
  code: z.string().max(60).optional(),
  /** Espessuras disponíveis (mm). */
  thicknessesMm: z.array(positiveMm).optional(),
  sheet: z.object({ lengthMm: positiveMm, widthMm: positiveMm }).optional(),
})

export const FLOOR_MATERIALS = [
  'porcelanato',
  'ceramica',
  'madeira',
  'vinilico',
  'laminado',
  'pedra',
  'cimento',
  'carpete',
] as const

export const FloorFinishDefSchema = z.object({
  ...entry,
  material: z.enum(FLOOR_MATERIALS),
  pieceAMm: mm.nonnegative(),
  pieceBMm: mm.nonnegative(),
  jointMm: z.number().nonnegative(),
  pattern: z.enum(['grid', 'half', 'third']),
  wastePct: z.number().min(0).max(100),
  color: hex,
  manufacturer: z.string().max(120).optional(),
  code: z.string().max(60).optional(),
  /** Preço por m² (centavos). */
  pricePerM2Cents: z.number().int().nonnegative().optional(),
})

// --- Marcenaria ------------------------------------------------------------------------------

export const HANDLE_KINDS = ['touch', 'bar', 'profile', 'cava', 'knob'] as const

export const HandleDefSchema = z.object({
  ...entry,
  kind: z.enum(HANDLE_KINDS),
  manufacturer: z.string().max(120).optional(),
  code: z.string().max(60).optional(),
  /** Comprimento (barra/perfil) ou diâmetro (botão), mm. */
  lengthMm: positiveMm.optional(),
  finish: z.string().max(80).optional(),
})

export const HARDWARE_KINDS = [
  'dobradica',
  'corredica',
  'fecho-toque',
  'articulador',
  'cesto',
  'outro',
] as const

export const HardwareDefSchema = z.object({
  ...entry,
  kind: z.enum(HARDWARE_KINDS),
  manufacturer: z.string().max(120).optional(),
  code: z.string().max(60).optional(),
  notes: z.string().max(500).optional(),
})

const BaseSchema = z.object({
  kind: z.enum(['floor', 'suspended', 'plinth']),
  heightMm: mm.nonnegative(),
})

/** Tipo de móvel: padrões do detalhamento quando o usuário abre o assistente. */
export const JoineryTypeDefSchema = z.object({
  ...entry,
  base: BaseSchema,
  handle: z.enum(HANDLE_KINDS),
  /** Largura alvo de um módulo (o assistente divide o móvel por ela). */
  moduleWidthMm: positiveMm,
  front: z.enum(['open', 'door1', 'door2', 'drawers']),
  shelves: z.number().int().min(0).max(12),
})

/** Modelo pronto: módulos RELATIVOS (frações da largura) que o núcleo resolve para o L × P × A. */
export const JoineryPresetDefSchema = z.object({
  ...entry,
  joineryType: slug,
  base: BaseSchema,
  handle: z.enum(HANDLE_KINDS),
  modules: z
    .array(
      z.object({
        fraction: z.number().positive(),
        front: z.enum(['open', 'door1', 'door2', 'drawers']),
        shelves: z.number().int().min(0).max(12),
        drawers: z.number().int().min(1).max(8),
      }),
    )
    .min(1),
})

export const HingeRuleSchema = z.object({
  maxDoorHeightMm: positiveMm.nullable(),
  count: z.number().int().positive(),
})

export const RuleProfileSchema = z.object({
  ...entry,
  sheet: z.object({ lengthMm: positiveMm, widthMm: positiveMm }),
  bodyThicknessMm: positiveMm,
  back: z.object({ thicknessMm: positiveMm, recessMm: mm.nonnegative() }),
  front: z.object({ thicknessMm: positiveMm, gapMm: mm.nonnegative() }),
  shelfFrontSetbackMm: mm.nonnegative(),
  hinges: z.array(HingeRuleSchema).min(1),
  minClearWidthMm: positiveMm,
  doorWidthToleranceMm: mm.nonnegative(),
})

/** Detalhe técnico reutilizável (inserível em prancha — Fase 8). */
export const DetailBlockDefSchema = z.object({
  ...entry,
  category: z.string().max(80),
  /** Tamanho de referência do desenho (mm), para `w`/`d` das expressões. */
  sizeMm: z.object({ w: positiveMm, d: positiveMm }),
  symbol: BlockSymbolSchema,
  text: z.string().max(2000).optional(),
})

// --- Folhas e textos -------------------------------------------------------------------------

export const SheetTemplateDefSchema = z.object({
  ...entry,
  paper: z.enum(['A4', 'A3', 'A2', 'A1']),
  orientation: z.enum(['landscape', 'portrait']),
  marginMm: positiveMm,
  /** Notas padrão do carimbo, uma por linha. */
  notes: z.array(z.string().max(300)),
})

export const SpecTemplateDefSchema = z.object({
  ...entry,
  category: z.string().max(80),
  text: z.string().min(1).max(2000),
})

// --- Registro dos bancos ---------------------------------------------------------------------

/** Tipos de banco: chave da API (`/api/library/<kind>/`) → schema da entrada. */
export const LIBRARY_KINDS = {
  disciplines: DisciplineDefSchema,
  items: BlockDefSchema,
  materials: MaterialDefSchema,
  floors: FloorFinishDefSchema,
  handles: HandleDefSchema,
  hardware: HardwareDefSchema,
  'joinery-types': JoineryTypeDefSchema,
  presets: JoineryPresetDefSchema,
  rules: RuleProfileSchema,
  details: DetailBlockDefSchema,
  'sheet-templates': SheetTemplateDefSchema,
  'spec-templates': SpecTemplateDefSchema,
} as const

export type LibraryKind = keyof typeof LIBRARY_KINDS
export const LIBRARY_KIND_LIST = Object.keys(LIBRARY_KINDS) as LibraryKind[]

export type LibraryEntryOf<K extends LibraryKind> = z.infer<(typeof LIBRARY_KINDS)[K]>
export type MaterialDef = z.infer<typeof MaterialDefSchema>
export type HandleDef = z.infer<typeof HandleDefSchema>
export type HardwareDef = z.infer<typeof HardwareDefSchema>
export type JoineryTypeDef = z.infer<typeof JoineryTypeDefSchema>
export type JoineryPresetDef = z.infer<typeof JoineryPresetDefSchema>
export type DetailBlockDef = z.infer<typeof DetailBlockDefSchema>
export type SheetTemplateDef = z.infer<typeof SheetTemplateDefSchema>
export type SpecTemplateDef = z.infer<typeof SpecTemplateDefSchema>
export type DisciplineDef = z.infer<typeof DisciplineDefSchema>

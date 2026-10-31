import { z } from 'zod'

/**
 * Documento do projeto (formato v3 — versões antigas são migradas em `migrations.ts`). Fonte única da verdade: na Fase 2 este schema é
 * exportado como JSON Schema para o Django validar o JSONB.
 * Todas as medidas em MILÍMETROS INTEIROS.
 */

export const SCHEMA_VERSION = 3

const mm = z.number().int()
const positiveMm = mm.positive()
const id = z.string().min(1)

export const Vec2Schema = z.object({ x: mm, y: mm })

export const WallSchema = z.object({
  id,
  kind: z.literal('wall'),
  /** Eixo da parede. */
  points: z.array(Vec2Schema).min(2),
  closed: z.boolean(),
  thicknessMm: positiveMm,
})

export const DimensionSchema = z.object({
  id,
  kind: z.literal('dimension'),
  p1: Vec2Schema,
  p2: Vec2Schema,
  orientation: z.enum(['aligned', 'horizontal', 'vertical']),
  /** Afastamento em mm do MODELO (vira mm de papel dividindo pela escala). */
  offsetMm: mm,
})

/** Cota em cadeia gravada no documento (ex.: gerada a partir de uma parede com vãos). */
export const ChainSchema = z.object({
  id,
  kind: z.literal('chain'),
  points: z.array(Vec2Schema).min(2),
  orientation: z.enum(['aligned', 'horizontal', 'vertical']),
  offsetMm: mm,
  total: z.boolean(),
})

/** Área (polígono) com nome; o m² é calculado, nunca guardado. */
export const AreaSchema = z.object({
  id,
  kind: z.literal('area'),
  points: z.array(Vec2Schema).min(3),
  name: z.string(),
  /** Deslocamento do rótulo em relação ao centroide (o usuário arrasta). */
  labelOffset: Vec2Schema.optional(),
})

export const TextSchema = z.object({
  id,
  kind: z.literal('text'),
  at: Vec2Schema,
  text: z.string(),
  /** Corpo em mm de papel. */
  sizeMm: z.number().positive(),
})

export const DrawingSchema = z.discriminatedUnion('kind', [
  WallSchema,
  DimensionSchema,
  ChainSchema,
  TextSchema,
  AreaSchema,
])

export const DOOR_TYPES = ['porta-abrir', 'porta-correr', 'porta-pivotante'] as const
export const WINDOW_TYPES = [
  'janela-correr-2',
  'janela-correr-4',
  'janela-maxim-ar',
  'janela-basculante',
  'janela-fixa',
] as const
export const OPENING_TYPES = [...DOOR_TYPES, ...WINDOW_TYPES] as const
export type OpeningType = (typeof OPENING_TYPES)[number]

/** Porta ou janela: um VÃO num trecho de parede. */
export const OpeningSchema = z.object({
  id,
  wallId: z.string(),
  /** Índice do trecho da parede (entre o ponto i e o i+1). */
  segment: z.number().int().nonnegative(),
  /** Centro do vão ao longo do trecho, mm a partir do ponto i (eixo). */
  offsetMm: mm,
  widthMm: positiveMm,
  heightMm: positiveMm,
  sillMm: mm.nonnegative(),
  type: z.enum(OPENING_TYPES),
  /** Porta: batente da dobradiça (início/fim do trecho). Correr: lado para onde a folha corre. */
  hinge: z.enum(['start', 'end']),
  /** Porta: lado para onde abre. Janela: lado externo. Relativo ao sentido do trecho. */
  side: z.enum(['left', 'right']),
})

export const ITEM_UNITS = ['un', 'pç', 'cj', 'm', 'm²'] as const
export type ItemUnit = (typeof ITEM_UNITS)[number]

export const ItemSchema = z.object({
  id,
  /** Referência ao bloco do catálogo (vira libraryRef {kind,id,version} na Fase 3). */
  blockId: z.string(),
  blockVersion: z.number().int().positive(),
  name: z.string(),
  /** Centro do item no modelo. */
  position: Vec2Schema,
  rotationDeg: z.number(),
  mirrored: z.boolean(),
  sizeMm: z.object({ w: positiveMm, d: positiveMm, h: positiveMm.optional() }),
  notes: z.string().optional(),
  // --- Legenda e orçamento (v3)
  qty: z.number().positive(),
  unit: z.enum(ITEM_UNITS),
  /** Desenha o balão com o número na planta. */
  showMarker: z.boolean(),
  /** Deslocamento do balão em relação ao centro do item (o usuário arrasta). */
  markerOffset: Vec2Schema.optional(),
  /** Entra na legenda (e na numeração). */
  inLegend: z.boolean(),
  /** Item que já existe no local (não entra no orçamento). */
  existing: z.boolean(),
  approved: z.boolean(),
  /** Preço unitário em CENTAVOS inteiros. */
  unitPriceCents: z.number().int().nonnegative().optional(),
  brandModel: z.string().optional(),
  supplier: z.string().optional(),
})

export const BasePlanSchema = z.object({
  /** Chave do arquivo (IndexedDB agora; Asset no S3 na Fase 2). */
  assetId: z.string(),
  /** Canto superior esquerdo e tamanho no modelo (após calibração). */
  x: z.number(),
  y: z.number(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  visible: z.boolean(),
  calibrated: z.boolean(),
})

export const EnvironmentSchema = z.object({
  id,
  name: z.string().min(1),
  ceilingHeightMm: positiveMm,
  basePlan: BasePlanSchema.nullable(),
  drawings: z.array(DrawingSchema),
  openings: z.array(OpeningSchema),
  items: z.array(ItemSchema),
})

export const ProjectSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().min(1),
  environments: z.array(EnvironmentSchema).min(1),
})

export type Wall = z.infer<typeof WallSchema>
export type DimensionDrawing = z.infer<typeof DimensionSchema>
export type TextDrawing = z.infer<typeof TextSchema>
export type ChainDrawing = z.infer<typeof ChainSchema>
export type AreaDrawing = z.infer<typeof AreaSchema>
export type Opening = z.infer<typeof OpeningSchema>
export type Drawing = z.infer<typeof DrawingSchema>
export type Item = z.infer<typeof ItemSchema>
export type BasePlan = z.infer<typeof BasePlanSchema>
export type Environment = z.infer<typeof EnvironmentSchema>
export type Project = z.infer<typeof ProjectSchema>

/** Valores padrão dos campos de legenda/orçamento de um item novo. */
export const ITEM_DEFAULTS = {
  qty: 1,
  unit: 'un',
  showMarker: true,
  inLegend: true,
  existing: false,
  approved: false,
} as const satisfies Partial<Item>

export function newEnvironment(envId: string, name: string): Environment {
  return {
    id: envId,
    name,
    ceilingHeightMm: 2700,
    basePlan: null,
    drawings: [],
    openings: [],
    items: [],
  }
}

export function newProject(envId: string): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'Projeto sem nome',
    environments: [newEnvironment(envId, 'Ambiente 1')],
  }
}

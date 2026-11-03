import { z } from 'zod'

/**
 * Documento do projeto (formato v8 — versões antigas são migradas em `migrations.ts`). Fonte única da verdade: na Fase 2 este schema é
 * exportado como JSON Schema para o Django validar o JSONB.
 * Todas as medidas em MILÍMETROS INTEIROS.
 */

export const SCHEMA_VERSION = 8

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

/**
 * Cota LIGADA: lembra o que mede e se recalcula quando a parede ou o móvel mudam
 * (`linked-dims.ts`). Sem `ref`, a cota é livre.
 */
export const DimRefSchema = z.discriminatedUnion('kind', [
  /** Trecho da parede pela face externa, com os vãos (cota em cadeia). */
  z.object({ kind: z.literal('wall-outer'), wallId: z.string(), segment: z.number().int() }),
  /** Medida interna (área útil) do trecho, de face a face. */
  z.object({ kind: z.literal('wall-inner'), wallId: z.string(), segment: z.number().int() }),
  /** Distância de um lado do móvel até a parede mais próxima naquela direção. */
  z.object({ kind: z.literal('item'), itemId: z.string(), side: z.number().int().min(0).max(3) }),
])

export const DimensionSchema = z.object({
  id,
  kind: z.literal('dimension'),
  ref: DimRefSchema.optional(),
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
  ref: DimRefSchema.optional(),
  points: z.array(Vec2Schema).min(2),
  orientation: z.enum(['aligned', 'horizontal', 'vertical']),
  offsetMm: mm,
  total: z.boolean(),
})

/** Piso aplicado a uma área (cópia editável do catálogo de revestimentos). */
export const FloorSchema = z.object({
  finishId: z.string(),
  name: z.string(),
  material: z.enum([
    'porcelanato',
    'ceramica',
    'madeira',
    'vinilico',
    'laminado',
    'pedra',
    'cimento',
    'carpete',
  ]),
  /** Peça: comprimento (direção de assentamento) × largura, mm; 0 = monolítico. */
  pieceAMm: mm.nonnegative(),
  pieceBMm: mm.nonnegative(),
  jointMm: z.number().nonnegative(),
  pattern: z.enum(['grid', 'half', 'third']),
  /** Direção de assentamento (0 = ao longo de x). */
  angleDeg: z.number(),
  /** Peça inteira centralizada na área ou começando pelo canto. */
  origin: z.enum(['center', 'corner']),
  wastePct: z.number().min(0).max(100),
  color: z.string(),
  /** Preço por m² em CENTAVOS. */
  priceCentsPerM2: z.number().int().nonnegative().optional(),
  skirting: z
    .object({
      heightMm: positiveMm,
      /** Preço por metro linear em CENTAVOS. */
      priceCentsPerM: z.number().int().nonnegative().optional(),
    })
    .optional(),
})

/** Área (polígono) com nome; o m² é calculado, nunca guardado. */
export const AreaSchema = z.object({
  id,
  kind: z.literal('area'),
  points: z.array(Vec2Schema).min(3),
  name: z.string(),
  /** Deslocamento do rótulo em relação ao centroide (o usuário arrasta). */
  labelOffset: Vec2Schema.optional(),
  floor: FloorSchema.optional(),
})

export const TextSchema = z.object({
  id,
  kind: z.literal('text'),
  at: Vec2Schema,
  text: z.string(),
  /** Corpo em mm de papel. */
  sizeMm: z.number().positive(),
})

export const COLUMN_SHAPES = ['rect', 'circle'] as const

/** Pilar (estrutura): desenhado cheio (preto), por cima das paredes. */
export const ColumnSchema = z.object({
  id,
  kind: z.literal('column'),
  /** Centro. */
  at: Vec2Schema,
  shape: z.enum(COLUMN_SHAPES),
  /** Largura (no circular, o diâmetro). */
  widthMm: positiveMm,
  /** Profundidade (ignorada no circular). */
  depthMm: positiveMm,
  rotationDeg: z.number(),
})

export const DrawingSchema = z.discriminatedUnion('kind', [
  WallSchema,
  DimensionSchema,
  ChainSchema,
  TextSchema,
  AreaSchema,
  ColumnSchema,
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

/** Acabamento de uma parte do móvel: cópia (snapshot) do MDF escolhido. */
export const JoineryFinishSchema = z.object({
  materialId: z.string(),
  name: z.string(),
  kind: z.enum(['liso', 'madeirado']),
  hex: z.string(),
})

export const JOINERY_PARTS = ['frentes', 'corpo', 'tamponamento'] as const
export type JoineryPart = (typeof JOINERY_PARTS)[number]

export const FRONT_KINDS = ['open', 'door1', 'door2', 'drawers'] as const
export type FrontKind = (typeof FRONT_KINDS)[number]
export const HANDLE_KINDS = ['touch', 'bar', 'profile', 'cava', 'knob'] as const
export type HandleKind = (typeof HANDLE_KINDS)[number]

/** Módulo do móvel: largura EIXO A EIXO (das divisórias; nas pontas, da face externa). */
export const JoineryModuleSchema = z.object({
  widthMm: positiveMm,
  front: z.enum(FRONT_KINDS),
  shelves: z.number().int().min(0).max(12),
  drawers: z.number().int().min(1).max(8),
})

/**
 * Desenho do móvel (v8). Largura e profundidade são as do item na planta (L × P); aqui ficam
 * a altura, a base, os módulos e o puxador. A geometria sai de `core/joinery/solve.ts`.
 */
export const JoineryDesignSchema = z.object({
  heightMm: positiveMm,
  base: z.object({
    kind: z.enum(['floor', 'suspended', 'plinth']),
    heightMm: mm.nonnegative(),
  }),
  modules: z.array(JoineryModuleSchema).min(1),
  handle: z.enum(HANDLE_KINDS),
})

/** Detalhamento de marcenaria do item (v7: acabamento; v8: desenho com módulos). */
export const JoinerySchema = z.object({
  design: JoineryDesignSchema.optional(),
  finishes: z.object({
    frentes: JoineryFinishSchema.optional(),
    corpo: JoineryFinishSchema.optional(),
    tamponamento: JoineryFinishSchema.optional(),
  }),
  /** Sentido do veio nas frentes (madeirados). */
  grain: z.enum(['vertical', 'horizontal']),
  /** Observações para o marceneiro, uma por linha (saem na especificação). */
  notes: z.string().optional(),
})

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
  // --- Marcenaria (v7)
  joinery: JoinerySchema.optional(),
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
export type Column = z.infer<typeof ColumnSchema>
export type DimRef = z.infer<typeof DimRefSchema>
export type Joinery = z.infer<typeof JoinerySchema>
export type JoineryFinish = z.infer<typeof JoineryFinishSchema>
export type JoineryDesign = z.infer<typeof JoineryDesignSchema>
export type JoineryModule = z.infer<typeof JoineryModuleSchema>
export type Floor = z.infer<typeof FloorSchema>
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

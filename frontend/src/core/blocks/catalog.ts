import { CATALOG_EXTRA } from './catalog-extra'
import type { BlockSymbol } from './symbol'
import type { BlockDef } from './types'

/**
 * Catálogo EMBUTIDO de blocos (desenhos próprios, só dados). É o seed do banco global
 * (`CatalogItem`, exportado por `npm run export:schema`) e o catálogo do rascunho local sem
 * servidor. Convenção: encosto/parede em y = 0; `d` cresce para o ambiente.
 */

const WHITE = '#ffffff'
const WOOD = '#f3e3c3'
const SOFT = '#e9e4da'

const bed: BlockSymbol = {
  shapes: [
    { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
    { type: 'rect', x: 0, y: 0, w: 'w', h: 60, pen: 'thin', fill: SOFT },
    {
      type: 'repeat',
      count: 'max(1, round(w / 800))',
      shapes: [
        {
          type: 'rect',
          x: '40 + i * (w - 40) / n',
          y: 110,
          w: '(w - 40) / n - 40',
          h: 400,
          pen: 'fine',
          fill: WHITE,
        },
      ],
    },
    { type: 'line', x1: 0, y1: 'd * 0.36', x2: 'w', y2: 'd * 0.36', pen: 'fine' },
    {
      type: 'line',
      x1: 0,
      y1: 'd * 0.36 + 90',
      x2: 'w',
      y2: 'd * 0.36 + 90',
      pen: 'extraFine',
      lineType: 'hidden',
    },
  ],
}

const BASE: BlockDef[] = [
  // --- Dormitório -----------------------------------------------------------
  {
    id: 'cama-casal',
    version: 1,
    name: 'Cama de casal',
    category: 'Dormitório',
    discipline: 'layout',
    defaultSize: { w: 1580, d: 2000, h: 500 },
    minSize: { w: 1200, d: 1800 },
    symbol: bed,
  },
  {
    id: 'cama-solteiro',
    version: 1,
    name: 'Cama de solteiro',
    category: 'Dormitório',
    discipline: 'layout',
    defaultSize: { w: 880, d: 1880, h: 500 },
    minSize: { w: 700, d: 1700 },
    symbol: bed,
  },
  {
    id: 'criado-mudo',
    version: 1,
    name: 'Criado-mudo',
    category: 'Dormitório',
    discipline: 'layout',
    defaultSize: { w: 450, d: 400, h: 550 },
    minSize: { w: 250, d: 250 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'circle', cx: 'w / 2', cy: 'd / 2', r: 'min(w, d) * 0.3', pen: 'extraFine' },
        { type: 'circle', cx: 'w / 2', cy: 'd / 2', r: 'min(w, d) * 0.1', pen: 'extraFine' },
      ],
    },
  },
  {
    id: 'guarda-roupa',
    version: 1,
    name: 'Guarda-roupa',
    category: 'Dormitório',
    discipline: 'marcenaria',
    joinery: true,
    joineryType: 'roupeiro',
    defaultSize: { w: 1800, d: 600, h: 2400 },
    minSize: { w: 600, d: 450 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WOOD },
        { type: 'line', x1: 0, y1: 'd - 18', x2: 'w', y2: 'd - 18', pen: 'thin' },
        {
          type: 'repeat',
          count: 'max(2, round(w / 450)) - 1',
          shapes: [
            {
              type: 'line',
              x1: '(i + 1) * w / (n + 1)',
              y1: 'd - 18',
              x2: '(i + 1) * w / (n + 1)',
              y2: 'd',
              pen: 'thin',
            },
          ],
        },
        {
          type: 'line',
          x1: 40,
          y1: 'd / 2 - 9',
          x2: 'w - 40',
          y2: 'd / 2 - 9',
          pen: 'extraFine',
          lineType: 'dashdot',
        },
        {
          type: 'repeat',
          count: 'floor((w - 160) / 140)',
          shapes: [
            {
              type: 'line',
              x1: '80 + i * 140 + 40',
              y1: 'd / 2 - 9 - 190',
              x2: '80 + i * 140',
              y2: 'd / 2 - 9 + 190',
              pen: 'extraFine',
              color: '#8a8478',
            },
          ],
        },
      ],
    },
  },
  // --- Estar ----------------------------------------------------------------
  {
    id: 'rack',
    version: 1,
    name: 'Rack / painel de TV',
    category: 'Estar',
    discipline: 'marcenaria',
    joinery: true,
    joineryType: 'rack',
    defaultSize: { w: 1800, d: 450, h: 400 },
    minSize: { w: 400, d: 300 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WOOD },
        {
          type: 'repeat',
          count: 'max(1, round(w / 900)) - 1',
          shapes: [
            {
              type: 'line',
              x1: '(i + 1) * w / (n + 1)',
              y1: 0,
              x2: '(i + 1) * w / (n + 1)',
              y2: 'd - 18',
              pen: 'fine',
              lineType: 'hidden',
            },
          ],
        },
        { type: 'line', x1: 0, y1: 'd - 18', x2: 'w', y2: 'd - 18', pen: 'thin' },
      ],
    },
  },
  {
    id: 'sofa',
    version: 1,
    name: 'Sofá',
    category: 'Estar',
    discipline: 'layout',
    defaultSize: { w: 2100, d: 900, h: 800 },
    minSize: { w: 1200, d: 700 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'rect', x: 0, y: 0, w: 'w', h: 200, pen: 'thin', fill: SOFT },
        { type: 'rect', x: 0, y: 200, w: 180, h: 'd - 200', pen: 'thin', fill: SOFT },
        { type: 'rect', x: 'w - 180', y: 200, w: 180, h: 'd - 200', pen: 'thin', fill: SOFT },
        {
          type: 'repeat',
          count: 'max(1, round((w - 360) / 650))',
          shapes: [
            {
              type: 'rect',
              x: '180 + i * (w - 360) / n',
              y: 200,
              w: '(w - 360) / n',
              h: 'd - 240',
              pen: 'fine',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'poltrona',
    version: 1,
    name: 'Poltrona',
    category: 'Estar',
    discipline: 'layout',
    defaultSize: { w: 800, d: 800, h: 800 },
    minSize: { w: 550, d: 550 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'rect', x: 0, y: 0, w: 'w', h: 170, pen: 'thin', fill: SOFT },
        { type: 'rect', x: 0, y: 170, w: 140, h: 'd - 170', pen: 'thin', fill: SOFT },
        { type: 'rect', x: 'w - 140', y: 170, w: 140, h: 'd - 170', pen: 'thin', fill: SOFT },
        { type: 'rect', x: 140, y: 170, w: 'w - 280', h: 'd - 210', pen: 'fine' },
      ],
    },
  },
  {
    id: 'tapete',
    version: 1,
    name: 'Tapete',
    category: 'Estar',
    discipline: 'layout',
    underlay: true,
    defaultSize: { w: 2000, d: 3000 },
    minSize: { w: 400, d: 400 },
    symbol: {
      shapes: [
        {
          type: 'hatch',
          x: 0,
          y: 0,
          w: 'w',
          h: 'd',
          pattern: 'cross',
          angle: 0,
          spacing: 1.5,
          color: '#b9b2a3',
        },
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'extraFine', lineType: 'dashed' },
      ],
    },
  },
  {
    id: 'tapete-redondo',
    version: 1,
    name: 'Tapete redondo',
    category: 'Estar',
    discipline: 'layout',
    underlay: true,
    defaultSize: { w: 2000, d: 2000 },
    minSize: { w: 400, d: 400 },
    symbol: {
      shapes: [
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w / 2',
          ry: 'd / 2',
          pen: 'extraFine',
          lineType: 'dashed',
          fill: '#efe9df',
        },
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w / 2 - 80',
          ry: 'd / 2 - 80',
          pen: 'extraFine',
          lineType: 'hidden',
        },
      ],
    },
  },
  {
    id: 'vaso-planta',
    version: 1,
    name: 'Vaso com planta',
    category: 'Estar',
    discipline: 'layout',
    defaultSize: { w: 500, d: 500 },
    minSize: { w: 200, d: 200 },
    symbol: {
      shapes: [
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w / 2',
          ry: 'd / 2',
          pen: 'thin',
          fill: WHITE,
        },
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w * 0.18',
          ry: 'd * 0.18',
          pen: 'extraFine',
        },
        {
          type: 'repeat',
          count: 8,
          shapes: [
            {
              type: 'line',
              x1: 'w / 2 + w * 0.18 * cos(i * 45)',
              y1: 'd / 2 + d * 0.18 * sin(i * 45)',
              x2: 'w / 2 + w * 0.46 * cos(i * 45 + 15)',
              y2: 'd / 2 + d * 0.46 * sin(i * 45 + 15)',
              pen: 'extraFine',
              color: '#4f7a4a',
            },
          ],
        },
      ],
    },
  },
  // --- Jantar ---------------------------------------------------------------
  {
    id: 'mesa-retangular',
    version: 1,
    name: 'Mesa retangular',
    category: 'Jantar',
    discipline: 'layout',
    defaultSize: { w: 1600, d: 900, h: 750 },
    minSize: { w: 600, d: 600 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        {
          type: 'rect',
          x: 40,
          y: 40,
          w: 'w - 80',
          h: 'd - 80',
          pen: 'extraFine',
          lineType: 'hidden',
        },
      ],
    },
  },
  {
    id: 'mesa-redonda',
    version: 1,
    name: 'Mesa redonda',
    category: 'Jantar',
    discipline: 'layout',
    defaultSize: { w: 1200, d: 1200, h: 750 },
    minSize: { w: 600, d: 600 },
    symbol: {
      shapes: [
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w / 2',
          ry: 'd / 2',
          pen: 'medium',
          fill: WHITE,
        },
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w / 2 - 40',
          ry: 'd / 2 - 40',
          pen: 'extraFine',
          lineType: 'hidden',
        },
      ],
    },
  },
  {
    id: 'cadeira',
    version: 1,
    name: 'Cadeira',
    category: 'Jantar',
    discipline: 'layout',
    defaultSize: { w: 450, d: 500, h: 900 },
    minSize: { w: 350, d: 350 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 80, w: 'w', h: 'd - 80', pen: 'thin', fill: WHITE },
        { type: 'rect', x: 0, y: 0, w: 'w', h: 80, pen: 'medium', fill: SOFT },
      ],
    },
  },
  // --- Banho e cozinha -------------------------------------------------------
  {
    id: 'bancada-cuba',
    version: 1,
    name: 'Bancada com cuba',
    category: 'Banho e cozinha',
    discipline: 'hidraulica',
    defaultSize: { w: 1800, d: 600, h: 900 },
    minSize: { w: 600, d: 450 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        {
          type: 'rect',
          x: 'w / 2 - min(250, w / 2 - 60)',
          y: 90,
          w: 'min(500, w - 120)',
          h: 'd - 180',
          pen: 'thin',
        },
        {
          type: 'rect',
          x: 'w / 2 - min(250, w / 2 - 60) + 30',
          y: 120,
          w: 'min(500, w - 120) - 60',
          h: 'd - 240',
          pen: 'extraFine',
        },
        { type: 'circle', cx: 'w / 2', cy: 'd / 2', r: 25, pen: 'extraFine' },
        { type: 'line', x1: 'w / 2', y1: 20, x2: 'w / 2', y2: 120, pen: 'thin' },
        { type: 'circle', cx: 'w / 2', cy: 30, r: 22, pen: 'thin', fill: WHITE },
      ],
    },
  },
  {
    id: 'cuba-apoio',
    version: 1,
    name: 'Cuba de apoio',
    category: 'Banho e cozinha',
    discipline: 'hidraulica',
    defaultSize: { w: 500, d: 400 },
    minSize: { w: 300, d: 250 },
    symbol: {
      shapes: [
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2',
          rx: 'w / 2',
          ry: 'd / 2',
          pen: 'medium',
          fill: WHITE,
        },
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: 'd / 2 + 10',
          rx: 'w / 2 - 35',
          ry: 'd / 2 - 45',
          pen: 'extraFine',
        },
        { type: 'circle', cx: 'w / 2', cy: 'd / 2 + 10', r: 20, pen: 'extraFine' },
      ],
    },
  },
  {
    id: 'vaso-sanitario',
    version: 1,
    name: 'Vaso sanitário',
    category: 'Banho e cozinha',
    discipline: 'hidraulica',
    defaultSize: { w: 380, d: 650, h: 400 },
    minSize: { w: 330, d: 500 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 180, pen: 'thin', fill: WHITE },
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: '180 + (d - 180) / 2',
          rx: 'w / 2',
          ry: '(d - 180) / 2',
          pen: 'medium',
          fill: WHITE,
        },
        {
          type: 'ellipse',
          cx: 'w / 2',
          cy: '180 + (d - 180) / 2 + 15',
          rx: 'w / 2 - 55',
          ry: '(d - 180) / 2 - 65',
          pen: 'extraFine',
        },
      ],
    },
  },
]

/** Catálogo embutido completo (16 blocos iniciais + os do seed do banco). */
export const CATALOG: BlockDef[] = [...BASE, ...CATALOG_EXTRA]

export const CATALOG_BY_ID: ReadonlyMap<string, BlockDef> = new Map(CATALOG.map((b) => [b.id, b]))

// --- Registro em uso -----------------------------------------------------------------------
// O catálogo vem do BANCO quando há servidor (`setCatalog`) e os itens do projeto são
// desenhados pela CÓPIA guardada no documento (`registerSnapshots`, chave id@versão). Assim
// mudar o banco não muda projetos antigos sem aviso (ver `core/library/updates.ts`).

export const blockKey = (id: string, version: number) => `${id}@${version}`

let bank: Map<string, BlockDef> | null = null
const snapshots = new Map<string, BlockDef>()

/** Catálogo do banco (mais recente por id). `null` volta ao embutido. */
export function setCatalog(defs: readonly BlockDef[] | null) {
  bank = defs ? new Map(defs.map((b) => [b.id, b])) : null
}

/** Blocos oferecidos no painel do catálogo. */
export const catalogBlocks = (): readonly BlockDef[] => (bank ? [...bank.values()] : CATALOG)

/** Troca as cópias registradas pelas do projeto aberto. */
export function setSnapshots(defs: Iterable<BlockDef>) {
  snapshots.clear()
  for (const d of defs) snapshots.set(blockKey(d.id, d.version), d)
}

export function registerSnapshot(def: BlockDef) {
  snapshots.set(blockKey(def.id, def.version), def)
}

/** Versão mais nova disponível do bloco (banco, embutido). */
export function latestBlock(id: string): BlockDef | undefined {
  return bank?.get(id) ?? CATALOG_BY_ID.get(id)
}

/**
 * Definição do bloco. Com `version`: a cópia do projeto dessa versão (ou o banco/embutido, se
 * for a mesma versão). Sem versão (ou sem cópia): a mais nova conhecida.
 */
export function getBlock(id: string, version?: number): BlockDef {
  if (version !== undefined) {
    const snap = snapshots.get(blockKey(id, version))
    if (snap) return snap
  }
  const latest = latestBlock(id)
  if (latest) return latest
  let best: BlockDef | undefined
  for (const s of snapshots.values())
    if (s.id === id && (!best || s.version > best.version)) best = s
  if (best) return best
  throw new Error(`Bloco desconhecido: ${id}`)
}

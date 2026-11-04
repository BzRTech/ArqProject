import type { BlockSymbol } from './symbol'
import type { BlockDef } from './types'

/**
 * Blocos do seed do banco (Fase 3), além dos 16 iniciais de `catalog.ts`. Desenhos próprios,
 * só dados. Mesma convenção: encosto/parede em y = 0; `d` cresce para o ambiente.
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
  ],
}

/** Móvel de marcenaria visto de cima: corpo, linha da frente e divisões das portas. */
const cabinet = (doorMm: number): BlockSymbol => ({
  shapes: [
    { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WOOD },
    { type: 'line', x1: 0, y1: 'd - 18', x2: 'w', y2: 'd - 18', pen: 'thin' },
    {
      type: 'repeat',
      count: `max(2, round(w / ${doorMm})) - 1`,
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
  ],
})

export const CATALOG_EXTRA: BlockDef[] = [
  // --- Dormitório -----------------------------------------------------------
  {
    id: 'cama-king',
    version: 1,
    name: 'Cama king',
    category: 'Dormitório',
    discipline: 'layout',
    defaultSize: { w: 1930, d: 2030, h: 500 },
    minSize: { w: 1700, d: 1900 },
    symbol: bed,
  },
  {
    id: 'berco',
    version: 1,
    name: 'Berço',
    category: 'Dormitório',
    discipline: 'layout',
    defaultSize: { w: 700, d: 1300, h: 900 },
    minSize: { w: 600, d: 1100 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'rect', x: 40, y: 40, w: 'w - 80', h: 'd - 80', pen: 'fine' },
        {
          type: 'repeat',
          count: 'max(2, round((d - 80) / 120))',
          shapes: [
            {
              type: 'line',
              x1: 0,
              y1: '40 + (i + 1) * (d - 80) / (n + 1)',
              x2: 40,
              y2: '40 + (i + 1) * (d - 80) / (n + 1)',
              pen: 'extraFine',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'comoda',
    version: 1,
    name: 'Cômoda',
    category: 'Dormitório',
    discipline: 'layout',
    defaultSize: { w: 1200, d: 500, h: 900 },
    minSize: { w: 500, d: 350 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'line', x1: 0, y1: 'd - 25', x2: 'w', y2: 'd - 25', pen: 'thin' },
        { type: 'line', x1: 'w / 2', y1: 'd - 25', x2: 'w / 2', y2: 'd', pen: 'thin' },
      ],
    },
  },
  // --- Estar e jantar ---------------------------------------------------------
  {
    id: 'estante',
    version: 1,
    name: 'Estante',
    category: 'Estar',
    discipline: 'marcenaria',
    joinery: true,
    joineryType: 'estante',
    defaultSize: { w: 1200, d: 350, h: 2100 },
    minSize: { w: 400, d: 250 },
    symbol: cabinet(600),
  },
  {
    id: 'painel-tv',
    version: 1,
    name: 'Painel de TV',
    category: 'Estar',
    discipline: 'marcenaria',
    defaultSize: { w: 2000, d: 30, h: 1800 },
    minSize: { w: 600, d: 18 },
    symbol: {
      shapes: [{ type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WOOD }],
    },
  },
  {
    id: 'mesa-centro',
    version: 1,
    name: 'Mesa de centro',
    category: 'Estar',
    discipline: 'layout',
    defaultSize: { w: 1000, d: 600, h: 400 },
    minSize: { w: 500, d: 400 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'rect', x: 40, y: 40, w: 'w - 80', h: 'd - 80', pen: 'extraFine' },
      ],
    },
  },
  {
    id: 'mesa-lateral',
    version: 1,
    name: 'Mesa lateral',
    category: 'Estar',
    discipline: 'layout',
    defaultSize: { w: 500, d: 500, h: 550 },
    minSize: { w: 300, d: 300 },
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
          rx: 'w / 2 - 30',
          ry: 'd / 2 - 30',
          pen: 'extraFine',
        },
      ],
    },
  },
  {
    id: 'aparador',
    version: 1,
    name: 'Aparador',
    category: 'Jantar',
    discipline: 'marcenaria',
    joinery: true,
    joineryType: 'aparador',
    defaultSize: { w: 1600, d: 400, h: 800 },
    minSize: { w: 600, d: 300 },
    symbol: cabinet(500),
  },
  // --- Escritório ---------------------------------------------------------------
  {
    id: 'escrivaninha',
    version: 1,
    name: 'Escrivaninha',
    category: 'Escritório',
    discipline: 'layout',
    defaultSize: { w: 1200, d: 600, h: 750 },
    minSize: { w: 800, d: 450 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'rect', x: 'w - 420', y: 0, w: 420, h: 'd - 40', pen: 'fine' },
      ],
    },
  },
  {
    id: 'cadeira-escritorio',
    version: 1,
    name: 'Cadeira de escritório',
    category: 'Escritório',
    discipline: 'layout',
    defaultSize: { w: 600, d: 600, h: 1000 },
    minSize: { w: 450, d: 450 },
    symbol: {
      shapes: [
        {
          type: 'circle',
          cx: 'w / 2',
          cy: 'd / 2',
          r: 'min(w, d) / 2',
          pen: 'extraFine',
          lineType: 'hidden',
        },
        {
          type: 'rect',
          x: 'w * 0.15',
          y: 'd * 0.25',
          w: 'w * 0.7',
          h: 'd * 0.6',
          pen: 'medium',
          fill: WHITE,
        },
        {
          type: 'rect',
          x: 'w * 0.15',
          y: 'd * 0.1',
          w: 'w * 0.7',
          h: 'd * 0.15',
          pen: 'thin',
          fill: SOFT,
        },
      ],
    },
  },
  // --- Cozinha e serviço ---------------------------------------------------------
  {
    id: 'armario-cozinha',
    version: 1,
    name: 'Armário de cozinha',
    category: 'Banho e cozinha',
    discipline: 'marcenaria',
    joinery: true,
    joineryType: 'cozinha',
    defaultSize: { w: 2400, d: 600, h: 900 },
    minSize: { w: 400, d: 350 },
    symbol: cabinet(450),
  },
  {
    id: 'geladeira',
    version: 1,
    name: 'Geladeira',
    category: 'Banho e cozinha',
    discipline: 'layout',
    defaultSize: { w: 700, d: 700, h: 1850 },
    minSize: { w: 550, d: 600 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'line', x1: 0, y1: 'd - 40', x2: 'w', y2: 'd - 40', pen: 'thin' },
        { type: 'line', x1: 0, y1: 0, x2: 'w', y2: 'd - 40', pen: 'extraFine' },
        { type: 'line', x1: 'w', y1: 0, x2: 0, y2: 'd - 40', pen: 'extraFine' },
      ],
    },
  },
  {
    id: 'cooktop',
    version: 1,
    name: 'Cooktop 4 bocas',
    category: 'Banho e cozinha',
    discipline: 'layout',
    defaultSize: { w: 600, d: 520 },
    minSize: { w: 300, d: 450 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'circle', cx: 'w * 0.28', cy: 'd * 0.3', r: 'min(w, d) * 0.15', pen: 'thin' },
        { type: 'circle', cx: 'w * 0.72', cy: 'd * 0.3', r: 'min(w, d) * 0.12', pen: 'thin' },
        { type: 'circle', cx: 'w * 0.28', cy: 'd * 0.72', r: 'min(w, d) * 0.12', pen: 'thin' },
        { type: 'circle', cx: 'w * 0.72', cy: 'd * 0.72', r: 'min(w, d) * 0.15', pen: 'thin' },
      ],
    },
  },
  {
    id: 'maquina-lavar',
    version: 1,
    name: 'Máquina de lavar',
    category: 'Banho e cozinha',
    discipline: 'hidraulica',
    defaultSize: { w: 600, d: 650, h: 850 },
    minSize: { w: 550, d: 550 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'medium', fill: WHITE },
        { type: 'circle', cx: 'w / 2', cy: 'd / 2 + 20', r: 'min(w, d) * 0.33', pen: 'thin' },
        { type: 'line', x1: 0, y1: 90, x2: 'w', y2: 90, pen: 'fine' },
      ],
    },
  },
  {
    id: 'box-chuveiro',
    version: 1,
    name: 'Box com chuveiro',
    category: 'Banho e cozinha',
    discipline: 'hidraulica',
    defaultSize: { w: 900, d: 900 },
    minSize: { w: 700, d: 700 },
    symbol: {
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 'w', h: 'd', pen: 'fine' },
        { type: 'line', x1: 0, y1: 'd - 10', x2: 'w', y2: 'd - 10', pen: 'thin' },
        { type: 'line', x1: 0, y1: 0, x2: 'w', y2: 'd - 10', pen: 'extraFine', lineType: 'hidden' },
        { type: 'line', x1: 'w', y1: 0, x2: 0, y2: 'd - 10', pen: 'extraFine', lineType: 'hidden' },
        { type: 'circle', cx: 'w / 2', cy: '(d - 10) / 2', r: 40, pen: 'thin', fill: WHITE },
      ],
    },
  },
]

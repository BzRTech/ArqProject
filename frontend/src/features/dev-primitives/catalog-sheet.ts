/**
 * Prancha de catálogo da Fase 1: exercita todas as primitivas do núcleo numa A3.
 * Só monta entidades; toda a geometria é feita por core/ (compileView, cotas, hachuras).
 */
import { compileView, PAPER_VIEW, type View } from '@/core/drawing/compile'
import type { Entity } from '@/core/drawing/entities'
import type { Primitive } from '@/core/drawing/primitives'
import { LINE_TYPE_LABEL, PEN, type LineType } from '@/core/drawing/styles'
import { area } from '@/core/geometry/polygon'
import { vec, type Vec2 } from '@/core/geometry/vec'
import { graphicScale } from '@/core/sheets/graphic-scale'
import { nbrMargins, paperSize } from '@/core/sheets/paper'
import { formatAreaM2, formatDecimal } from '@/core/units'

export const PAPER = paperSize('A3', 'landscape')
const M = nbrMargins('A3')
const FRAME = {
  x: M.left,
  y: M.top,
  w: PAPER.widthMm - M.left - M.right,
  h: PAPER.heightMm - M.top - M.bottom,
}

/** Imagem 8×8 px gerada no projeto (xadrez nas cores do app). */
const CHECKER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGUlEQVR4nGOQt4p/sMQKk2TAKgokGQalDgDSSk7BUMwauQAAAABJRU5ErkJggg=='

// ---------------------------------------------------------------------------
// Planta do quarto — 1:50
// ---------------------------------------------------------------------------
export const PLAN_VIEW: View = { scale: 50, origin: vec(78, 58) }
const W = 4400 // externo
const H = 3800
const T = 150 // espessura da parede
const WIN = [1700, 3100] as const // janela na parede de cima
const DOOR = [1000, 1800] as const // porta na parede de baixo

const wallStyle = { weight: PEN.thick }
const thin = { weight: PEN.fine }

/** Paredes como dois polígonos (separados pela porta e pela janela). */
const wallLeft: Vec2[] = [
  vec(0, 0),
  vec(WIN[0], 0),
  vec(WIN[0], T),
  vec(T, T),
  vec(T, H - T),
  vec(DOOR[0], H - T),
  vec(DOOR[0], H),
  vec(0, H),
]
const wallRight: Vec2[] = [
  vec(WIN[1], 0),
  vec(W, 0),
  vec(W, H),
  vec(DOOR[1], H),
  vec(DOOR[1], H - T),
  vec(W - T, H - T),
  vec(W - T, T),
  vec(WIN[1], T),
]
const roomInner: Vec2[] = [vec(T, T), vec(W - T, T), vec(W - T, H - T), vec(T, H - T)]

function planEntities(): Entity[] {
  const walls: Entity = {
    kind: 'group',
    role: 'paredes',
    children: [wallLeft, wallRight].flatMap((poly): Entity[] => [
      { kind: 'hatch', boundary: poly, pattern: { kind: 'lines', angleDeg: 45, spacing: 0.8 } },
      { kind: 'polyline', points: poly, closed: true, style: wallStyle },
    ]),
  }

  const leaf = 800
  const hinge = vec(DOOR[0], H - T)
  const door: Entity = {
    kind: 'group',
    role: 'porta',
    children: [
      {
        kind: 'rect',
        x: hinge.x,
        y: hinge.y - leaf,
        width: 35,
        height: leaf,
        style: { weight: PEN.medium },
      },
      { kind: 'arc', center: hinge, radius: leaf, startDeg: 270, sweepDeg: 90, style: thin },
    ],
  }

  const window: Entity = {
    kind: 'group',
    role: 'janela',
    children: [
      { kind: 'line', a: vec(WIN[0], 0), b: vec(WIN[1], 0), style: thin },
      { kind: 'line', a: vec(WIN[0], T), b: vec(WIN[1], T), style: thin },
      { kind: 'line', a: vec(WIN[0], 60), b: vec(WIN[1], 60), style: { weight: PEN.extraFine } },
      { kind: 'line', a: vec(WIN[0], 90), b: vec(WIN[1], 90), style: { weight: PEN.extraFine } },
    ],
  }

  const bed = { x: 2250, y: 1100, w: 2000, h: 1600 }
  const furniture: Entity = {
    kind: 'group',
    role: 'mobiliario',
    children: [
      // Tapete: hachura cruzada clara + contorno tracejado
      {
        kind: 'hatch',
        boundary: [vec(1500, 800), vec(3800, 800), vec(3800, 3000), vec(1500, 3000)],
        pattern: { kind: 'cross', angleDeg: 0, spacing: 1.5 },
        style: { color: '#b9b2a3', weight: PEN.extraFine },
      },
      {
        kind: 'rect',
        x: 1500,
        y: 800,
        width: 2300,
        height: 2200,
        style: { weight: PEN.extraFine, lineType: 'dashed' },
      },
      // Cama + travesseiros
      {
        kind: 'rect',
        x: bed.x,
        y: bed.y,
        width: bed.w,
        height: bed.h,
        style: { weight: PEN.medium },
        fill: { color: '#ffffff' },
      },
      { kind: 'rect', x: 3800, y: 1200, width: 380, height: 650, style: thin },
      { kind: 'rect', x: 3800, y: 1950, width: 380, height: 650, style: thin },
      {
        kind: 'line',
        a: vec(2700, bed.y),
        b: vec(2700, bed.y + bed.h),
        style: { ...thin, lineType: 'hidden' },
      },
      // Criados-mudos com luminária (círculos)
      ...[600, 2750].flatMap((y): Entity[] => [
        {
          kind: 'rect',
          x: 3800,
          y,
          width: 450,
          height: 450,
          style: thin,
          fill: { color: '#ffffff' },
        },
        {
          kind: 'circle',
          center: vec(4025, y + 225),
          radius: 140,
          style: { weight: PEN.extraFine },
        },
        {
          kind: 'circle',
          center: vec(4025, y + 225),
          radius: 50,
          style: { weight: PEN.extraFine },
        },
      ]),
      // Rack M01 (o do vídeo): 3180 × 450 junto à parede
      {
        kind: 'rect',
        x: T,
        y: H - T - 3180,
        width: 450,
        height: 3180,
        style: { weight: PEN.medium },
        fill: { color: '#f3e3c3' },
      },
      {
        kind: 'line',
        a: vec(T, H - T - 3180),
        b: vec(T + 450, H - T),
        style: { weight: PEN.extraFine, lineType: 'dotted' },
      },
      {
        kind: 'text',
        at: vec(T + 225, 1890),
        text: 'M01',
        size: 2.2,
        anchor: 'middle',
        vAlign: 'middle',
        rotationDeg: -90,
        weight: 'bold',
      },
      // Eixo da janela (traço-ponto)
      {
        kind: 'line',
        a: vec(2400, -400),
        b: vec(2400, 700),
        style: { weight: PEN.extraFine, lineType: 'dashdot', color: '#b23b3b' },
      },
    ],
  }

  const roomArea = area(roomInner)
  const labels: Entity = {
    kind: 'group',
    role: 'textos',
    children: [
      {
        kind: 'text',
        at: vec(2100, 3270),
        text: 'QUARTO',
        size: 3,
        anchor: 'start',
        weight: 'bold',
      },
      {
        kind: 'text',
        at: vec(2100, 3470),
        text: formatAreaM2(roomArea),
        size: 2.2,
        anchor: 'start',
      },
    ],
  }

  const dims: Entity = {
    kind: 'group',
    role: 'cotas',
    children: [
      {
        kind: 'chain',
        points: [0, WIN[0], WIN[1], W].map((x) => vec(x, 0)),
        orientation: 'horizontal',
        offset: 8,
        total: true,
      },
      {
        kind: 'chain',
        points: [0, DOOR[0], DOOR[1], W].map((x) => vec(x, H)),
        orientation: 'horizontal',
        offset: -8,
      },
      {
        kind: 'chain',
        points: [0, T, H - T, H].map((y) => vec(0, y)),
        orientation: 'vertical',
        offset: -8,
        total: true,
      },
      { kind: 'dimension', p1: vec(W, 0), p2: vec(W, H), orientation: 'vertical', offset: 8 },
      // Cota interna em cadeia (sem linhas de chamada: offset 0)
      {
        kind: 'chain',
        points: [T, T + 450, 3800, W - T].map((x) => vec(x, 330)),
        orientation: 'horizontal',
        offset: 0,
      },
      // Cota alinhada (diagonal da cama)
      {
        kind: 'dimension',
        p1: vec(bed.x, bed.y + bed.h),
        p2: vec(bed.x + bed.w, bed.y),
        offset: 0,
      },
    ],
  }

  return [furniture, walls, door, window, labels, dims]
}

// ---------------------------------------------------------------------------
// Vista frontal do rack M01 — 1:20 (caso do vídeo: 3180 × 400, suspenso 100)
// ---------------------------------------------------------------------------
export const ELEV_VIEW: View = { scale: 20, origin: vec(244, 50) }
const RACK = { w: 3180, h: 400, lift: 100 }
const MODULES = [0, 909, 1818, 2727, 3180]

function elevationEntities(): Entity[] {
  const floorY = RACK.h + RACK.lift
  const gap = 3
  const doors: Entity[] = []
  for (let m = 0; m < 3; m++) {
    const x0 = MODULES[m]!
    const x1 = MODULES[m + 1]!
    const half = (x1 - x0) / 2
    for (let d = 0; d < 2; d++) {
      const dx = x0 + d * half + gap / 2
      const w = half - gap
      doors.push({ kind: 'rect', x: dx, y: gap, width: w, height: RACK.h - 2 * gap, style: thin })
      // Indicação de abertura: "V" apontando para o lado da dobradiça
      const hingeLeft = d === 0
      const tip = hingeLeft ? dx : dx + w
      const far = hingeLeft ? dx + w : dx
      doors.push({
        kind: 'polyline',
        points: [vec(far, gap), vec(tip, RACK.h / 2), vec(far, RACK.h - gap)],
        style: { weight: PEN.extraFine, lineType: 'hidden' },
      })
    }
  }
  return [
    {
      kind: 'group',
      role: 'rack',
      children: [
        {
          kind: 'rect',
          x: 0,
          y: 0,
          width: RACK.w,
          height: RACK.h,
          style: { weight: PEN.medium },
          fill: { color: '#f3e3c3' },
        },
        ...doors,
        // Módulo 4: nicho aberto com prateleira
        {
          kind: 'rect',
          x: MODULES[3]! + 18,
          y: 18,
          width: MODULES[4]! - MODULES[3]! - 36,
          height: RACK.h - 36,
          style: thin,
          fill: { color: '#ffffff' },
        },
        { kind: 'line', a: vec(MODULES[3]! + 18, 200), b: vec(MODULES[4]! - 18, 200), style: thin },
        ...[1, 2, 3, 4].map((i): Entity => ({
          kind: 'text',
          at: vec((MODULES[i - 1]! + MODULES[i]!) / 2, RACK.h + 40),
          text: `M${i}`,
          size: 1.8,
          anchor: 'middle',
          vAlign: 'top',
          color: '#59626d',
        })),
      ],
    },
    {
      kind: 'group',
      role: 'piso',
      children: [
        {
          kind: 'hatch',
          boundary: [
            vec(-150, floorY),
            vec(RACK.w + 150, floorY),
            vec(RACK.w + 150, floorY + 80),
            vec(-150, floorY + 80),
          ],
          pattern: { kind: 'lines', angleDeg: 45, spacing: 1 },
        },
        {
          kind: 'line',
          a: vec(-150, floorY),
          b: vec(RACK.w + 150, floorY),
          style: { weight: PEN.thick },
        },
      ],
    },
    {
      kind: 'group',
      role: 'cotas',
      children: [
        {
          kind: 'chain',
          points: MODULES.map((x) => vec(x, 0)),
          orientation: 'horizontal',
          offset: 8,
          total: true,
        },
        {
          kind: 'chain',
          points: [vec(0, 0), vec(0, RACK.h), vec(0, floorY)],
          orientation: 'vertical',
          offset: -8,
        },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Corte AA do rack — 1:10 (corpo 18, fundo 6 recuado 10, porta sobreposta 18, folga 3)
// ---------------------------------------------------------------------------
export const SECTION_VIEW: View = { scale: 10, origin: vec(262, 124) }
const D = 450 // profundidade
const BODY = 18
const BACK = 6
const BACK_INSET = 10

function sectionEntities(): Entity[] {
  const floorY = RACK.h + RACK.lift
  const mdf = (x: number, y: number, w: number, h: number): Entity[] => {
    const pts = [vec(x, y), vec(x + w, y), vec(x + w, y + h), vec(x, y + h)]
    return [
      { kind: 'hatch', boundary: pts, pattern: { kind: 'lines', angleDeg: 45, spacing: 0.7 } },
      { kind: 'polyline', points: pts, closed: true, style: { weight: PEN.medium } },
    ]
  }
  const backX = D - BACK_INSET - BACK
  return [
    {
      kind: 'group',
      role: 'corte-rack',
      children: [
        ...mdf(0, 0, D, BODY), // tampo
        ...mdf(0, RACK.h - BODY, D, BODY), // base
        ...mdf(0, 191, backX, BODY), // prateleira
        ...mdf(backX, BODY, BACK, RACK.h - 2 * BODY), // fundo recuado
        ...mdf(-BODY, 3, BODY, RACK.h - 6), // porta sobreposta (folga 3)
        // Parede (em corte) e piso
        {
          kind: 'hatch',
          boundary: [vec(D, -60), vec(D + 90, -60), vec(D + 90, floorY), vec(D, floorY)],
          pattern: { kind: 'cross', angleDeg: 45, spacing: 1.2 },
          style: { color: '#7d7668' },
        },
        { kind: 'line', a: vec(D, -60), b: vec(D, floorY), style: { weight: PEN.thick } },
        {
          kind: 'line',
          a: vec(-120, floorY),
          b: vec(D + 90, floorY),
          style: { weight: PEN.thick },
        },
        {
          kind: 'hatch',
          boundary: [
            vec(-120, floorY),
            vec(D + 90, floorY),
            vec(D + 90, floorY + 50),
            vec(-120, floorY + 50),
          ],
          pattern: { kind: 'lines', angleDeg: 45, spacing: 1 },
        },
      ],
    },
    {
      kind: 'group',
      role: 'cotas',
      children: [
        {
          kind: 'chain',
          points: [-BODY, 0, backX, backX + BACK, D].map((x) => vec(x, 0)),
          orientation: 'horizontal',
          offset: 8,
          total: true,
        },
        {
          kind: 'chain',
          points: [0, BODY, RACK.h - BODY, RACK.h, floorY].map((y) => vec(-BODY, y)),
          orientation: 'vertical',
          offset: -8,
        },
      ],
    },
  ]
}

function specEntities(x: number, y: number): Entity[] {
  const lines = [
    '1. Corpo em MDF 18 mm.',
    '2. Fundo em MDF 6 mm, recuado 1 cm.',
    '3. Portas sobrepostas 18 mm, folga 3 mm.',
    '4. Abertura por fecho toque (sem puxador).',
    '5. Suspenso 10 cm do piso.',
    '6. Conferir prumo e nível no local.',
  ]
  return [
    { kind: 'text', at: vec(x, y), text: 'ESPECIFICAÇÕES · M01', size: 2.5, weight: 'bold' },
    ...lines.map((t, i): Entity => ({
      kind: 'text',
      at: vec(x, y + 6 + i * 4.2),
      text: t,
      size: 2,
    })),
  ]
}

// ---------------------------------------------------------------------------
// Legenda (espaço de papel, 1:1)
// ---------------------------------------------------------------------------
function legendEntities(x0: number, y0: number): Entity[] {
  const label = (at: Vec2, text: string, bold = false): Entity => ({
    kind: 'text',
    at,
    text,
    size: 2,
    weight: bold ? 'bold' : 'normal',
    vAlign: 'middle',
  })
  const out: Entity[] = []
  out.push(label(vec(x0, y0), 'TIPOS DE LINHA', true))
  const types: LineType[] = ['continuous', 'dashed', 'hidden', 'dotted', 'dashdot']
  types.forEach((t, i) => {
    const y = y0 + 6 + i * 5
    out.push({
      kind: 'line',
      a: vec(x0, y),
      b: vec(x0 + 30, y),
      style: { weight: PEN.medium, lineType: t },
    })
    out.push(label(vec(x0 + 33, y), LINE_TYPE_LABEL[t]))
  })

  const px = x0 + 66
  out.push(label(vec(px, y0), 'PENAS (mm)', true))
  Object.values(PEN).forEach((w, i) => {
    const y = y0 + 6 + i * 4.2
    out.push({ kind: 'line', a: vec(px, y), b: vec(px + 25, y), style: { weight: w } })
    out.push(label(vec(px + 28, y), formatDecimal(w, 2)))
  })

  const tx = x0 + 112
  out.push(label(vec(tx, y0), 'TEXTOS (corpo em mm)', true))
  ;[1.8, 2.5, 3.5, 5].forEach((s, i) => {
    out.push({
      kind: 'text',
      at: vec(tx, y0 + 7 + i * 6.2),
      text: `Ág ${formatDecimal(s, 1)}`,
      size: s,
      vAlign: 'middle',
    })
  })
  out.push({
    kind: 'text',
    at: vec(tx + 46, y0 + 26),
    text: 'girado 90°',
    size: 2,
    rotationDeg: -90,
    anchor: 'middle',
    vAlign: 'middle',
  })

  const hy = y0 + 36
  out.push(label(vec(x0, hy), 'HACHURAS · ARCO · CÍRCULO · IMAGEM', true))
  const sq = (x: number): Vec2[] => [
    vec(x, hy + 5),
    vec(x + 14, hy + 5),
    vec(x + 14, hy + 19),
    vec(x, hy + 19),
  ]
  const hatches: Entity[] = [
    { kind: 'hatch', boundary: sq(x0), pattern: { kind: 'lines', angleDeg: 45, spacing: 1.5 } },
    { kind: 'hatch', boundary: sq(x0 + 18), pattern: { kind: 'cross', angleDeg: 0, spacing: 2 } },
    {
      kind: 'hatch',
      boundary: sq(x0 + 36),
      pattern: { kind: 'solid' },
      fill: { color: '#c9c3b6' },
    },
  ]
  out.push(...hatches)
  ;[0, 18, 36].forEach((dx) =>
    out.push({ kind: 'polyline', points: sq(x0 + dx), closed: true, style: thin }),
  )
  out.push({
    kind: 'circle',
    center: vec(x0 + 63, hy + 12),
    radius: 7,
    style: { weight: PEN.medium },
  })
  out.push({
    kind: 'arc',
    center: vec(x0 + 76, hy + 19),
    radius: 14,
    startDeg: 270,
    sweepDeg: 90,
    style: { weight: PEN.medium },
  })
  out.push({
    kind: 'line',
    a: vec(x0 + 76, hy + 19),
    b: vec(x0 + 76, hy + 5),
    style: { weight: PEN.medium },
  })
  out.push({ kind: 'image', x: x0 + 98, y: hy + 5, width: 14, height: 14, href: CHECKER_PNG })
  out.push({ kind: 'rect', x: x0 + 98, y: hy + 5, width: 14, height: 14, style: thin })
  return out
}

// ---------------------------------------------------------------------------
// Moldura e carimbo
// ---------------------------------------------------------------------------
function frameAndStamp(): Entity[] {
  const sw = 175
  const sh = 34
  const sx = FRAME.x + FRAME.w - sw
  const sy = FRAME.y + FRAME.h - sh
  const t = (at: Vec2, text: string, size: number, bold = false): Entity => ({
    kind: 'text',
    at,
    text,
    size,
    weight: bold ? 'bold' : 'normal',
  })
  return [
    {
      kind: 'rect',
      x: FRAME.x,
      y: FRAME.y,
      width: FRAME.w,
      height: FRAME.h,
      style: { weight: PEN.thick },
    },
    t(vec(FRAME.x + 7, FRAME.y + 11), 'NÚCLEO DE GEOMETRIA · CATÁLOGO DE PRIMITIVAS', 4.5, true),
    {
      kind: 'line',
      a: vec(FRAME.x + 7, FRAME.y + 14),
      b: vec(FRAME.x + FRAME.w - 7, FRAME.y + 14),
      style: { weight: PEN.medium },
    },
    { kind: 'rect', x: sx, y: sy, width: sw, height: sh, style: { weight: PEN.medium } },
    { kind: 'line', a: vec(sx, sy + 14), b: vec(sx + sw, sy + 14), style: thin },
    { kind: 'line', a: vec(sx + 120, sy + 14), b: vec(sx + 120, sy + sh), style: thin },
    t(vec(sx + 3, sy + 5.5), 'PRANCHETA · FASE 1', 2, true),
    t(vec(sx + 3, sy + 11.5), 'PRIMITIVAS, COTAS E HACHURAS', 4, true),
    t(vec(sx + 3, sy + 20), 'Medidas em centímetros.', 2),
    t(vec(sx + 3, sy + 25), 'As medidas devem ser conferidas no local.', 2),
    t(vec(sx + 3, sy + 30.5), 'Imprimir em A3 a 100% ("tamanho real").', 2),
    t(vec(sx + 123, sy + 19.5), 'ESCALAS', 2),
    t(vec(sx + 123, sy + 25.5), '1:50 · 1:20 · 1:10', 3.6, true),
    t(vec(sx + 123, sy + 31), 'FOLHA A3', 2),
  ]
}

// ---------------------------------------------------------------------------

/** Medidas conhecidas para conferência automática (testes) e manual (régua). */
export interface MeasureCheck {
  label: string
  /** Extremidades esperadas em mm de papel. */
  a: Vec2
  b: Vec2
}

const toPaper = (v: View, p: Vec2): Vec2 => ({
  x: v.origin.x + p.x / v.scale,
  y: v.origin.y + p.y / v.scale,
})

export const MEASURE_CHECKS: MeasureCheck[] = [
  {
    label: 'Face externa da parede de cima, trecho esquerdo (170 cm em 1:50 = 34 mm)',
    a: toPaper(PLAN_VIEW, vec(0, 0)),
    b: toPaper(PLAN_VIEW, vec(WIN[0], 0)),
  },
  {
    label: 'Topo do rack M01 (318 cm em 1:20 = 159 mm)',
    a: toPaper(ELEV_VIEW, vec(0, 0)),
    b: toPaper(ELEV_VIEW, vec(RACK.w, 0)),
  },
  {
    label: 'Tampo do rack no corte (45 cm em 1:10 = 45 mm)',
    a: toPaper(SECTION_VIEW, vec(0, 0)),
    b: toPaper(SECTION_VIEW, vec(D, 0)),
  },
]

export function buildCatalogSheet(): Primitive[] {
  const planBottom = PLAN_VIEW.origin.y + H / PLAN_VIEW.scale
  const elevBottom = ELEV_VIEW.origin.y + (RACK.h + RACK.lift) / ELEV_VIEW.scale
  const caption = (x: number, y: number, title: string): Entity => ({
    kind: 'text',
    at: vec(x, y),
    text: title,
    size: 2.5,
    weight: 'bold',
  })
  return [
    ...compileView(frameAndStamp(), PAPER_VIEW),
    { kind: 'group', role: 'vista-planta', children: compileView(planEntities(), PLAN_VIEW) },
    {
      kind: 'group',
      role: 'vista-elevacao',
      children: compileView(elevationEntities(), ELEV_VIEW),
    },
    { kind: 'group', role: 'vista-corte', children: compileView(sectionEntities(), SECTION_VIEW) },
    ...compileView(
      [
        caption(PLAN_VIEW.origin.x - 20, planBottom + 24, 'PLANTA · QUARTO · ESC. 1:50'),
        caption(ELEV_VIEW.origin.x - 12, elevBottom + 14, 'VISTA FRONTAL · RACK M01 · ESC. 1:20'),
        caption(
          SECTION_VIEW.origin.x - 24,
          SECTION_VIEW.origin.y + 68,
          'CORTE AA · RACK M01 · ESC. 1:10',
        ),
        ...specEntities(338, 128),
        ...legendEntities(FRAME.x + 7, 212),
      ],
      PAPER_VIEW,
    ),
    graphicScale({ at: vec(PLAN_VIEW.origin.x - 20, planBottom + 32), scale: 50, meters: 5 }),
    graphicScale({
      at: vec(ELEV_VIEW.origin.x - 12, elevBottom + 22),
      scale: 20,
      meters: 2,
      step: 0.5,
    }),
  ]
}

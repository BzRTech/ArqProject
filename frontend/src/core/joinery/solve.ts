import type { FrontKind, JoineryDesign, JoineryPart } from '../project/schema'
import { hingesFor, type RuleProfile } from './rules'

/**
 * Motor de marcenaria: do desenho (módulos, frentes, base) e das regras (`RuleProfile`) para
 * vãos, peças, portas e gavetas. Coordenadas da VISTA FRONTAL em mm: x da face externa
 * esquerda (0) à direita (L); z do fundo do corpo (0) ao topo (A). Sem React/DOM.
 */

export interface SolvedModule {
  index: number
  label: string
  /** Limites eixo a eixo (nas pontas, a face externa). */
  x0: number
  x1: number
  /** Vão livre entre as faces das laterais/divisórias. */
  clearX0: number
  clearX1: number
  clearWidth: number
  front: FrontKind
  /** Face de baixo de cada prateleira (z). */
  shelvesZ: number[]
}

export interface Rect {
  x: number
  z: number
  w: number
  h: number
}

export interface SolvedDoor extends Rect {
  module: number
  /** Lado da dobradiça (o outro abre). */
  hinge: 'left' | 'right'
}

export interface SolvedDrawer extends Rect {
  module: number
}

export interface Panel {
  name: string
  kind: 'side' | 'top' | 'base' | 'divider' | 'back' | 'shelf' | 'door' | 'drawer'
  part: JoineryPart
  /** Maior medida da peça (na direção da largura do móvel, quando horizontal). */
  lengthMm: number
  widthMm: number
  thicknessMm: number
  qty: number
  /** Emendas: posições ao longo do comprimento, a partir do início da peça. */
  splitsMm: number[]
}

export interface SolvedJoinery {
  W: number
  D: number
  H: number
  base: JoineryDesign['base']
  t: number
  clearHeight: number
  modules: SolvedModule[]
  doors: SolvedDoor[]
  drawers: SolvedDrawer[]
  panels: Panel[]
  hinges: number
  touchLatches: number
  handle: JoineryDesign['handle']
  /** Posições x (face externa esquerda = 0) das emendas das peças horizontais. */
  splicesX: number[]
}

/** Larguras dos módulos ajustadas para somar `total` (proporcional; a sobra vai no último). */
export function normalizeModules(widths: readonly number[], total: number): number[] {
  const sum = widths.reduce((a, b) => a + b, 0)
  if (sum === total) return [...widths]
  const out = widths.map((w) => Math.max(1, Math.floor((w * total) / sum)))
  out[out.length - 1]! += total - out.reduce((a, b) => a + b, 0)
  return out
}

/** Divide `total` em `n` inteiros quase iguais (os primeiros levam o mm que sobra). */
function splitEven(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => base + (i < total - base * n ? 1 : 0))
}

const doorCount = (f: FrontKind): number => (f === 'door2' ? 2 : f === 'door1' ? 1 : 0)

/** Cabe na chapa (em qualquer sentido)? */
const fits = (a: number, b: number, r: RuleProfile) =>
  (a <= r.sheet.lengthMm && b <= r.sheet.widthMm) || (a <= r.sheet.widthMm && b <= r.sheet.lengthMm)

/** Emendas de uma peça comprida: de preferência sobre as divisórias (`preferred`). */
function splits(length: number, width: number, preferred: number[], r: RuleProfile): number[] {
  if (fits(length, width, r)) return []
  const max = width <= r.sheet.widthMm ? r.sheet.lengthMm : r.sheet.widthMm
  const out: number[] = []
  let start = 0
  while (length - start > max) {
    const cand = preferred.filter((p) => p > start && p - start <= max)
    const at = cand.length ? Math.max(...cand) : start + max
    out.push(at)
    start = at
  }
  return out
}

export function solveJoinery(
  size: { w: number; d: number },
  design: JoineryDesign,
  rules: RuleProfile,
): SolvedJoinery {
  const W = size.w
  const D = size.d
  const H = design.heightMm
  const t = rules.bodyThicknessMm
  const g = rules.front.gapMm
  const widths = normalizeModules(
    design.modules.map((m) => m.widthMm),
    W,
  )
  const n = widths.length
  const clearHeight = H - 2 * t
  const backDepth = rules.back.recessMm + rules.back.thicknessMm
  const innerDepth = D - backDepth

  let x = 0
  const modules: SolvedModule[] = widths.map((w, i) => {
    const x0 = x
    const x1 = x + w
    x = x1
    const clearX0 = x0 + (i === 0 ? t : t / 2)
    const clearX1 = x1 - (i === n - 1 ? t : t / 2)
    const k = design.modules[i]!.shelves
    const gap = (clearHeight - k * t) / (k + 1)
    return {
      index: i,
      label: `M${i + 1}`,
      x0,
      x1,
      clearX0,
      clearX1,
      clearWidth: clearX1 - clearX0,
      front: design.modules[i]!.front,
      shelvesZ: Array.from({ length: k }, (_, j) => t + gap * (j + 1) + t * j),
    }
  })

  const doors: SolvedDoor[] = []
  const drawers: SolvedDrawer[] = []
  for (const m of modules) {
    const zone = m.x1 - m.x0
    const nd = doorCount(m.front)
    if (nd) {
      let dx = m.x0 + g / 2
      splitEven(zone - nd * g, nd).forEach((w, j) => {
        doors.push({
          module: m.index,
          x: dx,
          z: g / 2,
          w,
          h: H - g,
          hinge: nd === 2 && j === 1 ? 'right' : 'left',
        })
        dx += w + g
      })
    } else if (m.front === 'drawers') {
      const k = design.modules[m.index]!.drawers
      let dz = g / 2
      for (const h of splitEven(H - k * g, k)) {
        drawers.push({ module: m.index, x: m.x0 + g / 2, z: dz, w: zone - g, h })
        dz += h + g
      }
    }
  }

  // Divisórias (eixos), medidas a partir do início das peças horizontais (x = t)
  const axes = modules.slice(0, -1).map((m) => m.x1)
  const along = axes.map((a) => a - t)
  const horiz = W - 2 * t
  const panels: Panel[] = [
    {
      name: 'Lateral esquerda',
      kind: 'side',
      part: 'tamponamento',
      lengthMm: H,
      widthMm: D,
      thicknessMm: t,
      qty: 1,
      splitsMm: [],
    },
    {
      name: 'Lateral direita',
      kind: 'side',
      part: 'tamponamento',
      lengthMm: H,
      widthMm: D,
      thicknessMm: t,
      qty: 1,
      splitsMm: [],
    },
    {
      name: 'Tampo',
      kind: 'top',
      part: 'tamponamento',
      lengthMm: horiz,
      widthMm: D,
      thicknessMm: t,
      qty: 1,
      splitsMm: splits(horiz, D, along, rules),
    },
    {
      name: 'Base',
      kind: 'base',
      part: 'corpo',
      lengthMm: horiz,
      widthMm: D,
      thicknessMm: t,
      qty: 1,
      splitsMm: splits(horiz, D, along, rules),
    },
    {
      name: 'Fundo',
      kind: 'back',
      part: 'corpo',
      lengthMm: horiz,
      widthMm: clearHeight,
      thicknessMm: rules.back.thicknessMm,
      qty: 1,
      splitsMm: splits(horiz, clearHeight, along, rules),
    },
  ]
  if (axes.length)
    panels.push({
      name: 'Divisória',
      kind: 'divider',
      part: 'corpo',
      lengthMm: clearHeight,
      widthMm: innerDepth,
      thicknessMm: t,
      qty: axes.length,
      splitsMm: [],
    })
  for (const m of modules)
    if (m.shelvesZ.length)
      panels.push({
        name: `Prateleira ${m.label}`,
        kind: 'shelf',
        part: 'corpo',
        lengthMm: m.clearWidth,
        widthMm: innerDepth - rules.shelfFrontSetbackMm,
        thicknessMm: t,
        qty: m.shelvesZ.length,
        splitsMm: splits(m.clearWidth, innerDepth - rules.shelfFrontSetbackMm, [], rules),
      })
  for (const d of doors)
    panels.push({
      name: `Porta ${modules[d.module]!.label}`,
      kind: 'door',
      part: 'frentes',
      lengthMm: d.h,
      widthMm: d.w,
      thicknessMm: rules.front.thicknessMm,
      qty: 1,
      splitsMm: [],
    })
  for (const d of drawers)
    panels.push({
      name: `Frente de gaveta ${modules[d.module]!.label}`,
      kind: 'drawer',
      part: 'frentes',
      lengthMm: d.w,
      widthMm: d.h,
      thicknessMm: rules.front.thicknessMm,
      qty: 1,
      splitsMm: [],
    })

  const splicesX = [
    ...new Set(
      panels
        .filter((p) => p.kind === 'top' || p.kind === 'base' || p.kind === 'back')
        .flatMap((p) => p.splitsMm.map((s) => s + t)),
    ),
  ]
  return {
    W,
    D,
    H,
    base: design.base,
    t,
    clearHeight,
    modules,
    doors,
    drawers,
    panels,
    hinges: doors.reduce((a, d) => a + hingesFor(d.h, rules), 0),
    touchLatches: design.handle === 'touch' ? doors.length + drawers.length : 0,
    handle: design.handle,
    splicesX,
  }
}

/**
 * Igualar portas: redistribui a largura dos módulos COM PORTAS para que todas as portas fiquem
 * iguais (±1 mm). Módulos abertos e de gavetas ficam como estão.
 */
export function equalizeDoors(
  totalW: number,
  design: JoineryDesign,
  rules: RuleProfile,
): JoineryDesign {
  const widths = normalizeModules(
    design.modules.map((m) => m.widthMm),
    totalW,
  )
  const withDoors = design.modules.map((m) => doorCount(m.front))
  const N = withDoors.reduce((a, b) => a + b, 0)
  if (!N) return design
  const Z = widths.reduce((a, w, i) => a + (withDoors[i] ? w : 0), 0)
  const unit = Math.floor(Z / N) // largura da porta + folga
  const next = widths.map((w, i) => (withDoors[i] ? withDoors[i]! * unit : w))
  let rest = Z - N * unit
  for (let i = 0; i < next.length && rest > 0; i++)
    if (withDoors[i]) {
      next[i]! += 1
      rest--
    }
  void rules
  return { ...design, modules: design.modules.map((m, i) => ({ ...m, widthMm: next[i]! })) }
}

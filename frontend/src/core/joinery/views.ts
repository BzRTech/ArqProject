import type { Entity } from '../drawing/entities'
import { PEN, type StrokeStyle } from '../drawing/styles'
import { vec, type Vec2 } from '../geometry/vec'
import type { RuleProfile } from './rules'
import type { Rect, SolvedDoor, SolvedJoinery } from './solve'

/**
 * Vistas cotadas do móvel, em mm do MODELO (y para baixo), a partir do móvel resolvido:
 * - frontal externa: portas, gavetas, puxadores, indicação de abertura;
 * - frontal interna: corpo sem as frentes (laterais, divisórias, prateleiras, emendas);
 * - planta: corte do corpo visto de cima, com o giro das portas.
 * Nas vistas frontais o piso fica em y = 0 e o móvel sobe (y negativo).
 */

const thick: StrokeStyle = { weight: PEN.medium }
const thin: StrokeStyle = { weight: PEN.fine }
const hidden: StrokeStyle = { weight: PEN.extraFine, lineType: 'dashed' }

const rect = (x: number, y: number, w: number, h: number, style: StrokeStyle = thin): Entity => ({
  kind: 'rect',
  x,
  y,
  width: w,
  height: h,
  style,
})

/** Retângulo da vista frontal (x, z) → modelo (y para baixo, piso em 0). */
const frontRect = (r: Rect, baseH: number): { x: number; y: number; w: number; h: number } => ({
  x: r.x,
  y: -(baseH + r.z + r.h),
  w: r.w,
  h: r.h,
})

/** Piso hachurado sob a vista frontal. */
function floor(W: number): Entity[] {
  const x0 = -150
  const x1 = W + 150
  return [
    { kind: 'line', a: vec(x0, 0), b: vec(x1, 0), style: thick },
    {
      kind: 'hatch',
      boundary: [vec(x0, 0), vec(x1, 0), vec(x1, 60), vec(x0, 60)],
      pattern: { kind: 'lines', angleDeg: 45, spacing: 1.2 },
      style: { weight: PEN.extraFine },
    },
  ]
}

/** Altura do corpo acima do piso e cota da base/suspensão, à direita. */
function heightDims(s: SolvedJoinery): Entity[] {
  const b = s.base.heightMm
  const top = -(b + s.H)
  const out: Entity[] = [
    // Subindo, a esquerda é para dentro do móvel: afastamento negativo põe a cota à direita.
    { kind: 'dimension', p1: vec(s.W, -b), p2: vec(s.W, top), orientation: 'vertical', offset: -8 },
  ]
  if (b > 0)
    out.push({
      kind: 'dimension',
      p1: vec(s.W, 0),
      p2: vec(s.W, -b),
      orientation: 'vertical',
      offset: -8,
    })
  return out
}

/** Indicação de abertura (linhas tracejadas convergindo para o lado da dobradiça). */
function openingMark(d: SolvedDoor, baseH: number): Entity[] {
  const r = frontRect(d, baseH)
  const hingeX = d.hinge === 'left' ? r.x : r.x + r.w
  const freeX = d.hinge === 'left' ? r.x + r.w : r.x
  const mid = vec(hingeX, r.y + r.h / 2)
  return [
    { kind: 'line', a: vec(freeX, r.y), b: mid, style: hidden },
    { kind: 'line', a: vec(freeX, r.y + r.h), b: mid, style: hidden },
  ]
}

/** Puxador desenhado na frente (fecho toque não aparece). */
function handleMark(
  r: { x: number; y: number; w: number; h: number },
  side: 'left' | 'right' | 'top',
  kind: SolvedJoinery['handle'],
): Entity[] {
  if (kind === 'touch') return []
  const len = Math.min(300, r.h * 0.45, r.w * 0.6)
  const edge = 40
  if (kind === 'profile' || kind === 'cava') {
    // Perfil / cava: ao longo da borda de cima
    const y = r.y + (kind === 'cava' ? 25 : 8)
    return [{ kind: 'line', a: vec(r.x + 20, y), b: vec(r.x + r.w - 20, y), style: thick }]
  }
  if (side === 'top') {
    const cx = r.x + r.w / 2
    const y = r.y + Math.min(60, r.h / 3)
    return kind === 'knob'
      ? [{ kind: 'circle', center: vec(cx, y), radius: 15, style: thin }]
      : [{ kind: 'line', a: vec(cx - len / 2, y), b: vec(cx + len / 2, y), style: thick }]
  }
  const x = side === 'right' ? r.x + r.w - edge : r.x + edge
  const cy = r.y + r.h / 2
  return kind === 'knob'
    ? [{ kind: 'circle', center: vec(x, cy), radius: 15, style: thin }]
    : [{ kind: 'line', a: vec(x, cy - len / 2), b: vec(x, cy + len / 2), style: thick }]
}

/** Vista frontal externa: o móvel fechado. */
export function frontExternalView(s: SolvedJoinery): Entity[] {
  const b = s.base.heightMm
  const top = -(b + s.H)
  const out: Entity[] = [...floor(s.W), rect(0, top, s.W, s.H, thick)]
  if (s.base.kind === 'plinth' && b > 0) out.push(rect(50, -b, s.W - 100, b, thin))
  // Módulos sem frente: mostra o vão aberto
  for (const m of s.modules)
    if (m.front === 'open') out.push(rect(m.clearX0, top + s.t, m.clearWidth, s.clearHeight, thin))
  for (const d of s.doors) {
    const r = frontRect(d, b)
    out.push(rect(r.x, r.y, r.w, r.h), ...openingMark(d, b))
    out.push(...handleMark(r, d.hinge === 'left' ? 'right' : 'left', s.handle))
  }
  for (const d of s.drawers) {
    const r = frontRect(d, b)
    out.push(rect(r.x, r.y, r.w, r.h), ...handleMark(r, 'top', s.handle))
  }
  // Cotas: módulos eixo a eixo + total (em cima), altura e base (à direita)
  out.push({
    kind: 'chain',
    points: [0, ...s.modules.map((m) => m.x1)].map((x) => vec(x, top)),
    orientation: 'horizontal',
    offset: 8,
    total: s.modules.length > 1,
  })
  out.push(...heightDims(s))
  return out
}

/** Vista frontal interna: o corpo sem as frentes, com prateleiras, vãos e emendas. */
export function frontInternalView(s: SolvedJoinery): Entity[] {
  const b = s.base.heightMm
  const top = -(b + s.H)
  const t = s.t
  const panel = (x: number, y: number, w: number, h: number): Entity => ({
    kind: 'hatch',
    boundary: [vec(x, y), vec(x + w, y), vec(x + w, y + h), vec(x, y + h)],
    pattern: { kind: 'lines', angleDeg: 45, spacing: 0.6 },
    style: { weight: PEN.extraFine },
  })
  const out: Entity[] = [...floor(s.W), rect(0, top, s.W, s.H, thick)]
  // Laterais, tampo e base (cortados = hachura) + divisórias
  out.push(panel(0, top, t, s.H), panel(s.W - t, top, t, s.H))
  out.push(panel(t, top, s.W - 2 * t, t), panel(t, -b - t, s.W - 2 * t, t))
  for (const m of s.modules.slice(0, -1)) out.push(panel(m.x1 - t / 2, top + t, t, s.clearHeight))
  for (const m of s.modules)
    for (const z of m.shelvesZ) out.push(rect(m.clearX0, -(b + z + t), m.clearWidth, t, thin))
  // Emendas (tampo, base e fundo): traço e texto
  for (const x of s.splicesX) {
    out.push({
      kind: 'line',
      a: vec(x, top - 40),
      b: vec(x, -b + 40),
      style: { weight: PEN.fine, lineType: 'dashdot' },
    })
    out.push({ kind: 'text', at: vec(x + 25, top + t + 70), text: 'EMENDA', size: 1.8 })
  }
  // Cotas: faces (lateral | vão | divisória | vão …) e total em cima; alturas à esquerda
  const faces = [0, ...s.modules.flatMap((m) => [m.clearX0, m.clearX1]), s.W]
  out.push({
    kind: 'chain',
    points: faces.map((x) => vec(x, top)),
    orientation: 'horizontal',
    offset: 8,
    total: true,
  })
  out.push({
    kind: 'chain',
    points: [-b, -b - t, top + t, top].map((y) => vec(0, y)),
    orientation: 'vertical',
    offset: 8,
  })
  return out
}

/** Planta: o corpo cortado visto de cima (fundo atrás = y 0, frente = y D), com as portas. */
export function planView(s: SolvedJoinery, rules: RuleProfile): Entity[] {
  const t = s.t
  const D = s.D
  const ft = rules.front.thicknessMm
  const backY = rules.back.recessMm
  const out: Entity[] = [
    // Parede atrás do móvel
    { kind: 'line', a: vec(-150, 0), b: vec(s.W + 150, 0), style: thick },
    {
      kind: 'hatch',
      boundary: [vec(-150, -60), vec(s.W + 150, -60), vec(s.W + 150, 0), vec(-150, 0)],
      pattern: { kind: 'lines', angleDeg: 45, spacing: 1.2 },
      style: { weight: PEN.extraFine },
    },
    rect(0, 0, s.W, D, thick),
    rect(0, 0, t, D, thin),
    rect(s.W - t, 0, t, D, thin),
    rect(t, backY, s.W - 2 * t, rules.back.thicknessMm, thin),
  ]
  const innerY = backY + rules.back.thicknessMm
  for (const m of s.modules.slice(0, -1)) out.push(rect(m.x1 - t / 2, innerY, t, D - innerY, thin))
  for (const m of s.modules) {
    const cx = (m.x0 + m.x1) / 2
    out.push({
      kind: 'text',
      at: vec(cx, D * 0.45),
      text: m.label,
      size: 2.4,
      anchor: 'middle',
      vAlign: 'middle',
      weight: 'bold',
    })
  }
  // Portas: espessura à frente do corpo e giro (arco tracejado)
  for (const d of s.doors) {
    out.push(rect(d.x, D, d.w, ft, thin))
    const hinge: Vec2 = vec(d.hinge === 'left' ? d.x : d.x + d.w, D + ft)
    out.push(
      { kind: 'line', a: hinge, b: vec(hinge.x, hinge.y + d.w), style: hidden },
      {
        kind: 'arc',
        center: hinge,
        radius: d.w,
        startDeg: d.hinge === 'left' ? 0 : 180,
        sweepDeg: d.hinge === 'left' ? 90 : -90,
        style: hidden,
      },
    )
  }
  for (const d of s.drawers) out.push(rect(d.x, D, d.w, ft, thin))
  // Cotas: módulos eixo a eixo + total (embaixo, depois do giro das portas); profundidade
  const below = D + ft + Math.max(0, ...s.doors.map((d) => d.w))
  out.push({
    kind: 'chain',
    points: [0, ...s.modules.map((m) => m.x1)].map((x) => vec(x, below)),
    orientation: 'horizontal',
    offset: -8,
    total: s.modules.length > 1,
  })
  out.push({
    kind: 'dimension',
    p1: vec(s.W, 0),
    p2: vec(s.W, D),
    orientation: 'vertical',
    // Descendo, a esquerda aponta para fora (+x): a profundidade fica à direita do móvel.
    offset: 8,
  })
  return out
}

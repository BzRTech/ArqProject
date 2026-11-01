/**
 * Spike da Fase 0: folha A3 em 1:50 com uma parede de 4 m cotada.
 *
 * Gera um SVG cujas unidades de usuário são MILÍMETROS DE PAPEL
 * (width="420mm" + viewBox="0 0 420 297"). O modelo está em milímetros reais
 * e é convertido por `toPaper` (modelo / escala). Na Fase 1 isso vira o
 * núcleo `core/` (units, drawing, dimensions, sheets); aqui é descartável.
 */

export const A3_LANDSCAPE = { widthMm: 420, heightMm: 297 } as const

export interface SheetSpec {
  scale: number // 50 => 1:50
  wallLengthMm: number
  wallThicknessMm: number
  fontFamily: string
}

export const DEFAULT_SPEC: SheetSpec = {
  scale: 50,
  wallLengthMm: 4000,
  wallThicknessMm: 150,
  fontFamily: 'Roboto',
}

/** Posição (em mm de papel) da origem do modelo na folha. */
export const MODEL_ORIGIN = { x: 60, y: 140 } as const

const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString()

export function toPaper(modelMm: number, scale: number): number {
  return modelMm / scale
}

/** Formata milímetros como centímetros pt-BR, sem casas decimais quando inteiro. */
export function formatCm(mm: number): string {
  const cm = mm / 10
  return Number.isInteger(cm)
    ? cm.toString()
    : cm.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function line(x1: number, y1: number, x2: number, y2: number, w: number, extra = ''): string {
  return `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="#000" stroke-width="${fmt(w)}" ${extra}/>`
}

function rect(x: number, y: number, w: number, h: number, sw: number, fill = 'none', extra = '') {
  return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}" stroke="#000" stroke-width="${fmt(sw)}" ${extra}/>`
}

function text(
  x: number,
  y: number,
  size: number,
  content: string,
  font: string,
  anchor: 'start' | 'middle' | 'end' = 'start',
  weight: 'normal' | 'bold' = 'normal',
) {
  const safe = content.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<text x="${fmt(x)}" y="${fmt(y)}" font-family="${font}" font-size="${fmt(size)}" font-weight="${weight}" text-anchor="${anchor}" fill="#000">${safe}</text>`
}

/** Cota horizontal com marcas oblíquas (padrão de arquitetura). Coordenadas em mm de papel. */
function horizontalDimension(
  x1: number,
  x2: number,
  yRef: number,
  offset: number,
  label: string,
  font: string,
): string {
  const yDim = yRef - offset
  const gap = 1 // afastamento da linha de chamada até o objeto
  const overshoot = 1.5 // quanto a linha de chamada passa da linha de cota
  const tick = 1.25 // meia diagonal da marca oblíqua
  return [
    line(x1, yRef - gap, x1, yDim - overshoot, 0.13),
    line(x2, yRef - gap, x2, yDim - overshoot, 0.13),
    line(x1 - 2, yDim, x2 + 2, yDim, 0.13),
    line(x1 - tick, yDim + tick, x1 + tick, yDim - tick, 0.35),
    line(x2 - tick, yDim + tick, x2 + tick, yDim - tick, 0.35),
    text((x1 + x2) / 2, yDim - 1.2, 2.5, label, font, 'middle'),
  ].join('\n')
}

/** Escala gráfica: `meters` segmentos de 1 m alternando preenchimento. */
function graphicScale(x: number, y: number, scale: number, meters: number, font: string): string {
  const seg = toPaper(1000, scale)
  const h = 2
  const parts: string[] = []
  for (let i = 0; i < meters; i++) {
    parts.push(rect(x + i * seg, y, seg, h, 0.18, i % 2 === 0 ? '#000' : '#fff'))
    parts.push(text(x + i * seg, y + h + 3, 2.2, String(i), font, 'middle'))
  }
  parts.push(text(x + meters * seg, y + h + 3, 2.2, `${meters} m`, font, 'middle'))
  parts.push(
    text(x, y - 2, 2.5, `ESCALA GRÁFICA 1:${scale} — ${meters} m = ${fmt(meters * seg)} mm`, font),
  )
  return parts.join('\n')
}

export interface SheetGeometry {
  /** Comprimento da parede no papel, em mm. É o que deve ser conferido com régua. */
  wallPaperLengthMm: number
  svg: string
}

export function buildSheetSvg(spec: SheetSpec = DEFAULT_SPEC): SheetGeometry {
  const { widthMm: W, heightMm: H } = A3_LANDSCAPE
  const f = spec.fontFamily
  const ox = MODEL_ORIGIN.x
  const oy = MODEL_ORIGIN.y
  const len = toPaper(spec.wallLengthMm, spec.scale)
  const thk = toPaper(spec.wallThicknessMm, spec.scale)

  // Margens ABNT NBR 10068 para A3: 25 mm à esquerda, 7 mm nas demais.
  const frame = { x: 25, y: 7, w: W - 25 - 7, h: H - 7 - 7 }
  const stamp = { w: 175, h: 45 }
  const sx = frame.x + frame.w - stamp.w
  const sy = frame.y + frame.h - stamp.h

  const body = [
    // Moldura
    rect(frame.x, frame.y, frame.w, frame.h, 0.5),
    // Parede 4 m × 15 cm (contorno grosso + hachura cinza)
    rect(ox, oy, len, thk, 0.5, '#bfbfbf', 'id="wall"'),
    // Cota
    horizontalDimension(ox, ox + len, oy, 10, formatCm(spec.wallLengthMm), f),
    text(ox, oy + thk + 8, 3, 'Parede de 4,00 m — deve medir 80 mm no papel (A3, 100%)', f),
    // Escala gráfica = régua de conferência (5 m em 1:50 = 100 mm)
    graphicScale(ox, oy + 40, spec.scale, 5, f),
    // Carimbo
    rect(sx, sy, stamp.w, stamp.h, 0.35),
    line(sx, sy + 15, sx + stamp.w, sy + 15, 0.18),
    line(sx, sy + 30, sx + stamp.w, sy + 30, 0.18),
    line(sx + 110, sy + 15, sx + 110, sy + stamp.h, 0.18),
    text(sx + 3, sy + 6, 2.5, 'PRANCHETA — SPIKE FASE 0', f, 'start', 'bold'),
    text(sx + 3, sy + 12, 4, 'PDF VETORIAL — PAREDE COTADA', f, 'start', 'bold'),
    text(sx + 3, sy + 21, 2.2, 'Medidas em centímetros.', f),
    text(sx + 3, sy + 26, 2.2, 'As medidas devem ser conferidas no local.', f),
    text(sx + 113, sy + 21, 2.2, 'ESCALA', f),
    text(sx + 113, sy + 27, 4, `1:${spec.scale}`, f, 'start', 'bold'),
    text(sx + 3, sy + 36, 2.2, 'Folha A3 (420 × 297 mm) — imprimir em 100% ("tamanho real")', f),
    text(sx + 113, sy + 36, 2.2, 'FOLHA', f),
    text(sx + 113, sy + 42, 4, 'A3', f, 'start', 'bold'),
  ].join('\n')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>
${body}
</svg>`

  return { wallPaperLengthMm: len, svg }
}

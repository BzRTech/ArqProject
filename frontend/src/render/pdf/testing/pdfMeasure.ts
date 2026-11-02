/**
 * Leitor mínimo de PDF para TESTES de escala: extrai o fluxo de conteúdo da
 * 1ª página e devolve os segmentos de reta desenhados, já em mm de papel
 * (origem no canto superior esquerdo, como no SVG).
 *
 * Suporta apenas o que o jsPDF/svg2pdf emitem para linhas e retângulos:
 * q, Q, cm, m, l, re, h. Não é um parser de PDF geral.
 */

export type Matrix = [number, number, number, number, number, number]
export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

const PT_PER_MM = 72 / 25.4
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

/** m1 × m2 na convenção de vetor-linha do PDF. */
function multiply(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1
  const [a2, b2, c2, d2, e2, f2] = m2
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ]
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

function latin1(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return s
}

export interface PdfPageInfo {
  widthMm: number
  heightMm: number
  content: string
  raw: string
}

/**
 * Lê MediaBox e o fluxo de conteúdo da 1ª página. `inflate` descomprime
 * fluxos FlateDecode (no Node: `zlib.inflateSync`).
 */
export function readFirstPage(
  pdf: Uint8Array,
  inflate?: (data: Uint8Array) => Uint8Array,
): PdfPageInfo {
  const raw = latin1(pdf)
  const media = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(raw)
  const contentsRef = /\/Contents\s+(\d+)\s+0\s+R/.exec(raw)
  if (!media || !contentsRef) throw new Error('PDF sem MediaBox ou /Contents')
  const objStart = raw.search(new RegExp(`(^|\\s)${contentsRef[1]}\\s+0\\s+obj`))
  const dictEnd = raw.indexOf('stream', objStart)
  const dict = raw.slice(objStart, dictEnd)
  let dataStart = dictEnd + 'stream'.length
  if (raw[dataStart] === '\r') dataStart++
  if (raw[dataStart] === '\n') dataStart++
  const dataEnd = raw.indexOf('endstream', dataStart)
  let data = pdf.subarray(dataStart, dataEnd)
  if (/\/FlateDecode/.test(dict)) {
    if (!inflate) throw new Error('Fluxo comprimido: forneça `inflate`')
    data = inflate(data)
  }
  return {
    widthMm: (Number(media[3]) - Number(media[1])) / PT_PER_MM,
    heightMm: (Number(media[4]) - Number(media[2])) / PT_PER_MM,
    content: latin1(data),
    raw,
  }
}

/** Interpreta o fluxo de conteúdo e devolve segmentos em mm de papel (y para baixo). */
export function extractSegments(content: string, pageHeightMm: number): Segment[] {
  // Remove strings e blocos de texto, que podem conter qualquer coisa.
  const cleaned = content.replace(/BT[\s\S]*?ET/g, ' ').replace(/<[0-9A-Fa-f\s]*>/g, ' ')
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  const stack: Matrix[] = []
  let ctm: Matrix = IDENTITY
  let operands: number[] = []
  let current: [number, number] | null = null
  let start: [number, number] | null = null
  const segments: Segment[] = []

  const toMm = ([x, y]: [number, number]): [number, number] => [
    x / PT_PER_MM,
    pageHeightMm - y / PT_PER_MM,
  ]
  const push = (p1: [number, number], p2: [number, number]) => {
    const [x1, y1] = toMm(p1)
    const [x2, y2] = toMm(p2)
    segments.push({ x1, y1, x2, y2 })
  }

  for (const tok of tokens) {
    const n = Number(tok)
    if (tok !== '' && !Number.isNaN(n)) {
      operands.push(n)
      continue
    }
    const o = operands
    switch (tok) {
      case 'q':
        stack.push(ctm)
        break
      case 'Q':
        ctm = stack.pop() ?? IDENTITY
        break
      case 'cm':
        ctm = multiply(o.slice(-6) as Matrix, ctm)
        break
      case 'm':
        current = apply(ctm, o.at(-2)!, o.at(-1)!)
        start = current
        break
      case 'l': {
        const p = apply(ctm, o.at(-2)!, o.at(-1)!)
        if (current) push(current, p)
        current = p
        break
      }
      case 'h':
        if (current && start) push(current, start)
        current = start
        break
      case 're': {
        const [x, y, w, h] = o.slice(-4) as [number, number, number, number]
        const pts = [
          apply(ctm, x, y),
          apply(ctm, x + w, y),
          apply(ctm, x + w, y + h),
          apply(ctm, x, y + h),
        ]
        for (let i = 0; i < 4; i++) push(pts[i]!, pts[(i + 1) % 4]!)
        break
      }
    }
    operands = []
  }
  return segments
}

/** Procura um segmento com as extremidades dadas (em qualquer ordem), com tolerância em mm. */
export function findSegment(
  segments: Segment[],
  a: [number, number],
  b: [number, number],
  tolMm = 0.01,
): Segment | undefined {
  const near = (x: number, y: number, p: [number, number]) =>
    Math.abs(x - p[0]) <= tolMm && Math.abs(y - p[1]) <= tolMm
  return segments.find(
    (s) =>
      (near(s.x1, s.y1, a) && near(s.x2, s.y2, b)) || (near(s.x1, s.y1, b) && near(s.x2, s.y2, a)),
  )
}

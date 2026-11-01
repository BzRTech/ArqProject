export interface LineMm {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Gerador pseudoaleatório determinístico (mulberry32) para o spike ser reprodutível. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` linhas ortogonais curtas espalhadas numa área de `width × height` mm. */
export function randomLines(count: number, width: number, height: number, seed = 42): LineMm[] {
  const r = rng(seed)
  const lines: LineMm[] = []
  for (let i = 0; i < count; i++) {
    const x = Math.round(r() * width)
    const y = Math.round(r() * height)
    const len = Math.round(200 + r() * 1800)
    lines.push(
      r() < 0.5 ? { x1: x, y1: y, x2: x + len, y2: y } : { x1: x, y1: y, x2: x, y2: y + len },
    )
  }
  return lines
}

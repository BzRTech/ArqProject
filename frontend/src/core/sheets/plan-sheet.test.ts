import { describe, expect, it } from 'vitest'
import type { Entity } from '../drawing/entities'
import { walk, type Primitive } from '../drawing/primitives'
import { PEN } from '../drawing/styles'
import { vec } from '../geometry/vec'
import type { Orientation, PaperFormat } from './paper'
import { buildPlanSheet, type LegendLine } from './plan-sheet'

/** Parede de 4 m (linha grossa) + um retângulo 4 × 3 m: o "ambiente" de teste. */
const room = (): Entity[] => [
  { kind: 'line', a: vec(0, 0), b: vec(4000, 0), style: { weight: PEN.extraThick } },
  { kind: 'rect', x: 0, y: 0, width: 4000, height: 3000, style: { weight: PEN.thin } },
]
const legend: LegendLine[] = Array.from({ length: 6 }, (_, i) => ({
  label: String(i + 1),
  text: `Item de teste número ${i + 1} com um nome um pouco comprido`,
  qty: '1 un',
}))

/** Pontos de todas as primitivas (para conferir que nada sai da folha). */
function points(prims: readonly Primitive[]) {
  const out: { x: number; y: number }[] = []
  for (const p of walk(prims)) {
    if (p.kind === 'line') out.push(p.a, p.b)
    else if (p.kind === 'polyline') out.push(...p.points)
    else if (p.kind === 'text') out.push(p.at)
    else if (p.kind === 'image')
      out.push({ x: p.x, y: p.y }, { x: p.x + p.width, y: p.y + p.height })
  }
  return out
}

const FORMATS: [PaperFormat, Orientation, number, number][] = [
  ['A4', 'landscape', 297, 210],
  ['A4', 'portrait', 210, 297],
  ['A3', 'landscape', 420, 297],
  ['A3', 'portrait', 297, 420],
  ['A2', 'landscape', 594, 420],
  ['A1', 'landscape', 841, 594],
]

describe('prancha em A4–A1, paisagem e retrato', () => {
  it.each(FORMATS)(
    '%s %s: tamanho, parede de 4 m em escala e tudo dentro da folha',
    (format, orientation, w, h) => {
      const sheet = buildPlanSheet({
        build: room,
        title: 'Sala',
        subtitle: 'CASA',
        format,
        orientation,
        legend,
        dateText: '03/11/2026',
      })
      expect([sheet.widthMm, sheet.heightMm]).toEqual([w, h])
      // A parede de 4 m mede 4000 / escala mm no papel (a conferência da impressão).
      const vista = sheet.primitives.find((p) => p.kind === 'group' && p.role === 'vista')!
      const wall = [...walk([vista])].find(
        (p) => p.kind === 'line' && p.stroke.width === PEN.extraThick,
      )
      if (wall?.kind !== 'line') throw new Error('parede não encontrada')
      expect(Math.abs(wall.b.x - wall.a.x)).toBeCloseTo(4000 / sheet.scale, 6)
      for (const pt of points(sheet.primitives)) {
        expect(pt.x).toBeGreaterThanOrEqual(0)
        expect(pt.x).toBeLessThanOrEqual(w)
        expect(pt.y).toBeGreaterThanOrEqual(0)
        expect(pt.y).toBeLessThanOrEqual(h)
      }
      // Folha maior → escala maior (ou igual)
      expect(sheet.primitives.some((p) => p.kind === 'group' && p.role === 'legenda')).toBe(true)
    },
  )

  it('escala cresce com a folha: A4 retrato ≤ A3 ≤ A1', () => {
    const scale = (format: PaperFormat, orientation: Orientation = 'landscape') =>
      buildPlanSheet({ build: room, title: 'Sala', subtitle: 'CASA', format, orientation, legend })
        .scale
    expect(scale('A4', 'portrait')).toBeGreaterThanOrEqual(scale('A3'))
    expect(scale('A3')).toBeGreaterThanOrEqual(scale('A1'))
    expect(scale('A1')).toBe(10) // 4 × 3 m = 40 × 30 cm no papel
  })

  it('A4 retrato: legenda embaixo (largura toda), sem invadir o carimbo', () => {
    const sheet = buildPlanSheet({
      build: room,
      title: 'Sala',
      subtitle: 'CASA',
      format: 'A4',
      orientation: 'portrait',
      legend,
    })
    const leg = sheet.primitives.find((p) => p.kind === 'group' && p.role === 'legenda')!
    const ys = points([leg]).map((p) => p.y)
    const stampTop = 297 - 7 - 32
    expect(Math.max(...ys)).toBeLessThan(stampTop)
    const xs = points([leg]).map((p) => p.x)
    expect(Math.min(...xs)).toBeLessThan(40) // começa à esquerda, não numa coluna à direita
  })

  it('carimbo com a marca do escritório (logo, nome, contato) e as notas do modelo', () => {
    const sheet = buildPlanSheet({
      build: room,
      title: 'Sala',
      subtitle: 'CASA',
      brand: {
        name: 'Estúdio Silva',
        lines: ['(11) 99999-0000', 'contato@estudiosilva.com.br', 'CAU A12345-6'],
        logo: { href: 'data:image/png;base64,AAAA', aspect: 3 },
      },
      notes: ['Nota do modelo de folha.'],
    })
    const all = [...walk(sheet.primitives)]
    const texts = all.flatMap((p) => (p.kind === 'text' ? [p.text] : []))
    expect(texts).toEqual(
      expect.arrayContaining(['Estúdio Silva', 'CAU A12345-6', 'Nota do modelo de folha.']),
    )
    expect(texts).not.toContain('As medidas devem ser conferidas no local.')
    const logo = all.find((p) => p.kind === 'image')
    expect(logo).toMatchObject({ href: 'data:image/png;base64,AAAA' })
    if (logo?.kind === 'image') expect(logo.width / logo.height).toBeCloseTo(3)
  })
})
